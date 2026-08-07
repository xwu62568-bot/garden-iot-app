import {
  ArrowLeft,
  Bell,
  Bluetooth,
  Calendar,
  CaretDown,
  CaretRight,
  Check,
  ClockCounterClockwise,
  Clock,
  Door,
  DotsThree,
  Drop,
  FlowArrow,
  Gear,
  Globe,
  House,
  LampPendant,
  LightbulbFilament,
  Leaf,
  ListChecks,
  Lock,
  MagicWand,
  MapPin,
  Palette,
  Path,
  Plant,
  Play,
  Plus,
  Power,
  QrCode,
  ShareNetwork,
  ShieldCheck,
  SlidersHorizontal,
  Sparkle,
  Stop,
  Sun,
  SunHorizon,
  Timer,
  UserCircle,
  User,
  Users,
  Waves,
  WifiHigh,
} from "@phosphor-icons/react";
import {
  BottomSheet,
  Carousel,
  FlowStack,
  KeyboardInput,
  MobileScroll,
  useKeyboard,
  useKeyboardInsets,
  useMobileDevice,
  type FlowControls,
  type FlowScreen,
} from "./mobile";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { publicAsset } from "./publicAsset";

type RootTab = "devices" | "scenes" | "automation" | "me";
type AutomationTab = "schedule" | "linkage";
type VisualMode = "night" | "warm";

type YardRole = "owner" | "member" | "installer";

type YardProfile = {
  name: string;
  city: string;
  timezone: string;
};

type CreateYardInput = {
  name: string;
  city: string;
  timezone: string;
  areas: string[];
};

type InvitePreview = {
  code: string;
  yardName: string;
  inviter: string;
  city: string;
  timezone: string;
  role: YardRole;
  roleLabel: string;
  validUntil: string;
};

type InviteLookupResult =
  | { status: "ready"; invite: InvitePreview }
  | { status: "invalid" | "expired" | "joined"; message: string };

type RemoveAreaResult = "removed" | "in-use" | "last-area" | "missing";

type YardMembership = {
  role: YardRole;
  roleLabel: string;
  expiresAt: string | null;
  authorizedDeviceIds: string[];
};

type YardMember = {
  id: string;
  name: string;
  role: YardRole;
  roleLabel: string;
  status: "active" | "expired";
  expiresAt: string | null;
  authorizedDeviceIds: string[];
};

type YardPermissions = {
  controlDevices: boolean;
  runScenes: boolean;
  editScenes: boolean;
  editAutomations: boolean;
  addDevices: boolean;
  configureController: boolean;
  manageYard: boolean;
};

type RootTabState = {
  activeTab: RootTab;
  setActiveTab: (tab: RootTab) => void;
};

type ControllerChannel = {
  id: number;
  configured: boolean;
  name: string;
  type: string;
  area: string;
  mode: "开关" | "点动/脉冲";
  pulse: string;
  polarity: "常开 (NO)" | "常闭 (NC)";
  visible: boolean;
  sensitive: boolean;
  automation: boolean;
  timeout: string;
};

type SceneDefinition = {
  id: string;
  name: string;
  detail: string;
  icon: "sparkle" | "sun" | "power";
};

type ScheduleDefinition = {
  id: string;
  name: string;
  timeType: "指定时间" | "日落" | "日出";
  timeValue: string;
  repeat: string;
  deviceId: string;
  deviceName: string;
  action: string;
  enabled: boolean;
};

type LinkageTrigger = {
  deviceId: string;
  deviceName: string;
  event: string;
};

type LinkageAction = {
  deviceId: string;
  deviceName: string;
  action: string;
};

type LinkageDefinition = {
  id: string;
  name: string;
  triggers: LinkageTrigger[];
  condition: string | null;
  actions: LinkageAction[];
  enabled: boolean;
};

type LightStripState = {
  id: string;
  name: string;
  model: string;
  area: string;
  visible: boolean;
  on: boolean;
  brightness: number;
  effect: string;
  color: string;
  online: boolean;
  capabilities: Array<"power" | "brightness" | "color" | "temperature" | "effects">;
};

type LightGroupDefinition = {
  id: string;
  name: string;
  area: string;
  memberIds: string[];
  visible: boolean;
};

type LightGroupInput = Omit<LightGroupDefinition, "id">;

type LightGroupStatus = {
  members: LightStripState[];
  onlineCount: number;
  onCount: number;
  state: "all-on" | "partial" | "all-off";
  brightness: number;
  effect: string;
  commonCapabilities: LightStripState["capabilities"];
};

type YardWorkspace = {
  id: string;
  profile: YardProfile;
  membership: YardMembership;
  members: YardMember[];
  areas: string[];
  light: LightStripState;
  auxiliaryLights: LightStripState[];
  lightGroups: LightGroupDefinition[];
  fountainOn: boolean;
  gateOpen: boolean;
  irrigationOn: boolean;
  irrigationMode: string;
  controllerChannels: ControllerChannel[];
  scenes: SceneDefinition[];
  schedules: ScheduleDefinition[];
  linkages: LinkageDefinition[];
  selectedArea: string;
};

type YardState = {
  yards: YardWorkspace[];
  activeYardId: string;
  activeYard: YardWorkspace;
  permissions: YardPermissions;
  switchYard: (yardId: string) => "switched" | "expired" | "missing";
  setSelectedArea: (area: string) => void;
  createYard: (input: CreateYardInput) => string;
  lookupInvite: (code: string) => InviteLookupResult;
  acceptInvite: (invite: InvitePreview) => string;
  updateYardProfile: (yardId: string, profile: YardProfile) => void;
  addYardArea: (yardId: string, name: string) => boolean;
  renameYardArea: (yardId: string, oldName: string, newName: string) => boolean;
  removeYardArea: (yardId: string, name: string) => RemoveAreaResult;
  updateInstallerAuthorization: (yardId: string, memberId: string, deviceIds: string[], expiresAt: string) => void;
  createLightGroup: (input: LightGroupInput) => string;
  updateLightGroup: (groupId: string, input: LightGroupInput) => void;
  deleteLightGroup: (groupId: string) => void;
  setLightDeviceOn: (deviceId: string, value: boolean) => void;
  updateLightDeviceArea: (deviceId: string, area: string) => boolean;
  setLightGroupOn: (groupId: string, value: boolean) => void;
  setLightGroupBrightness: (groupId: string, value: number) => void;
  setLightGroupEffect: (groupId: string, value: string) => void;
  setLightGroupColor: (groupId: string, value: string) => void;
  lightOn: boolean;
  setLightOn: (value: boolean) => void;
  brightness: number;
  setBrightness: (value: number) => void;
  lightEffect: string;
  setLightEffect: (value: string) => void;
  fountainOn: boolean;
  setFountainOn: (value: boolean) => void;
  gateOpen: boolean;
  setGateOpen: (value: boolean) => void;
  irrigationOn: boolean;
  setIrrigationOn: (value: boolean) => void;
  irrigationMode: string;
  setIrrigationMode: (value: string) => void;
  controllerChannels: ControllerChannel[];
  setControllerChannels: (channels: ControllerChannel[] | ((current: ControllerChannel[]) => ControllerChannel[])) => void;
  scenes: SceneDefinition[];
  setScenes: (scenes: SceneDefinition[] | ((current: SceneDefinition[]) => SceneDefinition[])) => void;
  schedules: ScheduleDefinition[];
  setSchedules: (schedules: ScheduleDefinition[] | ((current: ScheduleDefinition[]) => ScheduleDefinition[])) => void;
  linkages: LinkageDefinition[];
  setLinkages: (linkages: LinkageDefinition[] | ((current: LinkageDefinition[]) => LinkageDefinition[])) => void;
  notify: (message: string) => void;
  runDinnerScene: () => void;
};

const YardContext = createContext<YardState | null>(null);
const RootTabContext = createContext<RootTabState | null>(null);
const VisualModeContext = createContext<VisualMode>("night");

const initialControllerChannels: ControllerChannel[] = Array.from({ length: 12 }, (_, index) => {
  const id = index + 1;
  const configured: Record<number, Partial<ControllerChannel>> = {
    1: { name: "庭院门", type: "庭院门", area: "前院", mode: "点动/脉冲", pulse: "1 秒", sensitive: true },
    2: { name: "后院喷泉", type: "喷泉", area: "后院", mode: "开关", timeout: "60 分钟" },
    3: { name: "前院灌溉", type: "灌溉", area: "前院", mode: "开关", timeout: "60 分钟" },
    4: { name: "车库门", type: "车库门", area: "车库", mode: "点动/脉冲", pulse: "1 秒", sensitive: true },
  };

  return {
    id,
    configured: Boolean(configured[id]),
    name: configured[id]?.name ?? "未配置",
    type: configured[id]?.type ?? "未配置",
    area: configured[id]?.area ?? "未分配",
    mode: configured[id]?.mode ?? "开关",
    pulse: configured[id]?.pulse ?? "1 秒",
    polarity: "常开 (NO)",
    visible: id <= 4,
    sensitive: configured[id]?.sensitive ?? false,
    automation: true,
    timeout: configured[id]?.timeout ?? "不限制",
  };
});

const initialScenes: SceneDefinition[] = [
  { id: "dinner", name: "花园晚宴", detail: "灯带、喷泉、路径灯 · 4 个动作", icon: "sparkle" },
  { id: "quiet-night", name: "静谧夜晚", detail: "暖白灯光、关闭喷泉 · 3 个动作", icon: "sun" },
  { id: "all-off", name: "全部关闭", detail: "庭院灯光与水景 · 6 个动作", icon: "power" },
];

const initialSchedules: ScheduleDefinition[] = [
  { id: "path-sunset", name: "日落路径灯", timeType: "日落", timeValue: "日落后 15 分钟", repeat: "每天", deviceId: "light", deviceName: "路径灯", action: "开启 · 暖白 60%", enabled: true },
  { id: "evening-fountain", name: "晚间喷泉", timeType: "指定时间", timeValue: "19:30", repeat: "每天", deviceId: "fountain", deviceName: "后院喷泉", action: "运行 60 分钟", enabled: true },
];

const initialLinkages: LinkageDefinition[] = [
  { id: "gate-light", name: "开门照明", triggers: [{ deviceId: "gate", deviceName: "庭院门", event: "打开" }], condition: "日落至 23:00", actions: [{ deviceId: "light", deviceName: "路径灯", action: "暖白 60% · 5 分钟后关闭" }], enabled: true },
  { id: "pump-protection", name: "水泵超时保护", triggers: [{ deviceId: "pump", deviceName: "水泵", event: "持续运行 60 分钟" }], condition: null, actions: [{ deviceId: "pump", deviceName: "水泵", action: "关闭并通知所有者" }], enabled: false },
];

const cloneControllerChannels = () => initialControllerChannels.map((channel) => ({ ...channel }));
const cloneScenes = (scenes: SceneDefinition[]) => scenes.map((scene) => ({ ...scene }));
const cloneSchedules = (schedules: ScheduleDefinition[]) => schedules.map((schedule) => ({ ...schedule }));
const cloneLinkages = (linkages: LinkageDefinition[]) => linkages.map((linkage) => ({
  ...linkage,
  triggers: linkage.triggers.map((trigger) => ({ ...trigger })),
  actions: linkage.actions.map((action) => ({ ...action })),
}));

const makeLightDevice = (
  id: string,
  name: string,
  model: string,
  area: string,
  options: Partial<LightStripState> = {},
): LightStripState => ({
  id,
  name,
  model,
  area,
  visible: options.visible ?? true,
  on: options.on ?? false,
  brightness: options.brightness ?? 60,
  effect: options.effect ?? "暖白",
  color: options.color ?? "暖白 2700K",
  online: options.online ?? true,
  capabilities: options.capabilities ?? ["power", "brightness", "color", "temperature", "effects"],
});

const allLightingDevices = (yard: YardWorkspace) => [yard.light, ...yard.auxiliaryLights];

type LogicalDeviceRef = {
  id: string;
  sourceId: string;
  kind: "light" | "channel" | "group";
  name: string;
  area: string;
  detail: string;
};

const yardLogicalDevices = (yard: YardWorkspace): LogicalDeviceRef[] => [
  ...allLightingDevices(yard).filter((light) => light.visible || light.model !== "未配对").map((light) => ({ id: `light:${light.id}`, sourceId: light.id, kind: "light" as const, name: light.name, area: light.area, detail: light.model })),
  ...yard.controllerChannels.filter((channel) => channel.configured).map((channel) => ({ id: `channel:${channel.id}`, sourceId: String(channel.id), kind: "channel" as const, name: channel.name, area: channel.area, detail: `CH${channel.id} · ${channel.type}` })),
  ...yard.lightGroups.map((group) => ({ id: `group:${group.id}`, sourceId: group.id, kind: "group" as const, name: group.name, area: group.area, detail: `${group.memberIds.length} 个灯光` })),
];

const lightGroupStatus = (yard: YardWorkspace, group: LightGroupDefinition): LightGroupStatus => {
  const members = allLightingDevices(yard).filter((light) => group.memberIds.includes(light.id));
  const onlineMembers = members.filter((light) => light.online);
  const onCount = members.filter((light) => light.on).length;
  const brightness = onlineMembers.length ? Math.round(onlineMembers.reduce((total, light) => total + light.brightness, 0) / onlineMembers.length) : 0;
  const commonCapabilities = members.length
    ? members[0].capabilities.filter((capability) => members.every((light) => light.capabilities.includes(capability)))
    : [];
  return {
    members,
    onlineCount: onlineMembers.length,
    onCount,
    state: onCount === 0 ? "all-off" : onCount === members.length ? "all-on" : "partial",
    brightness,
    effect: members.length && members.every((light) => light.effect === members[0].effect) ? members[0].effect : "多种效果",
    commonCapabilities,
  };
};

const updateLightingMembers = (yard: YardWorkspace, memberIds: string[], patch: Partial<LightStripState>): YardWorkspace => ({
  ...yard,
  light: memberIds.includes(yard.light.id) && yard.light.online ? { ...yard.light, ...patch } : yard.light,
  auxiliaryLights: yard.auxiliaryLights.map((light) => memberIds.includes(light.id) && light.online ? { ...light, ...patch } : light),
});

const ownerMembers = (): YardMember[] => [
  { id: "owner-lin", name: "林先生", role: "owner", roleLabel: "所有者", status: "active", expiresAt: null, authorizedDeviceIds: [] },
  { id: "member-wang", name: "王女士", role: "member", roleLabel: "普通成员", status: "active", expiresAt: null, authorizedDeviceIds: ["light", "channel-1", "channel-2", "channel-3"] },
  { id: "installer-service", name: "安装服务", role: "installer", roleLabel: "临时安装商", status: "active", expiresAt: "2026-08-31T23:59:59+08:00", authorizedDeviceIds: ["controller", "channel-1", "channel-2", "channel-3", "channel-4"] },
];

const makeOwnerYard = (): YardWorkspace => ({
  id: "my-yard",
  profile: { name: "我的庭院", city: "上海", timezone: "Asia/Shanghai" },
  membership: { role: "owner", roleLabel: "所有者", expiresAt: null, authorizedDeviceIds: [] },
  members: ownerMembers(),
  areas: ["后院", "露台", "泳池", "前院", "车库"],
  light: makeLightDevice("light", "露台灯带", "LS200", "露台", { on: true, brightness: 68, effect: "日落流光", color: "珊瑚橙" }),
  auxiliaryLights: [
    makeLightDevice("path-lights", "庭院路径灯", "PL100 · 6 盏", "前院", { visible: false, on: true, brightness: 60, effect: "暖白", color: "暖白 2700K", capabilities: ["power", "brightness", "temperature"] }),
    makeLightDevice("wall-strip", "后院围墙灯带", "LS200", "后院", { visible: false, on: true, brightness: 68, effect: "日落流光", color: "珊瑚橙" }),
  ],
  lightGroups: [{ id: "group-ambience", name: "庭院氛围灯", area: "跨区域", memberIds: ["light", "wall-strip"], visible: true }],
  fountainOn: true,
  gateOpen: false,
  irrigationOn: false,
  irrigationMode: "持续运行",
  controllerChannels: cloneControllerChannels(),
  scenes: cloneScenes(initialScenes),
  schedules: cloneSchedules(initialSchedules),
  linkages: cloneLinkages(initialLinkages),
  selectedArea: "全部",
});

const makeParentChannels = (): ControllerChannel[] => cloneControllerChannels().map((channel) => {
  if (channel.id === 1) return { ...channel, configured: true, name: "父母家庭院门", type: "庭院门", area: "花园", visible: true };
  if (channel.id === 3) return { ...channel, configured: true, name: "花园灌溉", type: "灌溉", area: "花园", visible: true };
  return { ...channel, configured: false, name: "未配置", type: "未配置", area: "未分配", visible: false };
});

const makeParentYard = (): YardWorkspace => ({
  id: "parents-yard",
  profile: { name: "父母家", city: "苏州", timezone: "Asia/Shanghai" },
  membership: { role: "member", roleLabel: "普通成员", expiresAt: null, authorizedDeviceIds: ["light", "channel-1", "channel-3"] },
  members: [
    { id: "parent-owner", name: "陈女士", role: "owner", roleLabel: "所有者", status: "active", expiresAt: null, authorizedDeviceIds: [] },
    { id: "current-member", name: "当前账户", role: "member", roleLabel: "普通成员", status: "active", expiresAt: null, authorizedDeviceIds: ["light", "channel-1", "channel-3"] },
  ],
  areas: ["门廊", "花园"],
  light: makeLightDevice("light", "父母家廊灯", "WL100", "门廊", { on: false, brightness: 52, effect: "暖白", color: "暖白 2700K", capabilities: ["power", "brightness", "temperature"] }),
  auxiliaryLights: [makeLightDevice("parent-garden-light", "花园壁灯", "WL100 · 4 盏", "花园", { visible: false, on: false, brightness: 52, effect: "暖白", color: "暖白 2700K", capabilities: ["power", "brightness", "temperature"] })],
  lightGroups: [{ id: "group-parent-lighting", name: "父母家照明", area: "跨区域", memberIds: ["light", "parent-garden-light"], visible: true }],
  fountainOn: false,
  gateOpen: false,
  irrigationOn: false,
  irrigationMode: "持续运行",
  controllerChannels: makeParentChannels(),
  scenes: [{ id: "parent-home", name: "回家照明", detail: "廊灯与庭院门 · 2 个动作", icon: "sun" }, { id: "parent-off", name: "全部关闭", detail: "关闭廊灯与灌溉 · 2 个动作", icon: "power" }],
  schedules: [{ id: "parent-sunset", name: "门廊日落开灯", timeType: "日落", timeValue: "日落时", repeat: "每天", deviceId: "light", deviceName: "父母家廊灯", action: "开启 · 暖白 52%", enabled: true }],
  linkages: [{ id: "parent-gate-light", name: "回家开灯", triggers: [{ deviceId: "gate", deviceName: "父母家庭院门", event: "打开" }], condition: null, actions: [{ deviceId: "light", deviceName: "父母家廊灯", action: "开启 · 暖白 52%" }], enabled: true }],
  selectedArea: "全部",
});

const makeInstallerYard = (): YardWorkspace => ({
  id: "client-yard",
  profile: { name: "客户庭院", city: "杭州", timezone: "Asia/Shanghai" },
  membership: { role: "installer", roleLabel: "临时安装商", expiresAt: "2026-08-31T23:59:59+08:00", authorizedDeviceIds: ["controller", "channel-1", "channel-2", "channel-3", "channel-4"] },
  members: [
    { id: "client-owner", name: "周先生", role: "owner", roleLabel: "所有者", status: "active", expiresAt: null, authorizedDeviceIds: [] },
    { id: "current-installer", name: "当前账户", role: "installer", roleLabel: "临时安装商", status: "active", expiresAt: "2026-08-31T23:59:59+08:00", authorizedDeviceIds: ["controller", "channel-1", "channel-2", "channel-3", "channel-4"] },
  ],
  areas: ["前院", "设备间", "车库"],
  light: makeLightDevice("light", "设备间测试灯", "测试灯", "设备间", { visible: false, on: false, brightness: 0, effect: "未配置", color: "未配置" }),
  auxiliaryLights: [],
  lightGroups: [],
  fountainOn: false,
  gateOpen: false,
  irrigationOn: false,
  irrigationMode: "持续运行",
  controllerChannels: cloneControllerChannels(),
  scenes: [],
  schedules: [],
  linkages: [],
  selectedArea: "全部",
});

const makeInitialYards = (): YardWorkspace[] => [makeOwnerYard(), makeParentYard(), makeInstallerYard()];

const makeEmptyOwnerYard = (id: string, input: CreateYardInput): YardWorkspace => ({
  id,
  profile: { name: input.name, city: input.city, timezone: input.timezone },
  membership: { role: "owner", roleLabel: "所有者", expiresAt: null, authorizedDeviceIds: [] },
  members: [{ id: "new-owner", name: "当前账户", role: "owner", roleLabel: "所有者", status: "active", expiresAt: null, authorizedDeviceIds: [] }],
  areas: [...input.areas],
  light: makeLightDevice("light", "庭院灯带", "未配对", input.areas[0] ?? "前院", { visible: false, on: false, brightness: 68, effect: "日落流光", color: "珊瑚橙" }),
  auxiliaryLights: [],
  lightGroups: [],
  fountainOn: false,
  gateOpen: false,
  irrigationOn: false,
  irrigationMode: "持续运行",
  controllerChannels: cloneControllerChannels().map((channel) => ({ ...channel, configured: false, name: "未配置", type: "未配置", area: "未分配", visible: false })),
  scenes: [],
  schedules: [],
  linkages: [],
  selectedArea: "全部",
});

const makeEmptyMemberYard = (id: string, invite: InvitePreview): YardWorkspace => ({
  id,
  profile: { name: invite.yardName, city: invite.city, timezone: invite.timezone },
  membership: { role: invite.role, roleLabel: invite.roleLabel, expiresAt: invite.validUntil, authorizedDeviceIds: ["light", "channel-1", "channel-2"] },
  members: [{ id: "invite-owner", name: invite.inviter, role: "owner", roleLabel: "所有者", status: "active", expiresAt: null, authorizedDeviceIds: [] }, { id: "invite-member", name: "当前账户", role: invite.role, roleLabel: invite.roleLabel, status: "active", expiresAt: invite.validUntil, authorizedDeviceIds: ["light", "channel-1", "channel-2"] }],
  areas: ["前院", "后院"],
  light: makeLightDevice("light", "四季庭院灯带", "LS200", "前院", { on: false, brightness: 60, effect: "暖白", color: "暖白 2700K" }),
  auxiliaryLights: [],
  lightGroups: [],
  fountainOn: false,
  gateOpen: false,
  irrigationOn: false,
  irrigationMode: "持续运行",
  controllerChannels: cloneControllerChannels().map((channel) => channel.id <= 2 ? { ...channel, configured: true, visible: true } : { ...channel, configured: false, name: "未配置", type: "未配置", area: "未分配", visible: false }),
  scenes: [],
  schedules: [],
  linkages: [],
  selectedArea: "全部",
});

const permissionsFor = (membership: YardMembership): YardPermissions => ({
  controlDevices: membership.role !== "installer" || membership.authorizedDeviceIds.length > 0,
  runScenes: membership.role !== "installer",
  editScenes: membership.role === "owner",
  editAutomations: membership.role === "owner",
  addDevices: membership.role === "owner" || membership.role === "installer",
  configureController: membership.role === "owner" || membership.role === "installer",
  manageYard: membership.role === "owner",
});

const isMembershipExpired = (membership: YardMembership, now = Date.now()) =>
  Boolean(membership.expiresAt && new Date(membership.expiresAt).getTime() <= now);

function useYard() {
  const value = useContext(YardContext);
  if (!value) throw new Error("useYard must be used inside YardContext");
  return value;
}

function useRootTab() {
  const value = useContext(RootTabContext);
  if (!value) throw new Error("useRootTab must be used inside RootTabContext");
  return value;
}

function useVisualMode() {
  return useContext(VisualModeContext);
}

function makeRootScreen(visualMode: VisualMode = "night"): FlowScreen {
  return {
    id: "root-tabs",
    footerHeight: visualMode === "warm" ? 72 : 64,
    footer: () => <RootTabFooter />,
    render: (flow) => <RootTabContent flow={flow} />,
  };
}

function detailScreen(id: string, title: string, content: (flow: FlowControls) => ReactNode): FlowScreen {
  return {
    id,
    headerHeight: 58,
    header: (flow) => <DetailHeader title={title} flow={flow} />,
    render: content,
  };
}

export default function Prototype() {
  const [visualMode, setVisualMode] = useState<VisualMode>(() =>
    new URLSearchParams(window.location.search).get("visual") === "warm" ? "warm" : "night",
  );
  const [activeTab, setActiveTab] = useState<RootTab>("devices");
  const [yards, setYards] = useState<YardWorkspace[]>(makeInitialYards);
  const [activeYardId, setActiveYardId] = useState("my-yard");
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);

  const activeYard = yards.find((yard) => yard.id === activeYardId) ?? yards[0];
  const permissions = permissionsFor(activeYard.membership);

  const updateActiveYard = useCallback(
    (updater: (yard: YardWorkspace) => YardWorkspace) => {
      setYards((current) => current.map((yard) => yard.id === activeYardId ? updater(yard) : yard));
    },
    [activeYardId],
  );

  const switchYard = useCallback((yardId: string) => {
    const target = yards.find((yard) => yard.id === yardId);
    if (!target) return "missing" as const;
    if (isMembershipExpired(target.membership)) return "expired" as const;
    setActiveYardId(yardId);
    setActiveTab("devices");
    return "switched" as const;
  }, [yards]);

  const setSelectedArea = useCallback((area: string) => {
    updateActiveYard((yard) => ({ ...yard, selectedArea: area }));
  }, [updateActiveYard]);

  const createYard = useCallback((input: CreateYardInput) => {
    const id = `yard-${Date.now()}`;
    setYards((current) => [...current, makeEmptyOwnerYard(id, input)]);
    setActiveYardId(id);
    setActiveTab("devices");
    return id;
  }, []);

  const lookupInvite = useCallback((code: string): InviteLookupResult => {
    const normalized = code.trim().toUpperCase();
    if (normalized === "GARDEN-NEW") {
      return { status: "ready", invite: { code: normalized, yardName: "四季庭院", inviter: "赵先生", city: "杭州", timezone: "Asia/Shanghai", role: "member", roleLabel: "普通成员", validUntil: "2026-12-31T23:59:59+08:00" } };
    }
    if (normalized === "EXPIRED-2026") return { status: "expired", message: "邀请码已过期" };
    if (normalized === "PARENTS-2026") return { status: "joined", message: "你已加入该庭院" };
    return { status: "invalid", message: "邀请码无效" };
  }, []);

  const acceptInvite = useCallback((invite: InvitePreview) => {
    const id = `yard-${Date.now()}`;
    setYards((current) => [...current, makeEmptyMemberYard(id, invite)]);
    setActiveYardId(id);
    setActiveTab("devices");
    return id;
  }, []);

  const updateYardProfile = useCallback((yardId: string, profile: YardProfile) => {
    setYards((current) => current.map((yard) => yard.id === yardId ? { ...yard, profile } : yard));
  }, []);

  const addYardArea = useCallback((yardId: string, name: string) => {
    const normalized = name.trim();
    const target = yards.find((yard) => yard.id === yardId);
    if (!target || !normalized || target.areas.includes(normalized)) return false;
    setYards((current) => current.map((yard) => yard.id === yardId ? { ...yard, areas: [...yard.areas, normalized] } : yard));
    return true;
  }, [yards]);

  const renameYardArea = useCallback((yardId: string, oldName: string, newName: string) => {
    const normalized = newName.trim();
    const target = yards.find((yard) => yard.id === yardId);
    if (!target || !normalized || target.areas.includes(normalized)) return false;
    setYards((current) => current.map((yard) => {
      if (yard.id !== yardId) return yard;
      return {
        ...yard,
        areas: yard.areas.map((area) => area === oldName ? normalized : area),
        selectedArea: yard.selectedArea === oldName ? normalized : yard.selectedArea,
        light: yard.light.area === oldName ? { ...yard.light, area: normalized } : yard.light,
        auxiliaryLights: yard.auxiliaryLights.map((light) => light.area === oldName ? { ...light, area: normalized } : light),
        lightGroups: yard.lightGroups.map((group) => group.area === oldName ? { ...group, area: normalized } : group),
        controllerChannels: yard.controllerChannels.map((channel) => channel.area === oldName ? { ...channel, area: normalized } : channel),
      };
    }));
    return true;
  }, [yards]);

  const removeYardArea = useCallback((yardId: string, name: string): RemoveAreaResult => {
    const target = yards.find((yard) => yard.id === yardId);
    if (!target || !target.areas.includes(name)) return "missing";
    if (target.areas.length <= 1) return "last-area";
    if ((target.light.visible && target.light.area === name) || target.auxiliaryLights.some((light) => light.area === name) || target.lightGroups.some((group) => group.area === name) || target.controllerChannels.some((channel) => channel.configured && channel.area === name)) return "in-use";
    setYards((current) => current.map((yard) => yard.id === yardId ? { ...yard, areas: yard.areas.filter((area) => area !== name), selectedArea: yard.selectedArea === name ? "全部" : yard.selectedArea } : yard));
    return "removed";
  }, [yards]);

  const updateInstallerAuthorization = useCallback((yardId: string, memberId: string, deviceIds: string[], expiresAt: string) => {
    setYards((current) => current.map((yard) => {
      if (yard.id !== yardId) return yard;
      return {
        ...yard,
        members: yard.members.map((member) => member.id === memberId && member.role === "installer"
          ? { ...member, authorizedDeviceIds: [...deviceIds], expiresAt, status: "active" as const }
          : member),
      };
    }));
  }, []);

  const createLightGroup = useCallback((input: LightGroupInput) => {
    const id = `light-group-${Date.now()}`;
    updateActiveYard((yard) => ({ ...yard, lightGroups: [{ id, ...input }, ...yard.lightGroups] }));
    return id;
  }, [updateActiveYard]);

  const updateLightGroup = useCallback((groupId: string, input: LightGroupInput) => {
    updateActiveYard((yard) => ({ ...yard, lightGroups: yard.lightGroups.map((group) => group.id === groupId ? { id: groupId, ...input } : group) }));
  }, [updateActiveYard]);

  const deleteLightGroup = useCallback((groupId: string) => {
    updateActiveYard((yard) => ({ ...yard, lightGroups: yard.lightGroups.filter((group) => group.id !== groupId) }));
  }, [updateActiveYard]);

  const setLightDeviceOn = useCallback((deviceId: string, value: boolean) => {
    updateActiveYard((yard) => updateLightingMembers(yard, [deviceId], { on: value }));
  }, [updateActiveYard]);

  const updateLightDeviceArea = useCallback((deviceId: string, area: string) => {
    const deviceExists = allLightingDevices(activeYard).some((light) => light.id === deviceId);
    if (!deviceExists || (area !== "未分区" && !activeYard.areas.includes(area))) return false;
    updateActiveYard((yard) => ({
      ...yard,
      light: yard.light.id === deviceId ? { ...yard.light, area } : yard.light,
      auxiliaryLights: yard.auxiliaryLights.map((light) => light.id === deviceId ? { ...light, area } : light),
    }));
    return true;
  }, [activeYard, updateActiveYard]);

  const setLightGroupOn = useCallback((groupId: string, value: boolean) => {
    updateActiveYard((yard) => {
      const group = yard.lightGroups.find((item) => item.id === groupId);
      return group ? updateLightingMembers(yard, group.memberIds, { on: value }) : yard;
    });
  }, [updateActiveYard]);

  const setLightGroupBrightness = useCallback((groupId: string, value: number) => {
    updateActiveYard((yard) => {
      const group = yard.lightGroups.find((item) => item.id === groupId);
      return group ? updateLightingMembers(yard, group.memberIds, { brightness: value, on: value > 0 }) : yard;
    });
  }, [updateActiveYard]);

  const setLightGroupEffect = useCallback((groupId: string, value: string) => {
    updateActiveYard((yard) => {
      const group = yard.lightGroups.find((item) => item.id === groupId);
      return group ? updateLightingMembers(yard, group.memberIds, { effect: value, on: true }) : yard;
    });
  }, [updateActiveYard]);

  const setLightGroupColor = useCallback((groupId: string, value: string) => {
    updateActiveYard((yard) => {
      const group = yard.lightGroups.find((item) => item.id === groupId);
      return group ? updateLightingMembers(yard, group.memberIds, { color: value, on: true }) : yard;
    });
  }, [updateActiveYard]);

  const setLightOn = useCallback((value: boolean) => {
    updateActiveYard((yard) => ({ ...yard, light: { ...yard.light, on: value } }));
  }, [updateActiveYard]);

  const setBrightness = useCallback((value: number) => {
    updateActiveYard((yard) => ({ ...yard, light: { ...yard.light, brightness: value } }));
  }, [updateActiveYard]);

  const setLightEffect = useCallback((value: string) => {
    updateActiveYard((yard) => ({ ...yard, light: { ...yard.light, effect: value } }));
  }, [updateActiveYard]);

  const setFountainOn = useCallback((value: boolean) => {
    updateActiveYard((yard) => ({ ...yard, fountainOn: value }));
  }, [updateActiveYard]);

  const setGateOpen = useCallback((value: boolean) => {
    updateActiveYard((yard) => ({ ...yard, gateOpen: value }));
  }, [updateActiveYard]);

  const setIrrigationOn = useCallback((value: boolean) => {
    updateActiveYard((yard) => ({ ...yard, irrigationOn: value }));
  }, [updateActiveYard]);

  const setIrrigationMode = useCallback((value: string) => {
    updateActiveYard((yard) => ({ ...yard, irrigationMode: value }));
  }, [updateActiveYard]);

  const setControllerChannels = useCallback<YardState["setControllerChannels"]>((value) => {
    updateActiveYard((yard) => ({
      ...yard,
      controllerChannels: typeof value === "function" ? value(yard.controllerChannels) : value,
    }));
  }, [updateActiveYard]);

  const setScenes = useCallback<YardState["setScenes"]>((value) => {
    updateActiveYard((yard) => ({ ...yard, scenes: typeof value === "function" ? value(yard.scenes) : value }));
  }, [updateActiveYard]);

  const setSchedules = useCallback<YardState["setSchedules"]>((value) => {
    updateActiveYard((yard) => ({ ...yard, schedules: typeof value === "function" ? value(yard.schedules) : value }));
  }, [updateActiveYard]);

  const setLinkages = useCallback<YardState["setLinkages"]>((value) => {
    updateActiveYard((yard) => ({ ...yard, linkages: typeof value === "function" ? value(yard.linkages) : value }));
  }, [updateActiveYard]);

  const selectVisualMode = useCallback((mode: VisualMode) => {
    setVisualMode(mode);
    setActiveTab("devices");

    const nextUrl = new URL(window.location.href);
    if (mode === "warm") nextUrl.searchParams.set("visual", "warm");
    else nextUrl.searchParams.delete("visual");
    window.history.replaceState(null, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.yardVisual = visualMode;
    return () => {
      delete document.documentElement.dataset.yardVisual;
    };
  }, [visualMode]);

  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2400);
  }, []);

  const runDinnerScene = useCallback(() => {
    updateActiveYard((yard) => ({
      ...yard,
      light: { ...yard.light, on: true, brightness: 68, effect: "日落流光" },
      fountainOn: true,
    }));
    notify("“花园晚宴”已执行 · 4 项成功");
  }, [notify, updateActiveYard]);

  const state = useMemo<YardState>(
    () => ({
      yards,
      activeYardId,
      activeYard,
      permissions,
      switchYard,
      setSelectedArea,
      createYard,
      lookupInvite,
      acceptInvite,
      updateYardProfile,
      addYardArea,
      renameYardArea,
      removeYardArea,
      updateInstallerAuthorization,
      createLightGroup,
      updateLightGroup,
      deleteLightGroup,
      setLightDeviceOn,
      updateLightDeviceArea,
      setLightGroupOn,
      setLightGroupBrightness,
      setLightGroupEffect,
      setLightGroupColor,
      lightOn: activeYard.light.on,
      setLightOn,
      brightness: activeYard.light.brightness,
      setBrightness,
      lightEffect: activeYard.light.effect,
      setLightEffect,
      fountainOn: activeYard.fountainOn,
      setFountainOn,
      gateOpen: activeYard.gateOpen,
      setGateOpen,
      irrigationOn: activeYard.irrigationOn,
      setIrrigationOn,
      irrigationMode: activeYard.irrigationMode,
      setIrrigationMode,
      controllerChannels: activeYard.controllerChannels,
      setControllerChannels,
      scenes: activeYard.scenes,
      setScenes,
      schedules: activeYard.schedules,
      setSchedules,
      linkages: activeYard.linkages,
      setLinkages,
      notify,
      runDinnerScene,
    }),
    [
      activeYard,
      activeYardId,
      yards,
      permissions,
      createYard,
      lookupInvite,
      acceptInvite,
      updateYardProfile,
      addYardArea,
      renameYardArea,
      removeYardArea,
      updateInstallerAuthorization,
      createLightGroup,
      updateLightGroup,
      deleteLightGroup,
      setLightDeviceOn,
      updateLightDeviceArea,
      setLightGroupOn,
      setLightGroupBrightness,
      setLightGroupEffect,
      setLightGroupColor,
      notify,
      runDinnerScene,
      setBrightness,
      setControllerChannels,
      setFountainOn,
      setGateOpen,
      setIrrigationMode,
      setIrrigationOn,
      setLightEffect,
      setLightOn,
      setLinkages,
      setScenes,
      setSchedules,
      setSelectedArea,
      switchYard,
    ],
  );

  return (
    <VisualModeContext.Provider value={visualMode}>
      <RootTabContext.Provider value={{ activeTab, setActiveTab }}>
        <YardContext.Provider value={state}>
          <div className={`yard-app visual-${visualMode}`} data-testid="yard-app" data-visual={visualMode} data-yard-id={activeYard.id} data-active-tab={activeTab}>
            <FlowStack key={visualMode} initial={makeRootScreen(visualMode)} />
            {toast ? (
              <div className="app-toast" role="status" data-testid="app-toast">
                <Check size={17} weight="bold" />
                <span>{toast}</span>
              </div>
            ) : null}
          </div>
          <VisualSwitcher value={visualMode} onChange={selectVisualMode} />
        </YardContext.Provider>
      </RootTabContext.Provider>
    </VisualModeContext.Provider>
  );
}

function VisualSwitcher({ value, onChange }: { value: VisualMode; onChange: (mode: VisualMode) => void }) {
  return createPortal(
    <div className="visual-switcher" role="group" aria-label="视觉方案">
      <span>视觉方案</span>
      <div>
        <button className={value === "night" ? "active" : ""} aria-pressed={value === "night"} onClick={() => onChange("night")}>深色</button>
        <button className={value === "warm" ? "active" : ""} aria-pressed={value === "warm"} onClick={() => onChange("warm")}>暖白</button>
      </div>
    </div>,
    document.body,
  );
}

function RootTabContent({ flow }: { flow: FlowControls }) {
  const { activeTab } = useRootTab();
  return <RootContent tab={activeTab} flow={flow} />;
}

function RootTabFooter() {
  const { activeTab, setActiveTab } = useRootTab();
  const keyboard = useKeyboard();
  return <BottomNav active={activeTab} onChange={(tab) => { keyboard.hide(); setActiveTab(tab); }} />;
}

function RootContent({ tab, flow }: { tab: RootTab; flow: FlowControls }) {
  if (tab === "devices") return <DevicesHome flow={flow} />;
  if (tab === "scenes") return <ScenesHome flow={flow} />;
  if (tab === "automation") return <AutomationHome flow={flow} />;
  return <MeHome flow={flow} />;
}

function AppTopBar({
  title = "我的庭院",
  subtitle,
  selectable = false,
  showNotifications = false,
  action,
  onSelectYard,
}: {
  title?: string;
  subtitle?: string;
  selectable?: boolean;
  showNotifications?: boolean;
  action?: { label: string; onClick: () => void; testId?: string };
  onSelectYard?: () => void;
}) {
  const visualMode = useVisualMode();
  const yard = useYard();
  const displayedTitle = selectable ? yard.activeYard.profile.name : title;
  const heading = (
    <span>
      <strong data-testid={selectable ? "active-yard-name" : undefined}>{displayedTitle}</strong>
      {subtitle ? <small>{subtitle}</small> : null}
    </span>
  );

  if (visualMode === "warm") {
    return (
      <header className="warm-module-topbar">
        {selectable ? (
          <button className="warm-module-selector" aria-label="切换庭院" onClick={onSelectYard}>{heading}<CaretDown size={18} weight="bold" /></button>
        ) : (
          <div className="warm-module-heading">{heading}</div>
        )}
        {showNotifications || action ? (
          <div className="warm-module-actions">
            {showNotifications ? <button aria-label="通知"><Bell size={24} /></button> : null}
            {action ? <button aria-label={action.label} data-testid={action.testId} onClick={action.onClick}><Plus size={25} /></button> : null}
          </div>
        ) : null}
      </header>
    );
  }

  return (
    <header className="app-topbar">
      {selectable ? <button className="yard-selector" aria-label="切换庭院" onClick={onSelectYard}>{heading}<CaretDown size={18} weight="bold" /></button> : <div className="yard-selector page-heading">{heading}</div>}
      {showNotifications || action ? <div className="topbar-actions">
        {showNotifications ? <button className="icon-button" aria-label="通知">
          <Bell size={24} />
          <span className="notification-dot" />
        </button> : null}
        {action ? <button className="icon-button" aria-label={action.label} data-testid={action.testId} onClick={action.onClick}>
          <Plus size={25} />
        </button> : null}
      </div> : null}
    </header>
  );
}

function NightDevicesTop({ onSelectYard, onAdd }: { onSelectYard: () => void; onAdd: () => void }) {
  return (
    <section
      className="night-devices-top"
      data-testid="night-devices-home"
      style={{
        backgroundImage: `url("${publicAsset("assets/app/night-garden-hero-final.png")}")`,
      }}
    >
      <AppTopBar selectable onSelectYard={onSelectYard} showNotifications action={{ label: "添加", testId: "add-device", onClick: onAdd }} />
      <section className="garden-hero" aria-label="庭院运行状态">
        <img src={publicAsset("assets/app/night-garden-hero-final.png")} alt="夜间庭院步道、景观灯与庭院门" draggable={false} />
        <div className="hero-scrim" />
        <div className="hero-status">
          <span className="hero-status-icon"><ShieldCheck size={27} weight="duotone" /></span>
          <span><strong>设备运行正常</strong><small>庭院一切正常</small></span>
        </div>
      </section>
    </section>
  );
}

function WarmDevicesTop({ onSelectYard, onAdd }: { onSelectYard: () => void; onAdd: () => void }) {
  const yard = useYard();
  return (
    <section className="warm-devices-top" aria-label="庭院运行状态">
      <img className="warm-devices-hero-image" src={publicAsset("assets/app/warm-garden-hero-faded.png")} alt="黄昏庭院花园与庭院门" draggable={false} />
      <header className="warm-devices-topbar">
        <button className="warm-yard-selector" aria-label="切换庭院" onClick={onSelectYard}>
          <strong data-testid="active-yard-name">{yard.activeYard.profile.name}</strong>
          <CaretDown size={18} weight="bold" />
        </button>
        <div className="warm-topbar-actions">
          <button aria-label="通知"><Bell size={24} /></button>
          <button aria-label="添加" data-testid="add-device" onClick={onAdd}><Plus size={26} /></button>
        </div>
      </header>
      <div className="warm-hero-status">
        <span><ShieldCheck size={22} weight="fill" /></span>
        <strong>设备运行正常</strong>
      </div>
    </section>
  );
}

type YardSwitcherContentProps = {
  yards: YardWorkspace[];
  activeYardId: string;
  onSelect: (yardId: string) => void;
  onCreate: () => void;
  onJoin: () => void;
  onManage: () => void;
};

function yardSummary(yard: YardWorkspace) {
  const visibleDevices = [yard.light.visible, ...yard.controllerChannels.filter((channel) => channel.configured && channel.visible).map(() => true)].filter(Boolean).length;
  const onlineDevices = yard.membership.role === "installer" ? yard.controllerChannels.filter((channel) => channel.configured).length : visibleDevices;
  return `${onlineDevices}/${Math.max(visibleDevices, onlineDevices)} 台设备在线`;
}

function YardOption({ yard, activeYardId, onSelect, visual }: YardSwitcherContentProps & { yard: YardWorkspace; visual: VisualMode }) {
  const isActive = yard.id === activeYardId;
  const expired = isMembershipExpired(yard.membership);
  return (
    <button
      className={`${visual}-yard-option ${expired ? "expired" : ""}`}
      aria-current={isActive ? "true" : undefined}
      aria-disabled={expired}
      aria-label={`切换到${yard.profile.name}`}
      onClick={() => onSelect(yard.id)}
    >
      <span className={`${visual}-yard-option-icon`}><House size={visual === "warm" ? 22 : 20} /></span>
      <span className={`${visual}-yard-option-copy`}>
        <strong>{yard.profile.name}</strong>
        <small>{yard.membership.roleLabel} · {yard.profile.city} · {yard.profile.timezone}</small>
        <em>{expired ? "授权已过期" : yardSummary(yard)}{yard.membership.expiresAt ? ` · 授权至 ${yard.membership.expiresAt.slice(0, 10)}` : ""}</em>
      </span>
      {isActive ? <Check size={19} weight="bold" /> : <CaretRight size={18} />}
    </button>
  );
}

function YardSwitcherContent(props: YardSwitcherContentProps & { visual: VisualMode }) {
  const { device } = useMobileDevice();
  const [query, setQuery] = useState("");
  const showSearch = props.yards.length > 5;
  const filteredYards = props.yards.filter((yard) => `${yard.profile.name}${yard.profile.city}`.toLowerCase().includes(query.trim().toLowerCase()));
  const maxListHeight = Math.max(180, Math.round(device.geometry.screen.height * 0.72) - 250 - (showSearch ? 59 : 0));
  return (
    <div className={`${props.visual}-yard-switcher yard-switcher-shell`} data-testid={`${props.visual}-yard-switcher`}>
      {showSearch ? <div className="yard-switcher-search"><KeyboardInput value={query} placeholder="搜索庭院或城市" onChange={(event) => setQuery(event.target.value)} /></div> : null}
      <div className="yard-switcher-scroll" style={{ maxHeight: maxListHeight }}>
        <div className={`${props.visual}-yard-list`}>
          {filteredYards.map((yard) => <YardOption key={yard.id} {...props} yard={yard} visual={props.visual} />)}
          {!filteredYards.length ? <div className="empty-state-card"><strong>没有匹配的庭院</strong><small>请清空搜索后重试。</small></div> : null}
        </div>
      </div>
      <div className={`${props.visual}-yard-actions yard-switcher-fixed-actions`}>
        <div className="yard-switcher-primary-actions"><button className="primary-button" onClick={props.onCreate}><Plus size={18} />新建庭院</button><button className="secondary-button" onClick={props.onJoin}><QrCode size={18} />加入庭院</button></div>
        <button className="secondary-button yard-manage-current" onClick={props.onManage}><Gear size={18} />管理当前庭院</button>
      </div>
    </div>
  );
}

function YardSwitcherSheet({ open, onOpenChange, yards, activeYardId, onSelect, onCreate, onJoin, onManage }: YardSwitcherContentProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  const visualMode = useVisualMode();
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="切换庭院" description="选择后，设备、场景和自动化会切换到对应庭院。" snap={0.72}>
      <YardSwitcherContent visual={visualMode} yards={yards} activeYardId={activeYardId} onSelect={onSelect} onCreate={onCreate} onJoin={onJoin} onManage={onManage} />
    </BottomSheet>
  );
}

function BottomNav({ active, onChange }: { active: RootTab; onChange: (tab: RootTab) => void }) {
  const visualMode = useVisualMode();
  const items: Array<{ id: RootTab; label: string; icon: ReactNode }> = [
    { id: "devices", label: "设备", icon: visualMode === "warm" ? <Leaf size={22} weight="fill" /> : <LampPendant size={25} /> },
    { id: "scenes", label: "场景", icon: <SunHorizon size={24} /> },
    { id: "automation", label: "自动化", icon: visualMode === "warm" ? <ClockCounterClockwise size={24} /> : <Plant size={25} /> },
    { id: "me", label: "我的", icon: <User size={24} /> },
  ];

  return (
    <nav className="bottom-nav" aria-label="主导航">
      {items.map((item) => (
        <button
          key={item.id}
          data-testid={`tab-${item.id}`}
          className={active === item.id ? "active" : ""}
          onClick={() => active !== item.id && onChange(item.id)}
        >
          <span className="nav-icon">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function DevicesHome({ flow }: { flow: FlowControls }) {
  const yard = useYard();
  const visualMode = useVisualMode();
  const isWarm = visualMode === "warm";
  const [yardSwitcherOpen, setYardSwitcherOpen] = useState(false);
  const [addSheet, setAddSheet] = useState(false);
  const [gateSheet, setGateSheet] = useState(false);
  const [irrigationSheet, setIrrigationSheet] = useState(false);
  const area = yard.activeYard.selectedArea;
  const areas = ["全部", ...yard.activeYard.areas];
  const fountainChannel = yard.controllerChannels.find((channel) => channel.id === 2);
  const gateChannel = yard.controllerChannels.find((channel) => channel.id === 1);
  const irrigationChannel = yard.controllerChannels.find((channel) => channel.id === 3);
  const isVisibleInArea = (deviceArea: string) => area === "全部" || deviceArea === area;
  const extraChannels = yard.controllerChannels.filter((channel) => channel.id > 3 && channel.configured && channel.visible && isVisibleInArea(channel.area));
  const visibleLightGroups = yard.activeYard.lightGroups.filter((group) => group.visible && (area === "全部" || group.area === "跨区域" || group.area === area));
  const lightingDevices = allLightingDevices(yard.activeYard).filter((light) => light.online || light.visible);
  const showPrimaryLight = yard.activeYard.light.visible && isVisibleInArea(yard.activeYard.light.area);
  const showFountain = Boolean(fountainChannel?.configured && fountainChannel.visible && isVisibleInArea(fountainChannel.area));
  const showGate = Boolean(gateChannel?.configured && gateChannel.visible && isVisibleInArea(gateChannel.area));
  const showIrrigation = Boolean(irrigationChannel?.configured && irrigationChannel.visible && isVisibleInArea(irrigationChannel.area));
  const hasVisibleDevices = visibleLightGroups.length > 0 || showPrimaryLight || showFountain || showGate || showIrrigation || extraChannels.length > 0;

  return (
    <>
      <MobileScroll className={`app-screen dark-screen ${isWarm ? "warm-screen" : ""}`}>
        <main className="root-page devices-page">
          {isWarm ? <WarmDevicesTop onSelectYard={() => setYardSwitcherOpen(true)} onAdd={() => setAddSheet(true)} /> : <NightDevicesTop onSelectYard={() => setYardSwitcherOpen(true)} onAdd={() => setAddSheet(true)} />}

          <Carousel ariaLabel="庭院区域" className="area-carousel" contentClassName="area-track">
            {areas.map((item) => (
              <button
                key={item}
                className={`area-chip ${area === item ? "active" : ""}`}
                aria-pressed={area === item}
                onClick={() => yard.setSelectedArea(item)}
              >
                {item}
              </button>
            ))}
          </Carousel>

          <section className="device-list" aria-label={`${area}设备`}>
            {!hasVisibleDevices ? <div className="empty-state-card device-empty-state"><SlidersHorizontal size={30} /><strong>还没有设备</strong><small>添加设备后，它们会出现在这里，并按区域独立管理。</small><button className="primary-button" onClick={() => flow.push(addDeviceScreen())}><Plus size={18} />添加设备</button></div> : null}
            {visibleLightGroups.map((group) => <LightGroupCard key={group.id} group={group} flow={flow} />)}
            {showPrimaryLight ? <article className="device-card light-card" data-testid="device-lightstrip">
              <button
                className="device-card-main"
                onClick={() => flow.push(lightDeviceDetailScreen(yard.activeYard.light.id))}
                aria-label={`打开${yard.activeYard.light.name}详情`}
              >
                {isWarm ? (
                  <img className="device-thumb pictogram warm-pictogram" src={publicAsset("assets/app/icons/warm/lightstrip.png")} alt={`${yard.activeYard.light.name}图标`} draggable={false} />
                ) : (
                  <img className="device-thumb photo" src={publicAsset("assets/app/sunset-strip-thumbnail.png")} alt={`${yard.activeYard.light.name}效果`} draggable={false} />
                )}
                <span className="device-copy">
                  <span className="device-title">{yard.activeYard.light.name}</span>
                  <span className={`device-state ${yard.lightOn ? "on" : ""}`}>
                    <i />{yard.lightOn ? "已开启" : "已关闭"}
                  </span>
                  {isWarm ? (
                    <span className="light-meta-row">
                      <span className="device-meta"><Sun size={16} /> 亮度 {yard.brightness}%</span>
                      <i className="meta-divider" />
                      <span className="device-meta"><Sparkle size={16} /> {yard.lightEffect}</span>
                    </span>
                  ) : (
                    <>
                      <span className="device-meta"><Sun size={16} /> 亮度 {yard.brightness}%</span>
                      <span className="device-meta"><Sparkle size={16} /> 当前效果 {yard.lightEffect}</span>
                    </>
                  )}
                </span>
              </button>
              {isWarm ? (
                <span className="warm-light-actions">
                  <Switch
                    label={`${yard.activeYard.light.name}开关`}
                    value={yard.lightOn}
                    onChange={(value) => {
                      yard.setLightOn(value);
                      yard.notify(value ? "露台灯带已开启" : "露台灯带已关闭");
                    }}
                  />
                </span>
              ) : (
                <Switch
                  label={`${yard.activeYard.light.name}开关`}
                  value={yard.lightOn}
                  onChange={(value) => {
                    yard.setLightOn(value);
                    yard.notify(value ? "露台灯带已开启" : "露台灯带已关闭");
                  }}
                />
              )}
              <img
                className="light-card-glow"
                src={publicAsset("assets/app/sunset-card-glow.png")}
                data-effect={yard.lightEffect}
                data-active={yard.lightOn}
                alt=""
                aria-hidden="true"
                draggable={false}
              />
            </article> : null}

            {showFountain && fountainChannel ? <article className="device-card" data-testid="device-fountain">
              <button
                className="device-card-main"
                onClick={() => flow.push(detailScreen("fountain-detail", fountainChannel.name, (detailFlow) => <FountainDetail flow={detailFlow} />))}
                aria-label={`打开${fountainChannel.name}详情`}
              >
                <img className="device-thumb pictogram" src={publicAsset(`assets/app/icons/${isWarm ? "warm" : "night"}/fountain.png`)} alt="后院喷泉图标" draggable={false} />
                <span className="device-copy">
                  <span className="device-title">{fountainChannel.name}</span>
                  <span className={`device-state ${yard.fountainOn ? "on" : ""}`}><i />{yard.fountainOn ? "已开启" : "已关闭"}</span>
                  <span className="device-meta"><Clock size={16} /> {isWarm ? (yard.fountainOn ? "已运行 18 分钟" : "当前未运行") : `${fountainChannel.area} · ${yard.fountainOn ? "已运行 18 分钟" : "当前未运行"}`}</span>
                </span>
              </button>
              <Switch
                label="后院喷泉开关"
                value={yard.fountainOn}
                onChange={(value) => {
                  yard.setFountainOn(value);
                  yard.notify(value ? "后院喷泉已开启" : "后院喷泉已关闭");
                }}
              />
            </article> : null}

            {showGate && gateChannel ? <article className="device-card" data-testid="device-gate">
              <button
                className="device-card-main"
                onClick={() => flow.push(detailScreen("gate-detail", gateChannel.name, (detailFlow) => <GateDetail flow={detailFlow} />))}
                aria-label={`打开${gateChannel.name}详情`}
              >
                <img className="device-thumb pictogram" src={publicAsset(`assets/app/icons/${isWarm ? "warm" : "night"}/gate.png`)} alt="庭院门图标" draggable={false} />
                <span className="device-copy">
                  <span className="device-title">{gateChannel.name}</span>
                  <span className={`device-state neutral ${isWarm ? "secure-state" : ""}`}><i />{yard.gateOpen ? "已打开" : "已关闭"}{isWarm ? <ShieldCheck size={16} weight="duotone" /> : null}</span>
                  {!isWarm ? <span className="device-meta"><ShieldCheck size={16} /> {gateChannel.area} · 安全确认后执行</span> : null}
                </span>
              </button>
              <button className="outline-action" data-testid="quick-gate" onClick={() => setGateSheet(true)}>
                {isWarm ? <>{yard.gateOpen ? "关闭" : "打开"}<ShieldCheck size={17} weight="duotone" /><CaretRight size={16} weight="bold" /></> : <><Lock size={17} />{yard.gateOpen ? "关闭" : "打开"}</>}
              </button>
            </article> : null}

            {showIrrigation && irrigationChannel ? <article className="device-card" data-testid="device-irrigation">
              <button
                className="device-card-main"
                onClick={() => flow.push(detailScreen("irrigation-detail", irrigationChannel.name, (detailFlow) => <IrrigationDetail flow={detailFlow} />))}
                aria-label={`打开${irrigationChannel.name}详情`}
              >
                <img className="device-thumb pictogram" src={publicAsset(`assets/app/icons/${isWarm ? "warm" : "night"}/irrigation.png`)} alt="前院灌溉图标" draggable={false} />
                <span className="device-copy">
                  <span className="device-title">{irrigationChannel.name}</span>
                  <span className={`device-state ${yard.irrigationOn ? "on" : "neutral"}`}><i />{yard.irrigationOn ? "运行中" : "空闲"}</span>
                  {!isWarm ? <span className="device-meta">{irrigationChannel.area} · {yard.irrigationOn ? yard.irrigationMode : "下一计划：明日 06:30"}</span> : null}
                </span>
              </button>
              <button className="outline-action" data-testid="quick-irrigation" onClick={() => setIrrigationSheet(true)}>
                {isWarm ? <>{yard.irrigationOn ? "停止" : "启动"}<CaretRight size={16} weight="bold" /></> : <>{yard.irrigationOn ? <Stop size={17} /> : <Play size={17} />}{yard.irrigationOn ? "停止" : "启动"}</>}
              </button>
            </article> : null}

            {extraChannels.map((channel) => (
              <article className="device-card" data-testid={`device-channel-${channel.id}`} key={channel.id}>
                <button
                  className="device-card-main"
                  onClick={() => flow.push(genericChannelDetailScreen(channel))}
                  aria-label={`打开${channel.name}详情`}
                >
                  <span className="device-thumb icon">{channelIcon(channel.type, 39)}</span>
                  <span className="device-copy">
                    <span className="device-title">{channel.name}</span>
                    <span className="device-state neutral"><i />在线 · 待机</span>
                    <span className="device-meta">{channel.area} · DC12 CH{channel.id} · {channel.mode}</span>
                  </span>
                </button>
                <button className="outline-action" onClick={() => flow.push(genericChannelDetailScreen(channel))}>控制</button>
              </article>
            ))}
          </section>
        </main>
      </MobileScroll>

      <YardSwitcherSheet
        open={yardSwitcherOpen}
        onOpenChange={setYardSwitcherOpen}
        yards={yard.yards}
        activeYardId={yard.activeYardId}
        onSelect={(yardId) => {
          const target = yard.yards.find((item) => item.id === yardId);
          const result = yard.switchYard(yardId);
          if (result === "switched" && target) {
            setYardSwitcherOpen(false);
            yard.notify(`已切换至${target.profile.name}`);
          } else if (result === "expired") {
            setYardSwitcherOpen(false);
            yard.notify("授权已到期，无法进入客户庭院");
          }
        }}
        onCreate={() => {
          setYardSwitcherOpen(false);
          flow.push(createYardScreen());
        }}
        onJoin={() => {
          setYardSwitcherOpen(false);
          flow.push(joinYardScreen());
        }}
        onManage={() => {
          setYardSwitcherOpen(false);
          flow.push(yardManagementScreen());
        }}
      />

      <BottomSheet open={addSheet} onOpenChange={setAddSheet} title="添加到庭院" description="添加新硬件，或把已有灯光组合为一个控制入口。" snap={0.46}>
        <div className="add-choice-list">
          <button data-testid="add-physical-device" onClick={() => { setAddSheet(false); flow.push(addDeviceScreen()); }}><span><Plus size={23} /></span><div><strong>添加设备</strong><small>搜索并配对灯带或干接点控制器</small></div><CaretRight size={18} /></button>
          <button data-testid="create-light-group" disabled={!yard.permissions.manageYard || lightingDevices.length < 2} onClick={() => { setAddSheet(false); flow.push(lightGroupEditorScreen()); }}><span><LightbulbFilament size={23} /></span><div><strong>新建灯光组</strong><small>{lightingDevices.length < 2 ? "至少需要 2 个灯光设备" : "统一控制开关、亮度、颜色和效果"}</small></div><CaretRight size={18} /></button>
        </div>
      </BottomSheet>

      <BottomSheet
        open={gateSheet}
        onOpenChange={setGateSheet}
        title={yard.gateOpen ? "关闭庭院门" : "打开庭院门"}
        description="这是敏感操作，请确认庭院门周围安全。"
        snap={0.43}
      >
        <div className="sheet-security">
          <span><ShieldCheck size={26} weight="duotone" /></span>
          <p>操作将记录在庭院日志中<br /><small>操作者：当前账户 · 远程控制</small></p>
        </div>
        <button
          className="primary-button"
          data-testid="confirm-gate-open"
          onClick={() => {
            yard.setGateOpen(!yard.gateOpen);
            setGateSheet(false);
            yard.notify(`庭院门${yard.gateOpen ? "关闭" : "打开"}指令已发送`);
          }}
        >
          长按确认{yard.gateOpen ? "关闭" : "打开"}
        </button>
        <button className="secondary-button" onClick={() => setGateSheet(false)}>取消</button>
      </BottomSheet>

      <BottomSheet
        open={irrigationSheet}
        onOpenChange={setIrrigationSheet}
        title={yard.irrigationOn ? "停止前院灌溉" : "启动前院灌溉"}
        description={yard.irrigationOn ? "当前正在运行。" : "可以持续运行，也可以选择结束时间。"}
        snap={0.5}
      >
        {!yard.irrigationOn ? (
          <div className="choice-grid" aria-label="运行方式">
            {["持续运行", "15 分钟", "30 分钟", "60 分钟"].map((item) => (
              <button
                key={item}
                className={yard.irrigationMode === item ? "selected" : ""}
                onClick={() => yard.setIrrigationMode(item)}
              >
                {item}
              </button>
            ))}
          </div>
        ) : null}
        <button
          className="primary-button"
          data-testid="confirm-irrigation"
          onClick={() => {
            yard.setIrrigationOn(!yard.irrigationOn);
            setIrrigationSheet(false);
            yard.notify(yard.irrigationOn ? "前院灌溉已停止" : `前院灌溉已启动 · ${yard.irrigationMode}`);
          }}
        >
          {yard.irrigationOn ? "确认停止" : "确认启动"}
        </button>
      </BottomSheet>
    </>
  );
}

function LightGroupCard({ group, flow }: { group: LightGroupDefinition; flow: FlowControls }) {
  const yard = useYard();
  const visualMode = useVisualMode();
  const status = lightGroupStatus(yard.activeYard, group);
  const stateLabel = status.state === "all-on" ? "全部开启" : status.state === "partial" ? `部分开启 · ${status.onCount}/${status.members.length}` : "全部关闭";
  return (
    <article className={`device-card light-group-card ${visualMode === "warm" ? "warm-light-group-card" : "night-light-group-card"}`} data-testid={`light-group-${group.id}`}>
      <button className="device-card-main" aria-label={`打开${group.name}详情`} onClick={() => flow.push(lightGroupDetailScreen(group.id))}>
        {visualMode === "warm" ? (
          <span className="device-thumb group-device-icon"><LightbulbFilament size={34} weight="duotone" /></span>
        ) : (
          <img className="device-thumb photo night-group-photo" src={publicAsset("assets/app/night-garden-hero-final.png")} alt={`${group.name}庭院灯光`} draggable={false} />
        )}
        <span className="device-copy">
          <span className="device-title-row"><span className="device-title">{group.name}</span><em>灯光组</em></span>
          <span className={`device-state ${status.state !== "all-off" ? "on" : "neutral"}`}><i />{stateLabel}</span>
          <span className="device-meta"><Users size={15} /> {status.members.length} 个灯光 · {status.onlineCount}/{status.members.length} 在线</span>
          <span className="device-meta"><Sun size={15} /> 亮度 {status.brightness}% · {status.effect}</span>
        </span>
      </button>
      <Switch
        label={`${group.name}组开关`}
        value={status.state !== "all-off"}
        onChange={(value) => {
          yard.setLightGroupOn(group.id, value);
          yard.notify(`${group.name}${value ? "开启" : "关闭"}指令已发送 · ${status.onlineCount}/${status.members.length} 台`);
        }}
      />
    </article>
  );
}

function lightGroupDetailScreen(groupId: string): FlowScreen {
  return detailScreen(`light-group-detail-${groupId}`, "灯光组", (flow) => <LightGroupDetail groupId={groupId} flow={flow} />);
}

function LightGroupDetail({ groupId, flow }: { groupId: string; flow: FlowControls }) {
  const yard = useYard();
  const visualMode = useVisualMode();
  const group = yard.activeYard.lightGroups.find((item) => item.id === groupId);
  if (!group) return <MobileScroll className="app-screen dark-screen"><main className="detail-page"><div className="empty-state-card"><strong>灯光组不存在</strong></div></main></MobileScroll>;
  const status = lightGroupStatus(yard.activeYard, group);
  const supportsColor = status.commonCapabilities.includes("color") || status.commonCapabilities.includes("temperature");
  const supportsEffects = status.commonCapabilities.includes("effects");
  const stateLabel = status.state === "all-on" ? "全部开启" : status.state === "partial" ? "部分设备开启" : "全部关闭";
  const colors = [
    { name: "暖白", value: "暖白 2700K", color: "#f6d59b" },
    { name: "夕阳", value: "珊瑚橙", color: "#f08a59" },
    { name: "花园绿", value: "花园绿", color: "#4f8a62" },
    { name: "月光", value: "月光蓝", color: "#6b8fcf" },
  ];
  return (
    <MobileScroll className={`app-screen dark-screen ${visualMode === "warm" ? "warm-screen" : ""}`}>
      <main className={`detail-page light-group-detail-page ${visualMode === "warm" ? "warm-light-group-detail" : "night-light-group-detail"}`}>
        <section className="light-group-hero">
          <span className="light-group-hero-icon"><LightbulbFilament size={42} weight="duotone" /></span>
          <div><small>{group.area} · {status.members.length} 个灯光</small><h1>{group.name}</h1><p><i className={status.state !== "all-off" ? "on" : ""} />{stateLabel} · {status.onlineCount}/{status.members.length} 在线</p></div>
          <button className={`light-group-power-button ${status.state !== "all-off" ? "active" : ""}`} aria-label={`${group.name}总开关`} onClick={() => { const next = status.state === "all-off"; yard.setLightGroupOn(group.id, next); yard.notify(`${group.name}${next ? "开启" : "关闭"}指令已发送 · ${status.onlineCount}/${status.members.length} 台`); }}><Power size={25} weight="bold" /></button>
        </section>

        <section className="content-section light-group-control-section">
          <div className="section-title"><span>统一亮度</span><strong>{status.brightness}%</strong></div>
          <input aria-label="灯光组亮度" className="light-group-range" type="range" min="1" max="100" value={status.brightness || 1} onChange={(event) => yard.setLightGroupBrightness(group.id, Number(event.target.value))} />
          <div className="light-group-range-labels"><span>柔和</span><span>明亮</span></div>
        </section>

        {supportsColor ? <section className="content-section light-group-control-section"><div className="section-title"><span>统一颜色</span><small>公共能力</small></div><div className="light-group-color-grid">{colors.map((color) => <button key={color.value} onClick={() => { yard.setLightGroupColor(group.id, color.value); yard.notify(`${group.name}颜色已调整为${color.name}`); }}><i style={{ background: color.color }} /><span>{color.name}</span></button>)}</div></section> : null}

        {supportsEffects ? <section className="content-section light-group-control-section"><div className="section-title"><span>同步效果</span><small>兼容设备同时播放</small></div><div className="preset-row light-group-effects">{["日落流光", "萤火微光", "节日律动", "静态暖白"].map((effect) => <button key={effect} className={status.effect === effect ? "selected" : ""} onClick={() => { yard.setLightGroupEffect(group.id, effect); yard.notify(`${group.name}已切换到${effect}`); }}>{effect}</button>)}</div></section> : <section className="capability-note"><ShieldCheck size={19} /><span><strong>已自动匹配公共能力</strong><small>部分成员不支持动态效果，因此仅显示开关、亮度与色温。</small></span></section>}

        <section className="content-section light-group-members-section"><div className="section-title"><span>组内灯光</span><small>{status.onlineCount}/{status.members.length} 在线</small></div><div className="light-group-member-list">{status.members.map((member) => <div key={member.id}><span className="member-light-icon"><LightbulbFilament size={22} weight="duotone" /></span><span><strong>{member.name}</strong><small>{member.area} · {member.model} · {member.online ? `${member.brightness}%` : "离线"}</small></span><Switch disabled={!member.online} label={`${member.name}开关`} value={member.on} onChange={(value) => yard.setLightDeviceOn(member.id, value)} /></div>)}</div></section>

        <div className="light-group-detail-actions"><button className="secondary-button" onClick={() => flow.push(sceneEditorScreen())}><Sparkle size={18} />用于新场景</button>{yard.permissions.manageYard ? <button className="primary-button" data-testid="edit-light-group" onClick={() => flow.push(lightGroupEditorScreen(group.id))}><Gear size={18} />编辑灯光组</button> : null}</div>
      </main>
    </MobileScroll>
  );
}

function lightDeviceDetailScreen(deviceId: string): FlowScreen {
  return {
    id: `light-device-${deviceId}`,
    headerHeight: 58,
    header: (flow) => <LightDeviceDetailHeader deviceId={deviceId} flow={flow} />,
    render: () => deviceId === "light" ? <LightDetail /> : <LightMemberDetail deviceId={deviceId} />,
  };
}

function LightDeviceDetailHeader({ deviceId, flow }: { deviceId: string; flow: FlowControls }) {
  const yard = useYard();
  const light = allLightingDevices(yard.activeYard).find((item) => item.id === deviceId);
  return <DetailHeader title={light?.name ?? "灯光设备"} flow={flow} onSettings={() => flow.push(lightDeviceSettingsScreen(deviceId))} />;
}

function lightDeviceSettingsScreen(deviceId: string): FlowScreen {
  return {
    id: `light-device-settings-${deviceId}`,
    headerHeight: 58,
    header: (flow) => <DetailHeader title="设备设置" flow={flow} showSettings={false} />,
    render: (flow) => <LightDeviceSettingsPage deviceId={deviceId} flow={flow} />,
  };
}

function LightDeviceSettingsPage({ deviceId, flow }: { deviceId: string; flow: FlowControls }) {
  const yard = useYard();
  const light = allLightingDevices(yard.activeYard).find((item) => item.id === deviceId);
  const [area, setArea] = useState(light?.area ?? "");
  const [error, setError] = useState("");
  const canEdit = yard.permissions.addDevices;

  if (!light) {
    return <MobileScroll className="app-screen dark-screen"><main className="detail-page light-device-settings-page" data-testid="light-device-settings"><div className="empty-state-card"><strong>设备不存在或已移除</strong><small>返回设备管理后刷新设备列表。</small></div><button className="secondary-button" onClick={() => flow.pop()}>返回</button></main></MobileScroll>;
  }

  const save = () => {
    setError("");
    if (!canEdit) return setError("当前账户只有查看权限");
    if (!yard.activeYard.areas.includes(area)) return setError("所选区域已不存在，请重新选择");
    if (!yard.updateLightDeviceArea(light.id, area)) return setError("设备区域保存失败，请返回后重试");
    yard.notify(`${light.name}所属区域已更新为${area}`);
    flow.pop();
  };

  return (
    <MobileScroll className="app-screen dark-screen">
      <main className="detail-page light-device-settings-page" data-testid="light-device-settings">
        <section className="light-device-settings-summary">
          <span className="physical-device-icon"><LightbulbFilament size={28} weight="duotone" /></span>
          <span><small>{light.model}</small><strong>{light.name}</strong><p><i className={light.online ? "on" : ""} />{light.online ? "Wi-Fi 在线" : "离线"} · 当前位于{light.area}</p></span>
        </section>

        <section className="content-section light-device-area-section">
          <div className="light-device-area-heading"><span><MapPin size={21} weight="duotone" /></span><div><h1>所属区域</h1><p>用于首页筛选、设备管理和灯光组成员信息。</p></div></div>
          <div className="choice-grid two-col light-device-area-grid">
            {yard.activeYard.areas.map((item) => <button key={item} className={area === item ? "selected" : ""} aria-pressed={area === item} disabled={!canEdit} onClick={() => { setArea(item); setError(""); }}>{item}{area === item ? <Check size={15} weight="bold" /> : null}</button>)}
          </div>
        </section>

        <section className="capability-note"><ShieldCheck size={19} /><span><strong>{canEdit ? "仅调整应用中的设备归属" : "当前账户只有查看权限"}</strong><small>{canEdit ? "设备离线时也可以修改，不会发送硬件控制指令。" : "庭院业主或具有设备管理权限的安装商可以修改。"}</small></span></section>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <button className="primary-button" data-testid="save-light-device-area" disabled={!canEdit || area === light.area} onClick={save}>保存设置</button>
      </main>
    </MobileScroll>
  );
}

function LightMemberDetail({ deviceId }: { deviceId: string }) {
  const yard = useYard();
  const light = allLightingDevices(yard.activeYard).find((item) => item.id === deviceId);
  if (!light) return <MobileScroll className="app-screen dark-screen"><main className="detail-page"><div className="empty-state-card"><strong>设备不存在</strong></div></main></MobileScroll>;
  const groups = yard.activeYard.lightGroups.filter((group) => group.memberIds.includes(light.id));
  return <MobileScroll className="app-screen dark-screen"><main className="detail-page light-member-detail-page"><section className="light-group-hero"><span className="light-group-hero-icon"><LightbulbFilament size={42} weight="duotone" /></span><div><small>{light.model} · {light.area}</small><h1>{light.name}</h1><p><i className={light.online ? "on" : ""} />{light.online ? "在线" : "离线"} · 亮度 {light.brightness}%</p></div><Switch disabled={!light.online} label={`${light.name}开关`} value={light.on} onChange={(value) => yard.setLightDeviceOn(light.id, value)} /></section><section className="content-section"><div className="section-title"><span>灯光组归属</span></div><div className="capability-chip-row">{groups.length ? groups.map((group) => <span key={group.id}><LightbulbFilament size={13} />{group.name}</span>) : <p>当前未加入任何灯光组</p>}</div></section><section className="capability-note"><ShieldCheck size={19} /><span><strong>组控不会取消独立控制</strong><small>你仍然可以单独开关该灯，灯光组会显示为“部分开启”。</small></span></section></main></MobileScroll>;
}

function lightGroupEditorScreen(groupId?: string): FlowScreen {
  return detailScreen(groupId ? `edit-light-group-${groupId}` : "create-light-group", groupId ? "编辑灯光组" : "新建灯光组", (flow) => <LightGroupEditor groupId={groupId} flow={flow} />);
}

function LightGroupEditor({ groupId, flow }: { groupId?: string; flow: FlowControls }) {
  const yard = useYard();
  const keyboard = useKeyboard();
  const visualMode = useVisualMode();
  const existing = groupId ? yard.activeYard.lightGroups.find((group) => group.id === groupId) : undefined;
  const lights = allLightingDevices(yard.activeYard);
  const [name, setName] = useState(existing?.name ?? "");
  const [selected, setSelected] = useState<string[]>(existing?.memberIds ?? []);
  const [area, setArea] = useState(existing?.area ?? "跨区域");
  const [visible, setVisible] = useState(existing?.visible ?? true);
  const [error, setError] = useState("");
  const draftStatus = lightGroupStatus(yard.activeYard, { id: "draft", name, area, memberIds: selected, visible });
  const capabilityLabels: Record<LightStripState["capabilities"][number], string> = { power: "开关", brightness: "亮度", color: "颜色", temperature: "色温", effects: "动态效果" };

  const toggleMember = (id: string) => {
    keyboard.hide();
    setError("");
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const save = () => {
    keyboard.hide();
    if (!name.trim()) return setError("请输入灯光组名称");
    if (selected.length < 2) return setError("请至少选择 2 个灯光设备");
    const input: LightGroupInput = { name: name.trim(), area, memberIds: selected, visible };
    if (groupId) yard.updateLightGroup(groupId, input);
    else yard.createLightGroup(input);
    yard.notify(groupId ? `“${name.trim()}”已更新` : `“${name.trim()}”灯光组已创建`);
    flow.pop();
  };

  return (
    <MobileScroll className={`app-screen dark-screen ${visualMode === "warm" ? "warm-screen" : ""}`}><main className={`detail-page light-group-editor-page ${visualMode === "warm" ? "warm-light-group-editor" : "night-light-group-editor"}`}>
      <section className="light-group-editor-intro"><span><LightbulbFilament size={28} weight="duotone" /></span><div><small>长期一起控制的灯光</small><h1>{existing ? "调整灯光组" : "创建灯光组"}</h1><p>只会开放所有成员共同支持的控制能力。</p></div></section>
      <div className="mobile-field"><span className="field-label-row"><label className="field-label" htmlFor="light-group-name">组名称</label>{keyboard.visible ? <button type="button" onClick={() => keyboard.hide()}>完成</button> : null}</span><KeyboardInput id="light-group-name" data-testid="light-group-name" value={name} placeholder="例如：全部路径灯" enterKeyHint="done" onChange={(event) => { setName(event.target.value); setError(""); }} onKeyDown={(event) => { if (event.key === "Enter") keyboard.hide(); }} /></div>

      <section className="content-section"><div className="section-title"><span>选择灯光</span><small>已选 {selected.length} 个</small></div><div className="light-member-select-list">{lights.map((light) => <button key={light.id} className={selected.includes(light.id) ? "selected" : ""} onClick={() => toggleMember(light.id)}><span className="member-light-icon"><LightbulbFilament size={23} weight="duotone" /></span><span><strong>{light.name}</strong><small>{light.area} · {light.model} · {light.online ? "在线" : "离线"}</small></span>{selected.includes(light.id) ? <Check size={18} weight="bold" /> : <Plus size={18} />}</button>)}</div></section>

      <section className="content-section"><div className="section-title"><span>显示区域</span></div><Carousel ariaLabel="灯光组区域" className="channel-area-carousel" contentClassName="channel-area-track">{["跨区域", ...yard.activeYard.areas].map((item) => <button key={item} className={area === item ? "selected" : ""} onClick={() => setArea(item)}>{item}</button>)}</Carousel></section>

      <section className="content-section group-capability-preview"><div className="section-title"><span>可用组控能力</span><small>自动取交集</small></div>{selected.length ? <div className="capability-chip-row">{draftStatus.commonCapabilities.map((capability) => <span key={capability}><Check size={13} weight="bold" />{capabilityLabels[capability]}</span>)}</div> : <p>选择灯光后显示共同支持的控制项。</p>}<div className="settings-list channel-toggle-list"><div><House size={20} /><span><strong>显示在设备首页</strong><small>作为一个灯光组卡片显示</small></span><Switch label="显示在设备首页" value={visible} onChange={setVisible} /></div></div></section>

      <section className="summary-box"><ShieldCheck size={20} /><p>{selected.length < 2 ? "至少选择两个灯光设备才能创建组。" : `将 ${draftStatus.members.map((light) => light.name).join("、")} 组合为“${name.trim() || "未命名灯光组"}”，支持 ${draftStatus.commonCapabilities.map((capability) => capabilityLabels[capability]).join("、")}。`}</p></section>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="primary-button" data-testid="save-light-group" onClick={save}>{groupId ? "保存修改" : "创建灯光组"}</button>
      {groupId ? <button className="secondary-button destructive-copy" onClick={() => { yard.deleteLightGroup(groupId); yard.notify("灯光组已删除，成员设备不受影响"); flow.pop(); flow.pop(); }}>删除灯光组</button> : null}
    </main></MobileScroll>
  );
}

function createYardScreen(): FlowScreen {
  return {
    id: "create-yard",
    headerHeight: 58,
    header: (flow) => <CreateYardHeader flow={flow} />,
    render: (flow) => <CreateYardFlow flow={flow} />,
  };
}

function CreateYardHeader({ flow }: { flow: FlowControls }) {
  const visualMode = useVisualMode();
  return (
    <div className={`detail-header ${visualMode === "warm" ? "warm-yard-create-header" : "night-yard-create-header"}`}>
      <button aria-label="返回" data-testid="detail-back" onClick={() => flow.pop()}><ArrowLeft size={22} /></button>
      <strong>新建庭院</strong>
      <span aria-hidden="true" />
    </div>
  );
}

type YardLocationOption = { country: string; city: string; timezone: string };

const yardLocations: YardLocationOption[] = [
  { country: "中国", city: "上海", timezone: "Asia/Shanghai" },
  { country: "中国", city: "苏州", timezone: "Asia/Shanghai" },
  { country: "中国", city: "杭州", timezone: "Asia/Shanghai" },
  { country: "日本", city: "东京", timezone: "Asia/Tokyo" },
  { country: "英国", city: "伦敦", timezone: "Europe/London" },
  { country: "美国", city: "纽约", timezone: "America/New_York" },
  { country: "澳大利亚", city: "悉尼", timezone: "Australia/Sydney" },
];

const yardTimezones = [...new Set(["UTC", ...yardLocations.map((item) => item.timezone)])];
const getSystemTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

const yardAreaOptions = ["前院", "后院", "露台", "泳池", "车库", "设备间"];

function CreateYardFlow({ flow }: { flow: FlowControls }) {
  const yard = useYard();
  const visualMode = useVisualMode();
  const keyboard = useKeyboard();
  const { bottomInset } = useKeyboardInsets();
  const [name, setName] = useState("");
  const [location, setLocation] = useState<YardLocationOption | null>(null);
  const [timezone, setTimezone] = useState(getSystemTimezone);
  const [timezoneSource, setTimezoneSource] = useState<"system" | "location" | "manual">("system");
  const [areas, setAreas] = useState<string[]>([]);
  const [picker, setPicker] = useState<"location" | "timezone" | "custom-area" | null>(null);
  const [search, setSearch] = useState("");
  const [customArea, setCustomArea] = useState("");
  const [errors, setErrors] = useState<{ name?: string; location?: string; timezone?: string; areas?: string }>({});
  const filteredLocations = yardLocations.filter((item) => `${item.country}${item.city}${item.timezone}`.toLowerCase().includes(search.trim().toLowerCase()));

  const chooseLocation = (nextLocation: YardLocationOption) => {
    setLocation(nextLocation);
    setTimezone(nextLocation.timezone);
    setTimezoneSource("location");
    setErrors((current) => ({ ...current, location: undefined, timezone: undefined }));
    setPicker(null);
    setSearch("");
  };

  const addCustomArea = () => {
    const normalized = customArea.trim();
    if (!normalized || areas.includes(normalized)) {
      setErrors((current) => ({ ...current, areas: normalized ? "区域名称已存在" : "请输入区域名称" }));
      return;
    }
    setAreas((current) => [...current, normalized]);
    setCustomArea("");
    setErrors((current) => ({ ...current, areas: undefined }));
    setPicker(null);
  };

  const finish = () => {
    keyboard.hide();
    const nextErrors = {
      name: name.trim() ? undefined : "请输入庭院名称",
      location: location ? undefined : "请选择所在地",
      timezone: timezone ? undefined : "请选择时区",
      areas: areas.length ? undefined : "请至少选择一个区域",
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean) || !location) return;
    yard.createYard({ name: name.trim(), city: location.city, timezone, areas });
    yard.notify(`“${name.trim()}”已创建`);
    flow.pop();
  };

  const themeClass = visualMode === "warm" ? "warm-yard-create-page" : "night-yard-create-page";
  const timezoneHint = timezoneSource === "manual" ? "已手动选择" : timezoneSource === "location" ? "已根据庭院所在地自动匹配" : "已从手机系统自动获取";
  return (
    <>
      <MobileScroll className="app-screen dark-screen">
        <main className={`detail-page yard-create-page yard-create-single-page ${themeClass}`} data-testid="create-yard-single-page">
          <div className="yard-create-intro"><small>新的庭院空间</small><h1>创建你的庭院</h1><p>基础信息与初始区域一次填写完成。</p></div>

          <section className="yard-create-form-card">
            <div className="mobile-field"><label className="field-label" htmlFor="create-yard-name">庭院名称</label><KeyboardInput id="create-yard-name" data-testid="create-yard-name" value={name} placeholder="例如：湖畔小院" enterKeyHint="done" onChange={(event) => { setName(event.target.value); setErrors((current) => ({ ...current, name: undefined })); }} /></div>
            {errors.name ? <p className="field-error" role="alert">{errors.name}</p> : null}
          </section>

          <section className="yard-create-form-card">
            <div className="section-title"><span>所在地与时间</span></div>
            <button className="yard-create-select-row" data-testid="create-yard-location-trigger" onClick={() => { keyboard.hide(); setPicker("location"); }}><MapPin size={19} /><span><small>所在地</small><strong>{location ? `${location.country} · ${location.city}` : "请选择国家或城市"}</strong></span><CaretDown size={17} /></button>
            {errors.location ? <p className="field-error" role="alert">{errors.location}</p> : null}
            <button className="yard-create-select-row" data-testid="create-yard-timezone-trigger" onClick={() => { keyboard.hide(); setPicker("timezone"); }}><Globe size={19} /><span><small>庭院时区 · {timezoneHint}</small><strong>{timezone}</strong></span><CaretDown size={17} /></button>
            {errors.timezone ? <p className="field-error" role="alert">{errors.timezone}</p> : null}
          </section>

          <section className="yard-create-form-card">
            <div className="section-title"><span>初始区域</span><small>至少选择 1 个</small></div>
            <div className="yard-create-area-grid">{[...yardAreaOptions, ...areas.filter((area) => !yardAreaOptions.includes(area))].map((area) => <button key={area} className={areas.includes(area) ? "selected" : ""} aria-pressed={areas.includes(area)} onClick={() => { setAreas((current) => current.includes(area) ? current.filter((item) => item !== area) : [...current, area]); setErrors((current) => ({ ...current, areas: undefined })); }}>{area}{areas.includes(area) ? <Check size={17} weight="bold" /> : <Plus size={17} />}</button>)}</div>
            <button className="yard-custom-area-button" onClick={() => { keyboard.hide(); setPicker("custom-area"); }}><Plus size={16} />自定义区域</button>
            {errors.areas ? <p className="field-error" role="alert">{errors.areas}</p> : null}
          </section>
        </main>
      </MobileScroll>

      <div className={`create-yard-fixed-footer ${visualMode}`} style={{ bottom: bottomInset }}><button className="primary-button" data-testid="finish-create-yard" onClick={finish}>创建庭院</button></div>

      <BottomSheet open={picker === "location"} onOpenChange={(open) => !open && setPicker(null)} title="选择所在地" description="选择后会自动匹配庭院所在地时区。" snap={0.62}>
        <div className="mobile-field yard-picker-search"><KeyboardInput value={search} placeholder="搜索国家、城市或时区" onChange={(event) => setSearch(event.target.value)} /></div>
        <div className="yard-picker-list">{filteredLocations.map((item) => <button key={`${item.country}-${item.city}`} aria-label={`${item.country} · ${item.city}`} onClick={() => chooseLocation(item)}><span><strong>{item.country} · {item.city}</strong><small>{item.timezone}</small></span>{location?.city === item.city ? <Check size={17} weight="bold" /> : <CaretRight size={17} />}</button>)}</div>
      </BottomSheet>

      <BottomSheet open={picker === "timezone"} onOpenChange={(open) => !open && setPicker(null)} title="选择时区" description="手动选择会覆盖自动匹配结果。" snap={0.54}>
        <div className="yard-picker-list">{yardTimezones.map((item) => <button key={item} onClick={() => { setTimezone(item); setTimezoneSource("manual"); setErrors((current) => ({ ...current, timezone: undefined })); setPicker(null); }}><strong>{item}</strong>{timezone === item ? <Check size={17} weight="bold" /> : null}</button>)}</div>
      </BottomSheet>

      <BottomSheet open={picker === "custom-area"} onOpenChange={(open) => !open && setPicker(null)} title="添加自定义区域" description="区域名称会用于设备筛选和归属。" snap={0.42}>
        <div className="mobile-field"><KeyboardInput value={customArea} placeholder="例如：屋顶花园" enterKeyHint="done" onChange={(event) => setCustomArea(event.target.value)} /></div>
        <button className="primary-button" onClick={addCustomArea}>添加区域</button>
      </BottomSheet>
    </>
  );
}

function joinYardScreen(): FlowScreen {
  return {
    id: "join-yard",
    headerHeight: 58,
    header: (flow) => <JoinYardHeader flow={flow} />,
    render: (flow) => <JoinYardFlow flow={flow} />,
  };
}

function JoinYardHeader({ flow }: { flow: FlowControls }) {
  const visualMode = useVisualMode();
  return (
    <div className={`detail-header ${visualMode === "warm" ? "warm-yard-create-header" : "night-yard-create-header"}`}>
      <button aria-label="返回" data-testid="detail-back" onClick={() => flow.pop()}><ArrowLeft size={22} /></button>
      <strong>加入庭院</strong>
      <span aria-hidden="true" />
    </div>
  );
}

type JoinYardViewProps = {
  code: string;
  preview: InvitePreview | null;
  error: string;
  onCodeChange: (value: string) => void;
  onLookup: () => void;
  onScan: () => void;
  onAccept: () => void;
  onBack: () => void;
};

function JoinYardFlow({ flow }: { flow: FlowControls }) {
  const yard = useYard();
  const visualMode = useVisualMode();
  const keyboard = useKeyboard();
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [error, setError] = useState("");

  const lookup = () => {
    keyboard.hide();
    const result = yard.lookupInvite(code);
    if (result.status === "ready") {
      setPreview(result.invite);
      setError("");
    } else {
      setPreview(null);
      setError(result.message);
    }
  };

  const accept = () => {
    if (!preview) return;
    keyboard.hide();
    yard.acceptInvite(preview);
    yard.notify(`已加入${preview.yardName}`);
    flow.pop();
  };

  const props: JoinYardViewProps = {
    code,
    preview,
    error,
    onCodeChange: (value) => { setCode(value); setError(""); setPreview(null); },
    onLookup: lookup,
    onScan: () => { setCode("GARDEN-NEW"); setError(""); setPreview(null); },
    onAccept: accept,
    onBack: () => { keyboard.hide(); flow.pop(); },
  };

  return visualMode === "warm" ? <WarmJoinYardView {...props} /> : <NightJoinYardView {...props} />;
}

function NightJoinYardView(props: JoinYardViewProps) {
  return (
    <MobileScroll className="app-screen dark-screen">
      <main className="detail-page yard-create-page night-yard-create-page join-yard-page">
        <div className="yard-create-intro"><small>连接一个已有庭院</small><h1>输入邀请码</h1><p>向庭院所有者索取邀请码，确认后即可加入。</p></div>
        <div className="mobile-field"><label className="field-label" htmlFor="join-yard-code">邀请码</label><KeyboardInput id="join-yard-code" data-testid="join-yard-code" value={props.code} placeholder="例如：GARDEN-NEW" enterKeyHint="done" onChange={(event) => props.onCodeChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") props.onLookup(); }} /></div>
        <div className="join-yard-actions"><button className="primary-button" data-testid="lookup-invite" onClick={props.onLookup}>查看邀请</button><button className="secondary-button" onClick={props.onScan}><QrCode size={18} />扫描二维码</button></div>
        {props.error ? <p className="form-error" role="alert">{props.error}</p> : null}
        {props.preview ? <InvitePreviewCard preview={props.preview} visual="night" onAccept={props.onAccept} /> : null}
        <button className="secondary-button" onClick={props.onBack}>返回</button>
      </main>
    </MobileScroll>
  );
}

function WarmJoinYardView(props: JoinYardViewProps) {
  return (
    <MobileScroll className="app-screen dark-screen">
      <main className="detail-page yard-create-page warm-yard-create-page join-yard-page">
        <div className="yard-create-intro"><small>加入一个庭院空间</small><h1>输入邀请码</h1><p>确认庭院、角色和授权期限后再加入。</p></div>
        <div className="mobile-field"><label className="field-label" htmlFor="join-yard-code">邀请码</label><KeyboardInput id="join-yard-code" data-testid="join-yard-code" value={props.code} placeholder="例如：GARDEN-NEW" enterKeyHint="done" onChange={(event) => props.onCodeChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") props.onLookup(); }} /></div>
        <div className="join-yard-actions"><button className="primary-button" data-testid="lookup-invite" onClick={props.onLookup}>查看邀请</button><button className="secondary-button" onClick={props.onScan}><QrCode size={18} />扫描二维码</button></div>
        {props.error ? <p className="form-error" role="alert">{props.error}</p> : null}
        {props.preview ? <InvitePreviewCard preview={props.preview} visual="warm" onAccept={props.onAccept} /> : null}
        <button className="secondary-button" onClick={props.onBack}>返回</button>
      </main>
    </MobileScroll>
  );
}

function InvitePreviewCard({ preview, visual, onAccept }: { preview: InvitePreview; visual: "night" | "warm"; onAccept: () => void }) {
  return (
    <section className={`${visual}-invite-preview`}>
      <div className="invite-preview-heading"><span><House size={22} /></span><div><small>邀请你加入</small><strong>{preview.yardName}</strong></div></div>
      <div className="invite-preview-grid"><div><span>邀请人</span><strong>{preview.inviter}</strong></div><div><span>角色</span><strong>{preview.roleLabel}</strong></div><div><span>所在地</span><strong>{preview.city}</strong></div><div><span>有效期</span><strong>{preview.validUntil.slice(0, 10)}</strong></div></div>
      <button className="primary-button" data-testid="accept-invite" onClick={onAccept}>确认加入</button>
    </section>
  );
}

function yardManagementScreen(): FlowScreen {
  return {
    id: "yard-management",
    headerHeight: 58,
    header: (flow) => <YardManagementHeader flow={flow} />,
    render: (flow) => <YardManagementPage flow={flow} />,
  };
}

function YardManagementHeader({ flow }: { flow: FlowControls }) {
  const visualMode = useVisualMode();
  return (
    <div className={`detail-header ${visualMode === "warm" ? "warm-yard-create-header" : "night-yard-create-header"}`}>
      <button aria-label="返回" data-testid="detail-back" onClick={() => flow.pop()}><ArrowLeft size={22} /></button>
      <strong>庭院管理</strong>
      <span aria-hidden="true" />
    </div>
  );
}

function YardManagementPage({ flow }: { flow: FlowControls }) {
  const yard = useYard();
  const visualMode = useVisualMode();
  const canManage = yard.permissions.manageYard;
  const [tab, setTab] = useState<"profile" | "areas" | "members">("areas");
  const logicalDevices = yardLogicalDevices(yard.activeYard);
  const assignedDevices = logicalDevices.filter((device) => device.area !== "未分区" && device.area !== "跨区域");
  const unassignedDevices = logicalDevices.filter((device) => device.area === "未分区");
  return (
    <MobileScroll className="app-screen dark-screen">
      <main className={`detail-page yard-management-page ${visualMode === "warm" ? "warm-yard-management-page" : "night-yard-management-page"}`} data-testid="yard-management">
        <section className="yard-management-hero"><small>{yard.activeYard.membership.roleLabel} · {yard.activeYard.profile.city}</small><h1>{yard.activeYard.profile.name}</h1><p>{yard.activeYard.profile.timezone}</p>{!canManage ? <span className="permission-note"><ShieldCheck size={17} />只读访问</span> : null}</section>
        <div className="yard-management-tabs" role="tablist">{([['profile', '资料'], ['areas', '区域'], ['members', '成员']] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>)}</div>

        {tab === "profile" ? <section className="yard-management-tab-panel" role="tabpanel">
          <div className="yard-management-profile-card"><span><House size={24} weight="duotone" /></span><div><small>庭院名称</small><strong>{yard.activeYard.profile.name}</strong><p>{yard.activeYard.profile.city} · {yard.activeYard.profile.timezone}</p></div></div>
          <div className="settings-list yard-management-inline-list"><button onClick={() => flow.push(yardProfileScreen())}><Globe size={21} /><span>庭院资料</span><strong>{canManage ? "编辑" : "查看"}</strong></button></div>
          {!canManage ? <button className="secondary-button" onClick={() => yard.notify("已提交退出庭院请求")}>退出庭院</button> : null}
        </section> : null}

        {tab === "areas" ? <section className="yard-management-tab-panel yard-management-areas-panel" role="tabpanel">
          <div className="yard-management-stats"><div><strong>{yard.activeYard.areas.length}</strong><small>区域</small></div><div><strong>{assignedDevices.length}</strong><small>已分区</small></div><div><strong>{unassignedDevices.length}</strong><small>未分区</small></div></div>
          <div className="section-title yard-management-section-title"><span>区域与设备</span>{canManage ? <button onClick={() => flow.push(areaManagementScreen())}><Plus size={15} />添加区域</button> : null}</div>
          <div className="yard-management-area-cards">{yard.activeYard.areas.map((area) => { const devices = logicalDevices.filter((device) => device.area === area); return <button key={area} data-testid={`yard-area-card-${area}`} onClick={() => flow.push(areaDetailScreen(area))}><span className="yard-area-card-icon"><MapPin size={20} weight="duotone" /></span><span><strong>{area}</strong><small>{devices.length ? `${devices.slice(0, 2).map((device) => device.name).join("、")}${devices.length > 2 ? ` 等 ${devices.length} 个设备` : ` · ${devices.length} 个设备`}` : "暂无设备"}</small></span><CaretRight size={17} /></button>; })}</div>
          <div className="section-title yard-management-section-title"><span>未分区设备</span><small>{unassignedDevices.length}</small></div>
          {unassignedDevices.length ? <div className="yard-unassigned-list">{unassignedDevices.map((device) => <button key={device.id} onClick={() => flow.push(logicalDeviceAreaScreen(device))}><span>{logicalDeviceIcon(device)}</span><span><strong>{device.name}</strong><small>{device.detail}</small></span><CaretRight size={16} /></button>)}</div> : <div className="yard-area-complete"><ShieldCheck size={20} weight="duotone" /><span><strong>所有设备均已完成分区</strong><small>新增设备后可在这里检查归属。</small></span></div>}
        </section> : null}

        {tab === "members" ? <section className="yard-management-tab-panel" role="tabpanel">
          <div className="yard-member-list yard-management-member-list">{yard.activeYard.members.map((member) => <div key={member.id}><span><UserCircle size={22} /><strong>{member.name}</strong></span><small>{member.roleLabel}{member.role === "installer" && member.expiresAt ? ` · ${isMembershipExpired({ role: member.role, roleLabel: member.roleLabel, expiresAt: member.expiresAt, authorizedDeviceIds: member.authorizedDeviceIds }) ? "已过期" : `有效至 ${member.expiresAt.slice(0, 10)}`}` : ""}</small></div>)}</div>
          {canManage ? <button className="secondary-button" onClick={() => flow.push(installerAuthorizationScreen())}><ShieldCheck size={18} />管理临时安装商权限</button> : null}
        </section> : null}
      </main>
    </MobileScroll>
  );
}

function logicalDeviceIcon(device: LogicalDeviceRef) {
  if (device.kind === "channel") return <SlidersHorizontal size={20} weight="duotone" />;
  if (device.kind === "group") return <LightbulbFilament size={20} weight="fill" />;
  return <LightbulbFilament size={20} weight="duotone" />;
}

function areaDetailScreen(area: string): FlowScreen {
  return detailScreen(`yard-area-${area}`, "区域详情", (flow) => <AreaDetailPage area={area} flow={flow} />);
}

function AreaDetailPage({ area, flow }: { area: string; flow: FlowControls }) {
  const yard = useYard();
  const canManage = yard.permissions.manageYard;
  const devices = yardLogicalDevices(yard.activeYard).filter((device) => device.area === area);
  const [name, setName] = useState(area);
  const [error, setError] = useState("");
  if (!yard.activeYard.areas.includes(area)) return <MobileScroll className="app-screen dark-screen"><main className="detail-page yard-subpage"><div className="empty-state-card"><strong>区域不存在或已删除</strong></div></main></MobileScroll>;
  return <MobileScroll className="app-screen dark-screen"><main className="detail-page yard-subpage yard-area-detail-page">
    <div className="yard-subpage-intro"><small>区域与设备</small><h1>{area}</h1><p>{devices.length ? `${devices.length} 个逻辑设备属于此区域。` : "当前区域还没有设备。"}</p></div>
    {canManage ? <section className="content-section yard-area-rename-card"><div className="mobile-field"><label className="field-label" htmlFor="rename-yard-area">区域名称</label><KeyboardInput id="rename-yard-area" value={name} onChange={(event) => { setName(event.target.value); setError(""); }} /></div><button className="secondary-button" disabled={name.trim() === area} onClick={() => { const normalized = name.trim(); if (!normalized) return setError("请输入区域名称"); if (!yard.renameYardArea(yard.activeYardId, area, normalized)) return setError("区域名称已存在"); yard.notify(`${area}已更名为${normalized}`); flow.pop(); }}>保存名称</button></section> : null}
    <div className="yard-area-device-list">{devices.length ? devices.map((device) => <button key={device.id} data-testid={`area-device-${device.id.replace(':', '-')}`} onClick={() => flow.push(logicalDeviceAreaScreen(device))}><span>{logicalDeviceIcon(device)}</span><span><strong>{device.name}</strong><small>{device.detail}</small></span>{canManage ? <em>移动</em> : <CaretRight size={16} />}</button>) : <div className="empty-state-card"><strong>暂无设备</strong><small>可从其他区域移动设备到这里。</small></div>}</div>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    {canManage ? <button className="secondary-button destructive-copy" aria-label={`删除${area}`} onClick={() => { const result = yard.removeYardArea(yard.activeYardId, area); if (result === "removed") { yard.notify(`${area}已删除`); flow.pop(); } else setError(result === "in-use" ? `${devices.length} 个设备仍在使用此区域，请先移动设备` : result === "last-area" ? "至少保留一个区域" : "区域删除失败"); }}>删除区域</button> : null}
  </main></MobileScroll>;
}

function logicalDeviceAreaScreen(device: LogicalDeviceRef): FlowScreen {
  return detailScreen(`logical-device-area-${device.id}`, "移动设备区域", (flow) => <LogicalDeviceAreaPage initialDevice={device} flow={flow} />);
}

function LogicalDeviceAreaPage({ initialDevice, flow }: { initialDevice: LogicalDeviceRef; flow: FlowControls }) {
  const yard = useYard();
  const current = yardLogicalDevices(yard.activeYard).find((device) => device.id === initialDevice.id);
  const [area, setArea] = useState(current?.area ?? "未分区");
  const [error, setError] = useState("");
  const canManage = yard.permissions.manageYard || (yard.activeYard.membership.role === "installer" && yard.activeYard.membership.authorizedDeviceIds.includes(initialDevice.kind === "channel" ? `channel-${initialDevice.sourceId}` : initialDevice.sourceId));
  if (!current) return <MobileScroll className="app-screen dark-screen"><main className="detail-page yard-subpage"><div className="empty-state-card"><strong>设备不存在或已移除</strong></div></main></MobileScroll>;
  const choices = current.kind === "group" ? ["跨区域", ...yard.activeYard.areas] : ["未分区", ...yard.activeYard.areas];
  const save = () => {
    if (!canManage) return setError("当前账户只有查看权限");
    if (current.kind === "light") yard.updateLightDeviceArea(current.sourceId, area);
    if (current.kind === "channel") yard.setControllerChannels((channels) => channels.map((channel) => channel.id === Number(current.sourceId) ? { ...channel, area } : channel));
    if (current.kind === "group") {
      const group = yard.activeYard.lightGroups.find((item) => item.id === current.sourceId);
      if (group) yard.updateLightGroup(group.id, { name: group.name, area, memberIds: group.memberIds, visible: group.visible });
    }
    yard.notify(`${current.name}已移动到${area}`);
    flow.pop();
  };
  return <MobileScroll className="app-screen dark-screen"><main className="detail-page yard-subpage logical-device-area-page"><div className="yard-subpage-intro"><small>{current.detail}</small><h1>{current.name}</h1><p>选择新的所属区域，设备离线时也可以修改。</p></div><div className="yard-device-area-grid">{choices.map((item) => <button key={item} className={area === item ? "selected" : ""} disabled={!canManage} onClick={() => setArea(item)}>{item}{area === item ? <Check size={16} weight="bold" /> : null}</button>)}</div>{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="primary-button" data-testid="save-logical-device-area" disabled={!canManage || area === current.area} onClick={save}>保存区域</button></main></MobileScroll>;
}

function yardProfileScreen(): FlowScreen {
  return detailScreen("yard-profile", "庭院资料", (flow) => <YardProfilePage flow={flow} />);
}

function YardProfilePage({ flow }: { flow: FlowControls }) {
  const yard = useYard();
  const keyboard = useKeyboard();
  const canManage = yard.permissions.manageYard;
  const [name, setName] = useState(yard.activeYard.profile.name);
  const [city, setCity] = useState(yard.activeYard.profile.city);
  const [timezone, setTimezone] = useState(yard.activeYard.profile.timezone);
  const [picker, setPicker] = useState<"location" | "timezone" | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const filteredLocations = yardLocations.filter((item) => `${item.country}${item.city}${item.timezone}`.toLowerCase().includes(search.trim().toLowerCase()));

  const save = () => {
    keyboard.hide();
    if (!name.trim() || !city.trim() || !timezone.trim()) {
      setError("请完整填写庭院资料");
      return;
    }
    yard.updateYardProfile(yard.activeYardId, { name: name.trim(), city: city.trim(), timezone: timezone.trim() });
    yard.notify("庭院资料已保存");
    flow.pop();
  };

  return (
    <>
    <MobileScroll className="app-screen dark-screen"><main className="detail-page yard-subpage">
      <div className="yard-subpage-intro"><small>当前庭院</small><h1>{yard.activeYard.profile.name}</h1><p>{canManage ? "名称、所在地和时区会影响整个庭院。" : "你拥有查看权限，修改由庭院所有者完成。"}</p></div>
      <div className="mobile-field"><label className="field-label" htmlFor="yard-profile-name">庭院名称</label><KeyboardInput id="yard-profile-name" data-testid="yard-profile-name" value={name} disabled={!canManage} onChange={(event) => setName(event.target.value)} /></div>
      <button className="yard-create-select-row yard-profile-select-row" data-testid="yard-profile-location-trigger" disabled={!canManage} onClick={() => { keyboard.hide(); setPicker("location"); }}><MapPin size={19} /><span><small>所在地</small><strong>{city}</strong></span><CaretDown size={17} /></button>
      <button className="yard-create-select-row yard-profile-select-row" data-testid="yard-profile-timezone-trigger" disabled={!canManage} onClick={() => { keyboard.hide(); setPicker("timezone"); }}><Globe size={19} /><span><small>庭院时区</small><strong>{timezone}</strong></span><CaretDown size={17} /></button>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {canManage ? <button className="primary-button" data-testid="save-yard-profile" onClick={save}>保存资料</button> : <div className="permission-note"><ShieldCheck size={17} />只读访问</div>}
    </main></MobileScroll>
    <BottomSheet open={picker === "location"} onOpenChange={(open) => !open && setPicker(null)} title="选择所在地" description="选择后自动匹配所在地时区。" snap={0.62}><div className="mobile-field yard-picker-search"><KeyboardInput value={search} placeholder="搜索国家、城市或时区" onChange={(event) => setSearch(event.target.value)} /></div><div className="yard-picker-list">{filteredLocations.map((item) => <button key={`${item.country}-${item.city}`} aria-label={`${item.country} · ${item.city}`} onClick={() => { setCity(item.city); setTimezone(item.timezone); setPicker(null); setSearch(""); }}><span><strong>{item.country} · {item.city}</strong><small>{item.timezone}</small></span>{city === item.city ? <Check size={17} weight="bold" /> : <CaretRight size={17} />}</button>)}</div></BottomSheet>
    <BottomSheet open={picker === "timezone"} onOpenChange={(open) => !open && setPicker(null)} title="选择时区" description="手动选择会覆盖所在地自动匹配结果。" snap={0.54}><div className="yard-picker-list">{yardTimezones.map((item) => <button key={item} onClick={() => { setTimezone(item); setPicker(null); }}><strong>{item}</strong>{timezone === item ? <Check size={17} weight="bold" /> : null}</button>)}</div></BottomSheet>
    </>
  );
}

function areaManagementScreen(): FlowScreen {
  return detailScreen("area-management", "添加区域", (flow) => <AreaManagementPage flow={flow} />);
}

function AreaManagementPage({ flow }: { flow: FlowControls }) {
  const yard = useYard();
  const canManage = yard.permissions.manageYard;
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  return (
    <MobileScroll className="app-screen dark-screen"><main className="detail-page yard-subpage">
      <div className="yard-subpage-intro"><small>区域与设备归属</small><h1>添加区域</h1><p>{canManage ? "创建后即可将灯光和干接点通道移动到此区域。" : "当前页面为只读。"}</p></div>
      {canManage ? <div className="mobile-field"><label className="field-label" htmlFor="new-yard-area">区域名称</label><KeyboardInput id="new-yard-area" value={name} placeholder="例如：屋顶花园" onChange={(event) => { setName(event.target.value); setError(""); }} /></div> : null}
      <div className="yard-area-management-list">{yard.activeYard.areas.map((area) => <div key={area}><span><MapPin size={18} /><strong>{area}</strong></span>{canManage ? <button aria-label={`删除${area}`} onClick={() => { const result = yard.removeYardArea(yard.activeYardId, area); setError(result === "in-use" ? `请先移动${area}中的设备` : result === "last-area" ? "至少保留一个区域" : "区域删除失败"); }}>删除</button> : <small>只读</small>}</div>)}</div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {canManage ? <button className="primary-button" onClick={() => { const normalized = name.trim(); if (!normalized) return setError("请输入区域名称"); if (!yard.addYardArea(yard.activeYardId, normalized)) return setError("区域名称已存在"); yard.notify(`${normalized}已添加`); flow.pop(); }}>添加区域</button> : null}
    </main></MobileScroll>
  );
}

function membersScreen(): FlowScreen {
  return detailScreen("yard-members", "家庭与成员", () => <MembersPage />);
}

function MembersPage() {
  const yard = useYard();
  return <MobileScroll className="app-screen dark-screen"><main className="detail-page yard-subpage"><div className="yard-subpage-intro"><small>庭院成员</small><h1>{yard.activeYard.members.length} 位成员</h1><p>每位成员的角色和可用权限都属于当前庭院。</p></div><div className="yard-member-list">{yard.activeYard.members.map((member) => <div key={member.id}><span><UserCircle size={22} /><strong>{member.name}</strong></span><small>{member.roleLabel}</small></div>)}</div></main></MobileScroll>;
}

function installerAuthorizationScreen(): FlowScreen {
  return detailScreen("installer-authorization", "临时安装商权限", () => <InstallerAuthorizationPage />);
}

function InstallerAuthorizationPage() {
  const yard = useYard();
  const canManage = yard.permissions.manageYard;
  const installers = yard.activeYard.members.filter((member) => member.role === "installer");
  const installer = installers[0];
  const authorized = installer?.authorizedDeviceIds ?? [];
  const deviceScopes = [
    { id: "controller", label: "DC12 控制器", detail: "控制器本体与连接状态" },
    { id: "channel-1", label: "CH1 · 庭院门", detail: "开关与点动控制" },
    { id: "channel-2", label: "CH2 · 水泵", detail: "开关与运行状态" },
    { id: "channel-3", label: "CH3 · 喷泉", detail: "开关与运行状态" },
    { id: "channel-4", label: "CH4 · 灌溉", detail: "开关与运行状态" },
  ];
  const [selectedDevices, setSelectedDevices] = useState<string[]>(authorized);
  const [duration, setDuration] = useState("30 天");
  const save = () => {
    if (!installer) return;
    const expiresAt = duration === "7 天" ? "2026-08-08T23:59:59+08:00" : duration === "90 天" ? "2026-10-31T23:59:59+08:00" : "2026-08-31T23:59:59+08:00";
    yard.updateInstallerAuthorization(yard.activeYardId, installer.id, selectedDevices, expiresAt);
    yard.notify("临时安装商授权已保存");
  };
  return (
    <MobileScroll className="app-screen dark-screen"><main className="detail-page yard-subpage installer-authorization-page">
      <div className="yard-subpage-intro"><small>设备安装与诊断</small><h1>临时安装商权限</h1><p>{canManage ? "选择安装商可查看和操作的设备范围。" : "当前页面为只读，授权由庭院所有者管理。"}</p></div>
      <div className="yard-member-list">{installer ? <div key={installer.id}><span><SlidersHorizontal size={22} /><strong>{installer.name}</strong></span><small>{installer.expiresAt ? <>有效至 <span>{installer.expiresAt.slice(0, 10)}</span></> : "无期限"}</small></div> : <div className="empty-state-card"><strong>暂无临时安装商</strong></div>}</div>
      {installer ? <>
        <section className="content-section flush-section installer-scope-section"><div className="section-title"><span>设备授权范围</span><small>{selectedDevices.length} 项已选择</small></div><div className="installer-scope-list">{deviceScopes.map((device) => <label key={device.id} className={selectedDevices.includes(device.id) ? "selected" : ""}><input type="checkbox" checked={selectedDevices.includes(device.id)} disabled={!canManage} onChange={() => setSelectedDevices((current) => current.includes(device.id) ? current.filter((id) => id !== device.id) : [...current, device.id])} /><span><strong>{device.label}</strong><small>{device.detail}</small></span><Check size={17} weight="bold" /></label>)}</div></section>
        <section className="content-section flush-section installer-duration-section"><div className="section-title"><span>授权期限</span></div><div className="choice-grid three-col">{["7 天", "30 天", "90 天"].map((item) => <button key={item} className={duration === item ? "selected" : ""} disabled={!canManage} onClick={() => setDuration(item)}>{item}</button>)}</div></section>
        {canManage ? <button className="primary-button" data-testid="save-installer-authorization" onClick={save}>保存授权</button> : <div className="permission-note"><ShieldCheck size={17} />只读访问</div>}
      </> : null}
    </main></MobileScroll>
  );
}

function addDeviceScreen(): FlowScreen {
  return {
    id: "add-device",
    headerHeight: 58,
    header: (flow) => <AddDeviceHeader flow={flow} />,
    render: (flow) => <AddDevicePage flow={flow} />,
  };
}

function AddDeviceHeader({ flow }: { flow: FlowControls }) {
  return (
    <div className="detail-header add-device-header">
      <button aria-label="返回" data-testid="detail-back" onClick={() => flow.pop()}><ArrowLeft size={22} /></button>
      <strong>添加设备</strong>
      <button className="header-action" aria-label="添加设备帮助">帮助</button>
    </div>
  );
}

function AddDevicePage({ flow }: { flow: FlowControls }) {
  const yard = useYard();
  const [category, setCategory] = useState("全部");
  const [discovering, setDiscovering] = useState(true);
  const [pairingDevice, setPairingDevice] = useState<string | null>(null);
  const categories = ["全部", "智能灯光", "控制器"];
  const devices = [
    { name: "露台灯带", model: "智能户外灯带 · LS200", category: "智能灯光", connection: "蓝牙", meta: "信号良好", icon: <LightbulbFilament size={29} weight="duotone" /> },
    { name: "12 路控制器", model: "干接点控制器 · DC12", category: "控制器", connection: "Wi-Fi + 蓝牙", meta: "设备尾号 8F2C", icon: <SlidersHorizontal size={29} weight="duotone" /> },
  ];
  const visibleDevices = category === "全部" ? devices : devices.filter((device) => device.category === category);

  return (
    <>
      <MobileScroll className="app-screen dark-screen">
        <main className="detail-page add-device-page">
          <section className="discovery-card">
            <span className="discovery-icon"><Bluetooth size={34} weight="duotone" /></span>
            <div>
              <small>自动发现</small>
              <strong>{discovering ? "正在搜索附近设备" : `已发现 ${devices.length} 台设备`}</strong>
              <p>请让设备通电，并进入待配网状态</p>
            </div>
            <button
              className={discovering ? "searching" : ""}
              onClick={() => {
                setDiscovering(!discovering);
                yard.notify(discovering ? `已发现 ${devices.length} 台设备` : "正在重新搜索附近设备");
              }}
            >
              {discovering ? "停止" : "重新搜索"}
            </button>
          </section>

          <section className="permission-note">
            <WifiHigh size={19} weight="duotone" />
            <span><strong>Wi-Fi 与蓝牙已开启</strong><small>添加期间请保持手机靠近设备</small></span>
            <Check size={17} weight="bold" />
          </section>

          <Carousel ariaLabel="设备分类" className="device-category-carousel" contentClassName="device-category-track">
            {categories.map((item) => (
              <button key={item} className={category === item ? "active" : ""} aria-pressed={category === item} onClick={() => setCategory(item)}>
                {item}
              </button>
            ))}
          </Carousel>

          <section className="add-device-section">
            <div className="section-title"><span>附近设备</span><small>{visibleDevices.length} 台可添加</small></div>
            <div className="nearby-device-list">
              {visibleDevices.map((device) => (
                <button key={device.name} className="nearby-device-card" onClick={() => setPairingDevice(device.name)}>
                  <span className="nearby-device-icon">{device.icon}</span>
                  <span className="nearby-device-copy">
                    <strong>{device.name}</strong>
                    <small>{device.model}</small>
                    <em><Bluetooth size={13} />{device.connection} · {device.meta}</em>
                  </span>
                  <span className="add-device-cta">添加</span>
                </button>
              ))}
            </div>
          </section>

          <section className="add-device-section">
            <div className="section-title"><span>其他添加方式</span></div>
            <div className="manual-add-grid">
              <button onClick={() => yard.notify("扫码添加已打开")}><QrCode size={27} weight="duotone" /><strong>扫描二维码</strong><small>扫描设备或包装标签</small></button>
              <button onClick={() => yard.notify("已进入按型号添加")}><ListChecks size={27} weight="duotone" /><strong>按型号添加</strong><small>从支持列表中选择</small></button>
              <button onClick={() => { setDiscovering(true); yard.notify("正在搜索蓝牙设备"); }}><Bluetooth size={27} weight="duotone" /><strong>蓝牙添加</strong><small>查找待配网设备</small></button>
            </div>
          </section>

          <section className="add-device-help">
            <ShieldCheck size={20} weight="duotone" />
            <p><strong>没有发现设备？</strong><br />确认设备已通电并处于配网模式，或尝试扫描设备二维码。</p>
          </section>
        </main>
      </MobileScroll>

      <BottomSheet
        open={Boolean(pairingDevice)}
        onOpenChange={(open) => !open && setPairingDevice(null)}
        title={`添加${pairingDevice ?? "设备"}`}
        description="开始前，请确认设备指示灯正在闪烁。"
        snap={0.5}
      >
        <div className="pairing-checklist">
          <div><Check size={17} weight="bold" /><span><strong>设备已通电</strong><small>保持设备在手机附近</small></span></div>
          <div><Bluetooth size={18} weight="duotone" /><span><strong>允许蓝牙发现</strong><small>用于识别并连接新设备</small></span></div>
          <div><WifiHigh size={18} weight="duotone" /><span><strong>准备 2.4 GHz Wi-Fi</strong><small>后续步骤将选择庭院网络</small></span></div>
        </div>
        <button className="primary-button" onClick={() => {
          const device = pairingDevice;
          setPairingDevice(null);
          yard.notify("设备连接成功 · 请继续完成配置");
          if (device === "12 路控制器") flow.push(controllerDetailScreen(true));
        }}>开始配网</button>
        <button className="secondary-button" onClick={() => setPairingDevice(null)}>取消</button>
      </BottomSheet>
    </>
  );
}

function Switch({ label, value, onChange, disabled = false }: { label: string; value: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={value}
      aria-disabled={disabled}
      disabled={disabled}
      className={`app-switch ${value ? "on" : ""}`}
      onClick={() => !disabled && onChange(!value)}
    >
      <span />
    </button>
  );
}

function DetailHeader({ title, flow, onSettings, showSettings = true }: { title: string; flow: FlowControls; onSettings?: () => void; showSettings?: boolean }) {
  const visualMode = useVisualMode();
  const trailing = showSettings ? <button aria-label="设置" onClick={onSettings}><Gear size={21} /></button> : <span aria-hidden="true" />;
  if (visualMode === "warm") {
    return (
      <div className="detail-header warm-detail-header">
        <button aria-label="返回" data-testid="detail-back" onClick={() => flow.pop()}><ArrowLeft size={22} /></button>
        <strong>{title}</strong>
        {trailing}
      </div>
    );
  }
  return (
      <div className="detail-header">
      <button aria-label="返回" data-testid="detail-back" onClick={() => flow.pop()}><ArrowLeft size={22} /></button>
      <strong>{title}</strong>
      {trailing}
    </div>
  );
}

function LightDetail() {
  const yard = useYard();
  const [mode, setMode] = useState("灯效");
  const modes = ["白光", "颜色", "灯效", "DIY"];
  const effects = ["日落流光", "篝火", "月光", "极光"];

  return (
    <MobileScroll className="app-screen dark-screen">
      <main className="detail-page light-detail-page">
        <section className="device-visual">
          <img src={publicAsset("assets/app/sunset-strip-thumbnail.png")} alt="露台灯带日落流光" draggable={false} />
          <div className="device-visual-copy">
            <span><WifiHigh size={15} /> 在线 · 云端</span>
            <strong>{yard.lightEffect}</strong>
            <small>{yard.activeYard.light.area} · 智能灯带</small>
          </div>
          <Switch label="灯带电源" value={yard.lightOn} onChange={yard.setLightOn} />
        </section>

        <section className="control-panel">
          <div className="panel-heading"><span><Sun size={19} />亮度</span><strong>{yard.brightness}%</strong></div>
          <input
            className="range-control"
            aria-label="灯带亮度"
            type="range"
            min="1"
            max="100"
            value={yard.brightness}
            onChange={(event) => yard.setBrightness(Number(event.target.value))}
          />
        </section>

        <div className="segment-tabs" role="tablist">
          {modes.map((item) => (
            <button key={item} role="tab" aria-selected={mode === item} onClick={() => setMode(item)}>{item}</button>
          ))}
        </div>

        {mode === "白光" ? <WhiteControls /> : null}
        {mode === "颜色" ? <ColorControls /> : null}
        {mode === "灯效" ? (
          <section className="content-section">
            <div className="section-title"><span>推荐灯效</span><button>查看全部</button></div>
            <div className="effect-grid">
              {effects.map((effect, index) => (
                <button
                  key={effect}
                  className={`effect-card effect-${index} ${yard.lightEffect === effect ? "selected" : ""}`}
                  onClick={() => {
                    yard.setLightEffect(effect);
                    yard.setLightOn(true);
                    yard.notify(`已应用灯效 · ${effect}`);
                  }}
                >
                  <span className="effect-orb"><Sparkle size={22} weight="duotone" /></span>
                  <strong>{effect}</strong>
                  <small>{index % 2 ? "柔和动态" : "流动渐变"}</small>
                  {yard.lightEffect === effect ? <Check size={17} weight="bold" /> : null}
                </button>
              ))}
            </div>
            <div className="speed-row"><span>速度</span><button>舒缓</button><button className="selected">适中</button><button>活跃</button></div>
          </section>
        ) : null}
        {mode === "DIY" ? <DiyControls /> : null}

        <section className="quick-links">
          <button><Timer size={20} /><span>临时定时<small>关闭倒计时</small></span></button>
          <button><SunHorizon size={20} /><span>加入场景<small>跨设备执行</small></span></button>
          <button><FlowArrow size={20} /><span>创建联动<small>设备触发规则</small></span></button>
        </section>
      </main>
    </MobileScroll>
  );
}

function WhiteControls() {
  const [temperature, setTemperature] = useState(48);
  return (
    <section className="content-section control-panel">
      <div className="section-title"><span>色温</span><strong>{Math.round(2200 + temperature * 43)} K</strong></div>
      <input className="range-control warm" aria-label="色温" type="range" min="0" max="100" value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} />
      <div className="preset-row"><button>烛光</button><button className="selected">暖白</button><button>自然光</button><button>冷白</button></div>
    </section>
  );
}

function ColorControls() {
  const yard = useYard();
  const colors = ["#f0b45a", "#ef746f", "#b16da7", "#77a7c7", "#8ca86d"];
  const [color, setColor] = useState(colors[0]);
  return (
    <section className="content-section">
      <div className="section-title"><span>常用颜色</span><button><Plus size={16} />收藏</button></div>
      <div className="color-row">
        {colors.map((item) => <button key={item} aria-label={`选择颜色 ${item}`} className={color === item ? "selected" : ""} style={{ backgroundColor: item }} onClick={() => { setColor(item); yard.notify("灯带颜色已更新"); }} />)}
      </div>
      <div className="control-panel"><div className="panel-heading"><span>饱和度</span><strong>82%</strong></div><input className="range-control" type="range" aria-label="饱和度" defaultValue="82" /></div>
    </section>
  );
}

function DiyControls() {
  const yard = useYard();
  return (
    <section className="content-section">
      <div className="section-title"><span>我的 DIY</span><button><Plus size={16} />新建</button></div>
      <button className="diy-card" onClick={() => yard.notify("DIY 编辑器已准备")}> 
        <span><MagicWand size={26} weight="duotone" /></span>
        <strong>沿墙流动</strong><small>琥珀 → 珊瑚 · 向右 · 循环</small>
      </button>
      <div className="settings-list">
        <button><Palette size={20} /><span>颜色与分段</span><strong>4 色</strong></button>
        <button><FlowArrow size={20} /><span>运动方式</span><strong>流动</strong></button>
        <button><SlidersHorizontal size={20} /><span>速度与方向</span><strong>适中 · 向右</strong></button>
      </div>
    </section>
  );
}

function FountainDetail({ flow }: { flow: FlowControls }) {
  const yard = useYard();
  const visualMode = useVisualMode();
  const [duration, setDuration] = useState("持续运行");
  return (
    <MobileScroll className="app-screen dark-screen">
      <main className="detail-page utility-detail">
        <section className="utility-status">
          <span className="utility-icon pictogram-shell"><img src={publicAsset(`assets/app/icons/${visualMode}/fountain.png`)} alt="后院喷泉图标" draggable={false} /></span>
          <small>后院 · Wi-Fi 在线</small>
          <strong>{yard.fountainOn ? "运行中" : "已关闭"}</strong>
          <p>{yard.fountainOn ? "已运行 18 分钟" : "上次运行：今天 19:30"}</p>
          <button className={yard.fountainOn ? "danger-button" : "primary-button"} onClick={() => { yard.setFountainOn(!yard.fountainOn); yard.notify(yard.fountainOn ? "后院喷泉已关闭" : `后院喷泉已启动 · ${duration}`); }}>
            {yard.fountainOn ? <><Stop size={19} />停止喷泉</> : <><Play size={19} />启动喷泉</>}
          </button>
        </section>
        <section className="content-section">
          <div className="section-title"><span>运行方式</span><small>不强制选择时长</small></div>
          <div className="choice-grid two-col">{["持续运行", "30 分钟", "60 分钟", "自定义"].map((item) => <button className={duration === item ? "selected" : ""} onClick={() => setDuration(item)} key={item}>{item}</button>)}</div>
        </section>
        <section className="content-section">
          <div className="section-title"><span>下一计划</span><button>查看全部</button></div>
          <div className="schedule-row"><Calendar size={22} /><span><strong>庭院晚间喷泉</strong><small>每天 19:30 · 运行 60 分钟</small></span><span className="status-tag">已启用</span></div>
        </section>
        <ChannelAssociation channel={2} flow={flow} />
        <LogRows items={["今天 19:30 · 自动化开启", "今天 18:48 · 王先生手动开启", "昨天 20:30 · 定时关闭"]} />
      </main>
    </MobileScroll>
  );
}

function GateDetail({ flow }: { flow: FlowControls }) {
  const yard = useYard();
  const visualMode = useVisualMode();
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <MobileScroll className="app-screen dark-screen">
        <main className="detail-page utility-detail">
          <section className="utility-status">
            <span className="utility-icon pictogram-shell"><img src={publicAsset(`assets/app/icons/${visualMode}/gate.png`)} alt="庭院门图标" draggable={false} /></span>
            <small>前院 · Wi-Fi 在线</small>
            <strong>{yard.gateOpen ? "已打开" : "已关闭"}</strong>
            <p>状态反馈正常 · 最后更新刚刚</p>
            <button className="primary-button" data-testid="gate-detail-action" onClick={() => setConfirm(true)}><Lock size={19} />{yard.gateOpen ? "关闭庭院门" : "打开庭院门"}</button>
          </section>
          <section className="content-section security-note"><ShieldCheck size={25} weight="duotone" /><span><strong>敏感设备保护已开启</strong><small>每次远程操作前均需确认，所有操作会记录。</small></span></section>
          <ChannelAssociation channel={1} flow={flow} />
          <section className="content-section"><div className="settings-list"><button><Bell size={20} /><span>长时间未关闭提醒</span><strong>10 分钟</strong></button><button><Clock size={20} /><span>夜间开启提醒</span><strong>已开启</strong></button><button><Users size={20} /><span>允许操作的成员</span><strong>2 人</strong></button></div></section>
          <LogRows items={["今天 18:12 · 业主打开", "今天 18:13 · 状态反馈：已关闭", "昨天 21:04 · 安装商测试"]} />
        </main>
      </MobileScroll>
      <BottomSheet open={confirm} onOpenChange={setConfirm} title={yard.gateOpen ? "确认关闭庭院门" : "确认打开庭院门"} description="请先确认门口环境安全。" snap={0.4}>
        <button className="primary-button" onClick={() => { yard.setGateOpen(!yard.gateOpen); setConfirm(false); yard.notify("庭院门指令已发送"); }}>长按确认</button>
        <button className="secondary-button" onClick={() => setConfirm(false)}>取消</button>
      </BottomSheet>
    </>
  );
}

function IrrigationDetail({ flow }: { flow: FlowControls }) {
  const yard = useYard();
  const visualMode = useVisualMode();
  const options = ["持续运行", "15 分钟", "30 分钟", "60 分钟"];
  return (
    <MobileScroll className="app-screen dark-screen">
      <main className="detail-page utility-detail">
        <section className="utility-status">
          <span className="utility-icon pictogram-shell"><img src={publicAsset(`assets/app/icons/${visualMode}/irrigation.png`)} alt="前院灌溉图标" draggable={false} /></span>
          <small>前院 · Wi-Fi 在线</small>
          <strong>{yard.irrigationOn ? "灌溉中" : "空闲"}</strong>
          <p>{yard.irrigationOn ? `${yard.irrigationMode} · 已运行 06:24` : "下一计划：明日 06:30"}</p>
          <button className={yard.irrigationOn ? "danger-button" : "primary-button"} onClick={() => { yard.setIrrigationOn(!yard.irrigationOn); yard.notify(yard.irrigationOn ? "前院灌溉已停止" : `前院灌溉已启动 · ${yard.irrigationMode}`); }}>
            {yard.irrigationOn ? <><Stop size={19} />停止灌溉</> : <><Play size={19} />启动灌溉</>}
          </button>
        </section>
        <section className="content-section">
          <div className="section-title"><span>本次运行</span><small>可不设置时长</small></div>
          <div className="choice-grid two-col">{options.map((item) => <button className={yard.irrigationMode === item ? "selected" : ""} onClick={() => yard.setIrrigationMode(item)} key={item}>{item}</button>)}</div>
          {yard.irrigationMode === "持续运行" ? <p className="inline-warning">将持续运行，直到手动停止；运行 60 分钟后提醒。</p> : null}
        </section>
        <section className="content-section"><div className="section-title"><span>今日运行</span><strong>24 分钟</strong></div><div className="progress-track"><span style={{ width: "38%" }} /></div><p className="muted-copy">今日计划 60 分钟 · 已完成 40%</p></section>
        <ChannelAssociation channel={3} flow={flow} />
        <LogRows items={["今天 06:30 · 定时运行 18 分钟", "昨天 18:10 · 手动运行 12 分钟", "昨天 06:30 · 定时运行 20 分钟"]} />
      </main>
    </MobileScroll>
  );
}

function genericChannelDetailScreen(channel: ControllerChannel): FlowScreen {
  return detailScreen(`channel-device-${channel.id}`, channel.name, (flow) => <GenericChannelDetail channelId={channel.id} flow={flow} />);
}

function GenericChannelDetail({ channelId, flow }: { channelId: number; flow: FlowControls }) {
  const yard = useYard();
  const channel = yard.controllerChannels.find((item) => item.id === channelId) ?? initialControllerChannels[channelId - 1];
  const [active, setActive] = useState(false);
  const [lastCommand, setLastCommand] = useState<"none" | "on" | "off" | "pulse">("none");
  const [confirm, setConfirm] = useState(false);
  const isPulse = channel.mode === "点动/脉冲";

  const execute = () => {
    if (isPulse) setLastCommand("pulse");
    else {
      setLastCommand(active ? "off" : "on");
      setActive((current) => !current);
    }
    setConfirm(false);
    yard.notify(`${channel.name}${isPulse ? "触发" : active ? "关闭" : "开启"}指令已发送`);
  };

  const requestExecute = () => {
    if (channel.sensitive) setConfirm(true);
    else execute();
  };

  return (
    <>
      <MobileScroll className="app-screen dark-screen">
        <main className="detail-page utility-detail">
          <section className="utility-status">
            <span className="utility-icon">{channelIcon(channel.type, 50)}</span>
            <small>{channel.area} · DC12 CH{channel.id} · Wi-Fi 在线</small>
            <strong>{lastCommand === "none" ? "待机" : lastCommand === "pulse" ? "触发指令已发送" : lastCommand === "on" ? "开启指令已发送" : "关闭指令已发送"}</strong>
            <p>{isPulse ? `点动/脉冲 ${channel.pulse} · 不推断设备最终状态` : "控制器未提供反馈输入，仅显示最后指令"}</p>
            <button className={active && !isPulse ? "danger-button" : "primary-button"} onClick={requestExecute}>
              {channel.sensitive ? <Lock size={19} /> : <Power size={19} />}
              {isPulse ? `触发${channel.name}` : active ? `关闭${channel.name}` : `开启${channel.name}`}
            </button>
          </section>

          <section className="content-section">
            <div className="section-title"><span>通道规则</span></div>
            <div className="settings-list">
              <button><SlidersHorizontal size={20} /><span>控制方式</span><strong>{channel.mode}{isPulse ? ` · ${channel.pulse}` : ""}</strong></button>
              <button><ShieldCheck size={20} /><span>接点逻辑</span><strong>{channel.polarity}</strong></button>
              <button><Timer size={20} /><span>运行超时提醒</span><strong>{isPulse ? "不适用" : channel.timeout}</strong></button>
              <button><FlowArrow size={20} /><span>场景与自动化</span><strong>{channel.automation ? "允许" : "不允许"}</strong></button>
            </div>
          </section>

          <ChannelAssociation channel={channel.id} flow={flow} />
          <LogRows items={["刚刚 · 通道在线", "今天 18:42 · 控制器状态同步", "昨天 21:10 · 通道配置更新"]} />
        </main>
      </MobileScroll>

      <BottomSheet open={confirm} onOpenChange={setConfirm} title={`确认操作${channel.name}`} description="这是敏感操作，请先确认设备周围环境安全。" snap={0.4}>
        <button className="primary-button" onClick={execute}>长按确认发送指令</button>
        <button className="secondary-button" onClick={() => setConfirm(false)}>取消</button>
      </BottomSheet>
    </>
  );
}

function ChannelAssociation({ channel, flow }: { channel: number; flow: FlowControls }) {
  return (
    <section className="content-section channel-association">
      <div className="section-title"><span>控制器通道</span><button onClick={() => flow.push(channelEditorScreen(channel))}>编辑</button></div>
      <button className="association-row" onClick={() => flow.push(controllerDetailScreen())}>
        <SlidersHorizontal size={23} weight="duotone" />
        <span><strong>12 路干接点控制器</strong><small>DC12 · CH{channel} · Wi-Fi 在线</small></span>
        <CaretDown size={17} />
      </button>
    </section>
  );
}

function LogRows({ items }: { items: string[] }) {
  return (
    <section className="content-section">
      <div className="section-title"><span>最近记录</span><button>全部日志</button></div>
      <div className="log-list">{items.map((item) => <div key={item}><Clock size={16} /><span>{item}</span></div>)}</div>
    </section>
  );
}

function ScenesHome({ flow }: { flow: FlowControls }) {
  const yard = useYard();
  const canRun = yard.permissions.runScenes;
  const canEdit = yard.permissions.editScenes;
  return (
    <MobileScroll className="app-screen dark-screen">
      <main className="root-page standard-page">
        <AppTopBar title="场景" subtitle={yard.activeYard.profile.name} action={canEdit ? { label: "新建场景", testId: "create-scene", onClick: () => flow.push(sceneEditorScreen()) } : undefined} />
        <section className="feature-banner scene-banner">
          <span><MagicWand size={28} weight="duotone" /></span>
          <div><small>常用场景</small><strong>让庭院进入理想状态</strong><p>灯光、水景和门控按顺序执行</p></div>
        </section>
        <section className="content-section flush-section">
          <div className="section-title"><span>我的场景</span><button>排序</button></div>
          <div className="scene-list">
            {yard.scenes.length ? yard.scenes.map((scene, index) => (
              <article key={scene.name} className="scene-card">
                <button className="scene-play" data-testid={scene.id === "dinner" ? "scene-run-dinner" : undefined} disabled={!canRun} onClick={() => canRun && (scene.id === "dinner" ? yard.runDinnerScene() : yard.notify(`“${scene.name}”已执行`))}>
                  <span className={`scene-icon scene-icon-${index % 3}`}>{scene.icon === "sparkle" ? <Sparkle size={25} /> : scene.icon === "sun" ? <SunHorizon size={25} /> : <Power size={25} />}</span>
                  <span><strong>{scene.name}</strong><small>{scene.detail}</small><em>{scene.id === "dinner" ? "上次执行：今天 19:32 · 成功" : "点击立即执行"}</em></span>
                  <Play size={19} weight="fill" />
                </button>
                {canEdit ? <button className="more-button" aria-label={`编辑${scene.name}`} onClick={() => flow.push(sceneEditorScreen(scene.name))}><DotsThree size={22} /></button> : null}
              </article>
            )) : <div className="empty-state-card"><Sparkle size={28} /><strong>还没有场景</strong><small>创建一个场景，让多个庭院设备一起行动。</small></div>}
          </div>
        </section>
        <section className="content-section flush-section">
          <div className="section-title"><span>最近执行</span><button>全部记录</button></div>
          <div className="execution-summary"><ShieldCheck size={22} weight="duotone" /><span><strong>花园晚宴</strong><small>4 项成功 · 今天 19:32</small></span><span className="status-tag">成功</span></div>
        </section>
      </main>
    </MobileScroll>
  );
}

function sceneEditorScreen(name = "新建场景"): FlowScreen {
  return {
    id: "scene-editor",
    headerHeight: 58,
    header: (flow) => <SceneEditorHeader title={name} flow={flow} />,
    render: (flow) => <SceneEditor flow={flow} existingName={name === "新建场景" ? "" : name} />,
  };
}

function SceneEditorHeader({ title, flow }: { title: string; flow: FlowControls }) {
  return (
    <div className="detail-header editor-header">
      <button aria-label="返回" data-testid="detail-back" onClick={() => flow.pop()}><ArrowLeft size={22} /></button>
      <strong>{title}</strong>
      <span aria-hidden="true" />
    </div>
  );
}

function SceneEditor({ flow, existingName }: { flow: FlowControls; existingName: string }) {
  const yard = useYard();
  const keyboard = useKeyboard();
  const [name, setName] = useState(existingName);
  const [selected, setSelected] = useState<string[]>(existingName ? ["light", "fountain"] : []);
  const [actions, setActions] = useState<Record<string, string>>({
    light: "开启 · 日落流光 68%",
    fountain: "运行 60 分钟",
    irrigation: "运行 30 分钟",
    gate: "发送打开指令",
  });
  const [editingDevice, setEditingDevice] = useState<string | null>(null);
  const [error, setError] = useState("");
  const fountainName = yard.controllerChannels.find((channel) => channel.id === 2)?.name ?? "后院喷泉";
  const irrigationName = yard.controllerChannels.find((channel) => channel.id === 3)?.name ?? "前院灌溉";
  const gateName = yard.controllerChannels.find((channel) => channel.id === 1)?.name ?? "庭院门";
  const groupDevices = yard.activeYard.lightGroups.map((group) => ({ id: group.id, name: group.name, icon: <LightbulbFilament size={22} weight="duotone" />, options: ["开启 · 暖白 60%", "开启 · 日落流光 68%", "关闭全部灯光"] }));
  const devices = [
    ...groupDevices,
    { id: "light", name: yard.activeYard.light.name, icon: <LightbulbFilament size={22} />, options: ["开启 · 日落流光 68%", "开启 · 暖白 40%", "关闭"] },
    { id: "fountain", name: fountainName, icon: <Waves size={22} />, options: ["开启 · 持续运行", "运行 30 分钟", "运行 60 分钟", "关闭"] },
    { id: "irrigation", name: irrigationName, icon: <Plant size={22} />, options: ["持续运行", "运行 15 分钟", "运行 30 分钟", "停止"] },
    { id: "gate", name: gateName, icon: <Door size={22} />, options: ["发送打开指令", "发送关闭指令"] },
  ];
  const selectedDevices = devices.filter((device) => selected.includes(device.id));
  const currentDevice = devices.find((device) => device.id === editingDevice);

  const toggle = (id: string) => {
    keyboard.hide();
    setError("");
    const device = devices.find((item) => item.id === id);
    if (device && !actions[id]) setActions((current) => ({ ...current, [id]: device.options[0] }));
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const saveScene = () => {
    keyboard.hide();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("请输入场景名称");
      return;
    }
    if (selectedDevices.length === 0) {
      setError("请至少选择一个设备");
      return;
    }

    const nextScene: SceneDefinition = {
      id: existingName ? yard.scenes.find((scene) => scene.name === existingName)?.id ?? `scene-${Date.now()}` : `scene-${Date.now()}`,
      name: trimmedName,
      detail: `${selectedDevices.map((device) => device.name).join("、")} · ${selectedDevices.length} 个动作`,
      icon: "sparkle",
    };
    yard.setScenes((current) => existingName ? current.map((scene) => scene.name === existingName ? nextScene : scene) : [nextScene, ...current]);
    yard.notify(existingName ? `“${trimmedName}”已更新` : `“${trimmedName}”场景已创建`);
    flow.pop();
  };

  const summary = selectedDevices.length
    ? `执行“${name.trim() || "未命名场景"}”时，${selectedDevices.map((device) => `${device.name}：${actions[device.id] ?? device.options[0]}`).join("；")}。`
    : "选择设备后，这里会生成场景执行摘要。";

  return (
    <>
      <MobileScroll className="app-screen dark-screen">
        <main className="detail-page editor-page scene-editor-page" onPointerDown={(event) => { if (event.target === event.currentTarget) keyboard.hide(); }}>
          <div className="mobile-field">
            <span className="field-label-row"><label className="field-label" htmlFor="scene-name">场景名称</label>{keyboard.visible ? <button type="button" onClick={() => keyboard.hide()}>完成</button> : null}</span>
            <KeyboardInput id="scene-name" data-testid="scene-name" value={name} placeholder="例如：花园晚宴" enterKeyHint="done" onChange={(event) => { setName(event.target.value); setError(""); }} onKeyDown={(event) => { if (event.key === "Enter") keyboard.hide(); }} />
          </div>

          <section className="content-section"><div className="section-title"><span>选择设备</span><small>已选 {selected.length} 个</small></div><div className="select-list">{devices.map((device) => <button key={device.id} className={selected.includes(device.id) ? "selected" : ""} onClick={() => toggle(device.id)}><span>{device.icon}{device.name}</span>{selected.includes(device.id) ? <Check size={18} weight="bold" /> : <Plus size={18} />}</button>)}</div></section>

          <section className="content-section">
            <div className="section-title"><span>设备动作</span><small>{selectedDevices.length ? "点击修改" : "请先选择设备"}</small></div>
            {selectedDevices.length ? <div className="step-list">{selectedDevices.map((device, index) => <button key={device.id} onClick={() => { keyboard.hide(); setEditingDevice(device.id); }}><em>{index + 1}</em><span><strong>{device.name}</strong><small>{actions[device.id] ?? device.options[0]}</small></span><CaretDown size={18} /></button>)}</div> : <p className="empty-step-copy">选择设备后，为每个设备设置要执行的动作。</p>}
          </section>

          <section className="summary-box"><Sparkle size={20} /><p>{summary}</p></section>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button className="secondary-button" onClick={() => { keyboard.hide(); if (!selectedDevices.length) setError("请至少选择一个设备"); else yard.notify(`场景测试完成 · ${selectedDevices.length} 项成功`); }}><Play size={18} />测试场景</button>
          <button className="primary-button" data-testid="save-scene" onClick={saveScene}>{existingName ? "保存修改" : "创建场景"}</button>
        </main>
      </MobileScroll>

      <BottomSheet open={Boolean(editingDevice)} onOpenChange={(open) => !open && setEditingDevice(null)} title={currentDevice ? `设置${currentDevice.name}动作` : "设置设备动作"} description="该动作会在场景执行时立即发送。" snap={0.5}>
        <div className="choice-grid two-col">
          {currentDevice?.options.map((option) => <button key={option} className={(actions[currentDevice.id] ?? currentDevice.options[0]) === option ? "selected" : ""} onClick={() => { setActions((current) => ({ ...current, [currentDevice.id]: option })); setEditingDevice(null); }}>{option}</button>)}
        </div>
        <button className="secondary-button" onClick={() => setEditingDevice(null)}>取消</button>
      </BottomSheet>
    </>
  );
}

function AutomationHome({ flow }: { flow: FlowControls }) {
  const yard = useYard();
  const canEdit = yard.permissions.editAutomations;
  const [tab, setTab] = useState<AutomationTab>("schedule");
  const rules = tab === "schedule"
    ? yard.schedules.map((schedule) => ({
        name: schedule.name,
        summary: `${schedule.repeat}${schedule.timeValue}，${schedule.deviceName}${schedule.action}`,
        meta: schedule.enabled ? `下次：${schedule.timeType === "指定时间" ? `今天 ${schedule.timeValue}` : "今天预计 19:04"}` : "已停用",
        enabled: schedule.enabled,
      }))
    : yard.linkages.map((linkage) => ({
        name: linkage.name,
        summary: `当${linkage.triggers.map((trigger) => `${trigger.deviceName}${trigger.event}`).join("，或当")}${linkage.condition ? `，并且${linkage.condition}` : ""}，就${linkage.actions.map((action) => `${action.deviceName}${action.action}`).join("，然后")}`,
        meta: linkage.enabled ? "规则已启用 · 等待触发" : "已停用",
        enabled: linkage.enabled,
      }));
  return (
    <MobileScroll className="app-screen dark-screen">
      <main className="root-page standard-page">
        <AppTopBar title="自动化" subtitle={yard.activeYard.profile.name} action={canEdit ? { label: `新建${tab === "schedule" ? "定时" : "联动"}`, testId: tab === "schedule" ? "create-schedule" : "create-linkage", onClick: () => flow.push(tab === "schedule" ? scheduleEditorScreen() : linkageEditorScreen()) } : undefined} />
        <div className="automation-tabs" role="tablist"><button aria-selected={tab === "schedule"} onClick={() => setTab("schedule")}>定时</button><button aria-selected={tab === "linkage"} onClick={() => setTab("linkage")}>联动</button></div>
        <section className="automation-status"><ShieldCheck size={23} weight="duotone" /><span><strong>{tab === "schedule" ? `${yard.schedules.filter((schedule) => schedule.enabled).length} 个定时正常运行` : `${yard.linkages.filter((linkage) => linkage.enabled).length} 个联动正常运行`}</strong><small>过去 24 小时没有执行失败</small></span><button>执行记录</button></section>
        <section className="rule-list">
          {rules.length ? rules.map((rule) => <AutomationRuleCard key={rule.name} rule={rule} type={tab} defaultEnabled={rule.enabled} flow={flow} readOnly={!canEdit} onEnabledChange={tab === "schedule" ? (enabled) => yard.setSchedules((current) => current.map((schedule) => schedule.name === rule.name ? { ...schedule, enabled } : schedule)) : (enabled) => yard.setLinkages((current) => current.map((linkage) => linkage.name === rule.name ? { ...linkage, enabled } : linkage))} />) : <div className="empty-state-card"><Timer size={28} /><strong>{tab === "schedule" ? "还没有定时" : "还没有联动"}</strong><small>{canEdit ? "创建第一条自动化规则。" : "当前庭院还没有可查看的规则。"}</small></div>}
        </section>
      </main>
    </MobileScroll>
  );
}

function AutomationRuleCard({ rule, type, defaultEnabled, flow, readOnly = false, onEnabledChange }: { rule: { name: string; summary: string; meta: string }; type: AutomationTab; defaultEnabled: boolean; flow: FlowControls; readOnly?: boolean; onEnabledChange?: (enabled: boolean) => void }) {
  const [enabled, setEnabled] = useState(defaultEnabled);
  return (
    <article className="rule-card">
      <span className="rule-icon">{type === "schedule" ? <Calendar size={24} /> : <FlowArrow size={24} />}</span>
      <button className="rule-main" disabled={readOnly} onClick={() => !readOnly && flow.push(type === "schedule" ? scheduleEditorScreen(rule.name) : linkageEditorScreen(rule.name))}>
        <strong>{rule.name}</strong><p>{rule.summary}</p><small>{rule.meta}</small>
      </button>
      <Switch disabled={readOnly} label={`${rule.name}启用状态`} value={enabled} onChange={(value) => { setEnabled(value); onEnabledChange?.(value); }} />
    </article>
  );
}

function scheduleEditorScreen(name = "新建定时"): FlowScreen {
  return detailScreen("schedule-editor", name, (flow) => <ScheduleEditor flow={flow} existingName={name === "新建定时" ? "" : name} />);
}

function ScheduleEditor({ flow, existingName }: { flow: FlowControls; existingName: string }) {
  const yard = useYard();
  const keyboard = useKeyboard();
  const existing = yard.schedules.find((schedule) => schedule.name === existingName);
  const [name, setName] = useState(existing?.name ?? "");
  const [timeType, setTimeType] = useState<ScheduleDefinition["timeType"]>(existing?.timeType ?? "日落");
  const [timeValue, setTimeValue] = useState(existing?.timeValue ?? "日落后 15 分钟");
  const [repeat, setRepeat] = useState(existing?.repeat.startsWith("每周") ? "自定义" : existing?.repeat ?? "每天");
  const [selectedDays, setSelectedDays] = useState(existing?.repeat.startsWith("每周") ? existing.repeat.replace("每周", "").split("、") : ["一", "二", "三", "四", "五"]);
  const [deviceId, setDeviceId] = useState<ScheduleDefinition["deviceId"]>(existing?.deviceId ?? "light");
  const [action, setAction] = useState(existing?.action ?? "开启 · 暖白 60%");
  const [sheet, setSheet] = useState<"time" | "device" | "action" | null>(null);
  const [error, setError] = useState("");
  const fountainName = yard.controllerChannels.find((channel) => channel.id === 2)?.name ?? "后院喷泉";
  const irrigationName = yard.controllerChannels.find((channel) => channel.id === 3)?.name ?? "前院灌溉";
  const gateName = yard.controllerChannels.find((channel) => channel.id === 1)?.name ?? "庭院门";
  const groupDevices: Array<{ id: string; name: string; icon: ReactNode; actions: string[] }> = yard.activeYard.lightGroups.map((group) => ({ id: group.id, name: group.name, icon: <LightbulbFilament size={21} weight="duotone" />, actions: ["开启 · 暖白 60%", "开启 · 日落流光 68%", "关闭全部灯光"] }));
  const devices: Array<{ id: ScheduleDefinition["deviceId"]; name: string; icon: ReactNode; actions: string[] }> = [
    ...groupDevices,
    { id: "light", name: yard.activeYard.light.name, icon: <Path size={21} />, actions: ["开启 · 暖白 60%", "开启 · 日落流光 68%", "关闭"] },
    { id: "fountain", name: fountainName, icon: <Waves size={21} />, actions: ["开启 · 持续运行", "运行 30 分钟", "运行 60 分钟", "关闭"] },
    { id: "irrigation", name: irrigationName, icon: <Plant size={21} />, actions: ["持续运行", "运行 15 分钟", "运行 30 分钟", "停止"] },
    { id: "gate", name: gateName, icon: <Door size={21} />, actions: ["发送打开指令", "发送关闭指令"] },
  ];
  const selectedDevice = devices.find((device) => device.id === deviceId) ?? devices[0];
  const timeOptions = timeType === "指定时间"
    ? ["06:30", "18:00", "19:30", "22:00"]
    : timeType === "日落"
      ? ["日落前 15 分钟", "日落时", "日落后 15 分钟", "日落后 30 分钟"]
      : ["日出前 15 分钟", "日出时", "日出后 15 分钟", "日出后 30 分钟"];
  const repeatLabel = repeat === "自定义" ? `每周${selectedDays.join("、")}` : repeat;
  const summary = `${repeatLabel}${timeValue}，让${selectedDevice.name}${action}。`;

  const changeTimeType = (nextType: ScheduleDefinition["timeType"]) => {
    keyboard.hide();
    setTimeType(nextType);
    setTimeValue(nextType === "指定时间" ? "19:30" : nextType === "日落" ? "日落后 15 分钟" : "日出时");
  };

  const saveSchedule = () => {
    keyboard.hide();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("请输入定时名称");
      return;
    }
    if (repeat === "自定义" && selectedDays.length === 0) {
      setError("请至少选择一个重复日期");
      return;
    }

    const nextSchedule: ScheduleDefinition = {
      id: existing?.id ?? `schedule-${Date.now()}`,
      name: trimmedName,
      timeType,
      timeValue,
      repeat: repeatLabel,
      deviceId,
      deviceName: selectedDevice.name,
      action,
      enabled: existing?.enabled ?? true,
    };
    yard.setSchedules((current) => existingName ? current.map((schedule) => schedule.name === existingName ? nextSchedule : schedule) : [nextSchedule, ...current]);
    yard.notify(existingName ? `“${trimmedName}”已更新` : `“${trimmedName}”定时已创建并启用`);
    flow.pop();
  };

  return (
    <>
      <MobileScroll className="app-screen dark-screen"><main className="detail-page editor-page schedule-editor-page" onPointerDown={(event) => { if (event.target === event.currentTarget) keyboard.hide(); }}>
        <div className="mobile-field">
          <span className="field-label-row"><label className="field-label" htmlFor="schedule-name">定时名称</label>{keyboard.visible ? <button type="button" onClick={() => keyboard.hide()}>完成</button> : null}</span>
          <KeyboardInput id="schedule-name" data-testid="schedule-name" value={name} placeholder="例如：日落路径灯" enterKeyHint="done" onChange={(event) => { setName(event.target.value); setError(""); }} onKeyDown={(event) => { if (event.key === "Enter") keyboard.hide(); }} />
        </div>

        <section className="content-section"><div className="section-title"><span>执行时间</span><small>庭院时区 GMT+8</small></div><div className="choice-grid three-col">{(["指定时间", "日落", "日出"] as ScheduleDefinition["timeType"][]).map((item) => <button key={item} className={timeType === item ? "selected" : ""} onClick={() => changeTimeType(item)}>{item}</button>)}</div><button className="value-row" onClick={() => { keyboard.hide(); setSheet("time"); }}><SunHorizon size={21} /><span><strong>{timeValue}</strong><small>{timeType === "指定时间" ? "按庭院当地时间执行" : "今天预计 19:04 执行"}</small></span><CaretDown size={18} /></button></section>

        <section className="content-section"><div className="section-title"><span>重复</span></div><div className="preset-row">{["一次", "每天", "工作日", "自定义"].map((item) => <button key={item} className={repeat === item ? "selected" : ""} onClick={() => { keyboard.hide(); setRepeat(item); setError(""); }}>{item}</button>)}</div>{repeat === "自定义" ? <div className="weekday-grid">{["一", "二", "三", "四", "五", "六", "日"].map((day) => <button key={day} className={selectedDays.includes(day) ? "selected" : ""} onClick={() => setSelectedDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day])}>{day}</button>)}</div> : null}</section>

        <section className="content-section"><div className="section-title"><span>执行动作</span><small>1 个设备</small></div><button className="value-row" onClick={() => { keyboard.hide(); setSheet("device"); }}>{selectedDevice.icon}<span><strong>{selectedDevice.name}</strong><small>点击更换设备</small></span><CaretDown size={18} /></button><button className="value-row compact-value-row" onClick={() => { keyboard.hide(); setSheet("action"); }}><SlidersHorizontal size={21} /><span><strong>{action}</strong><small>{deviceId === "gate" ? "敏感操作将在执行前遵循安全规则" : "点击修改设备动作"}</small></span><CaretDown size={18} /></button></section>

        <section className="summary-box"><Calendar size={20} /><p>{summary}</p></section>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <button className="secondary-button" onClick={() => { keyboard.hide(); yard.notify(`定时测试成功 · ${selectedDevice.name}${action}`); }}>测试动作</button>
        <button className="primary-button" data-testid="save-schedule" onClick={saveSchedule}>{existingName ? "保存修改" : "保存并启用"}</button>
      </main></MobileScroll>

      <BottomSheet open={Boolean(sheet)} onOpenChange={(open) => !open && setSheet(null)} title={sheet === "time" ? "选择执行时间" : sheet === "device" ? "选择目标设备" : `设置${selectedDevice.name}动作`} description={sheet === "time" ? "时间使用当前庭院的时区。" : sheet === "device" ? "首版每条定时控制一个设备。" : "定时触发时将发送此动作。"} snap={0.5}>
        <div className="choice-grid two-col">
          {sheet === "time" ? timeOptions.map((option) => <button key={option} className={timeValue === option ? "selected" : ""} onClick={() => { setTimeValue(option); setSheet(null); }}>{option}</button>) : null}
          {sheet === "device" ? devices.map((device) => <button key={device.id} className={deviceId === device.id ? "selected" : ""} onClick={() => { setDeviceId(device.id); setAction(device.actions[0]); setSheet("action"); }}>{device.name}</button>) : null}
          {sheet === "action" ? selectedDevice.actions.map((option) => <button key={option} className={action === option ? "selected" : ""} onClick={() => { setAction(option); setSheet(null); }}>{option}</button>) : null}
        </div>
        <button className="secondary-button" onClick={() => setSheet(null)}>取消</button>
      </BottomSheet>
    </>
  );
}

function linkageEditorScreen(name = "新建联动"): FlowScreen {
  return detailScreen("linkage-editor", name, (flow) => <LinkageEditor flow={flow} existingName={name === "新建联动" ? "" : name} />);
}

type LinkageSheet = { kind: "trigger-device" | "trigger-event" | "condition" | "action-device" | "action-value"; index: number };

function LinkageEditor({ flow, existingName }: { flow: FlowControls; existingName: string }) {
  const yard = useYard();
  const keyboard = useKeyboard();
  const existing = yard.linkages.find((linkage) => linkage.name === existingName);
  const [name, setName] = useState(existing?.name ?? "");
  const [triggers, setTriggers] = useState<LinkageTrigger[]>(existing?.triggers ?? [{ deviceId: "gate", deviceName: "庭院门", event: "打开" }]);
  const [includeCondition, setIncludeCondition] = useState(existing ? Boolean(existing.condition) : true);
  const [condition, setCondition] = useState(existing?.condition ?? "日落至 23:00");
  const [actions, setActions] = useState<LinkageAction[]>(existing?.actions ?? [{ deviceId: "light", deviceName: "路径灯", action: "暖白 60% · 5 分钟后关闭" }]);
  const [sheet, setSheet] = useState<LinkageSheet | null>(null);
  const [error, setError] = useState("");
  const fountainName = yard.controllerChannels.find((channel) => channel.id === 2)?.name ?? "后院喷泉";
  const irrigationName = yard.controllerChannels.find((channel) => channel.id === 3)?.name ?? "前院灌溉";
  const gateName = yard.controllerChannels.find((channel) => channel.id === 1)?.name ?? "庭院门";
  const groupDevices = yard.activeYard.lightGroups.map((group) => ({ id: group.id, name: group.name, icon: <LightbulbFilament size={23} weight="duotone" />, events: ["全部开启", "全部关闭", "部分设备开启"], actions: ["开启 · 暖白 60%", "开启 · 日落流光 68%", "关闭全部灯光"] }));
  const devices = [
    { id: "gate", name: gateName, icon: <Door size={23} />, events: ["打开", "关闭"], actions: ["发送打开指令", "发送关闭指令"] },
    ...groupDevices,
    { id: "light", name: yard.activeYard.light.name, icon: <LightbulbFilament size={23} />, events: ["开启", "关闭", "离线"], actions: ["暖白 60% · 5 分钟后关闭", "开启 · 日落流光 68%", "关闭"] },
    { id: "fountain", name: fountainName, icon: <Waves size={23} />, events: ["开启", "关闭", "持续运行 30 分钟"], actions: ["开启 · 持续运行", "运行 30 分钟", "关闭"] },
    { id: "irrigation", name: irrigationName, icon: <Plant size={23} />, events: ["开始运行", "停止", "运行结束"], actions: ["持续运行", "运行 15 分钟", "停止"] },
    { id: "pump", name: "水泵", icon: <Drop size={23} />, events: ["开启", "关闭", "持续运行 60 分钟"], actions: ["关闭并通知所有者", "开启", "运行 30 分钟"] },
  ];
  const conditionOptions = ["日落至 23:00", "日出至日落", "18:00 至 23:00", "仅工作日"];
  const triggerDevice = sheet?.kind.startsWith("trigger") ? devices.find((device) => device.id === triggers[sheet.index]?.deviceId) : null;
  const actionDevice = sheet?.kind.startsWith("action") ? devices.find((device) => device.id === actions[sheet.index]?.deviceId) : null;
  const summary = `当${triggers.map((trigger) => `${trigger.deviceName}${trigger.event}`).join("，或当")}${includeCondition ? `，并且${condition}` : ""}，就${actions.map((action) => `${action.deviceName}${action.action}`).join("，然后")}。`;

  const updateTrigger = (index: number, next: Partial<LinkageTrigger>) => setTriggers((current) => current.map((trigger, itemIndex) => itemIndex === index ? { ...trigger, ...next } : trigger));
  const updateAction = (index: number, next: Partial<LinkageAction>) => setActions((current) => current.map((action, itemIndex) => itemIndex === index ? { ...action, ...next } : action));

  const addTrigger = () => {
    keyboard.hide();
    const index = triggers.length;
    setTriggers((current) => [...current, { deviceId: "fountain", deviceName: fountainName, event: "开启" }]);
    setSheet({ kind: "trigger-device", index });
  };

  const addAction = () => {
    keyboard.hide();
    const index = actions.length;
    setActions((current) => [...current, { deviceId: "fountain", deviceName: fountainName, action: "运行 30 分钟" }]);
    setSheet({ kind: "action-device", index });
  };

  const saveLinkage = () => {
    keyboard.hide();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("请输入联动名称");
      return;
    }
    if (!triggers.length || !actions.length) {
      setError("联动至少需要一个触发器和一个动作");
      return;
    }

    const nextLinkage: LinkageDefinition = {
      id: existing?.id ?? `linkage-${Date.now()}`,
      name: trimmedName,
      triggers,
      condition: includeCondition ? condition : null,
      actions,
      enabled: existing?.enabled ?? true,
    };
    yard.setLinkages((current) => existingName ? current.map((linkage) => linkage.name === existingName ? nextLinkage : linkage) : [nextLinkage, ...current]);
    yard.notify(existingName ? `“${trimmedName}”已更新` : `“${trimmedName}”联动已创建并启用`);
    flow.pop();
  };

  const sheetTitle = sheet?.kind === "trigger-device" ? "选择触发设备" : sheet?.kind === "trigger-event" ? `选择${triggerDevice?.name ?? "设备"}事件` : sheet?.kind === "condition" ? "设置约束条件" : sheet?.kind === "action-device" ? "选择执行设备" : `设置${actionDevice?.name ?? "设备"}动作`;

  return (
    <>
      <MobileScroll className="app-screen dark-screen"><main className="detail-page editor-page linkage-editor">
        <div className="mobile-field linkage-name-field">
          <span className="field-label-row"><label className="field-label" htmlFor="linkage-name">联动名称</label>{keyboard.visible ? <button type="button" onClick={() => keyboard.hide()}>完成</button> : null}</span>
          <KeyboardInput id="linkage-name" data-testid="linkage-name" value={name} placeholder="例如：开门照明" enterKeyHint="done" onChange={(event) => { setName(event.target.value); setError(""); }} onKeyDown={(event) => { if (event.key === "Enter") keyboard.hide(); }} />
        </div>

        {triggers.map((trigger, index) => <RuleBuilderCard key={`${trigger.deviceId}-${index}`} label="当" accent="trigger" icon={devices.find((device) => device.id === trigger.deviceId)?.icon ?? <Door size={23} />} title={`${trigger.deviceName}${trigger.event}`} subtitle={index === 0 ? "设备事件 · 仅在状态变化时触发" : "另一触发器 · 任一发生即可"} onClick={() => { keyboard.hide(); setSheet({ kind: "trigger-device", index }); }} />)}
        {triggers.length < 2 ? <button className="connector-button" onClick={addTrigger}><Plus size={15} />添加另一个触发器（任一发生）</button> : null}

        <RuleBuilderCard label="并且" accent="condition" icon={<SunHorizon size={23} />} title={includeCondition ? condition : "没有约束条件"} subtitle={includeCondition ? "每天 · 庭院当地时间" : "全天生效"} onClick={() => includeCondition && setSheet({ kind: "condition", index: 0 })} action={<Switch label="启用时间条件" value={includeCondition} onChange={(value) => { keyboard.hide(); setIncludeCondition(value); }} />} />

        {actions.map((actionItem, index) => <RuleBuilderCard key={`${actionItem.deviceId}-${index}`} label="就" accent="action" icon={devices.find((device) => device.id === actionItem.deviceId)?.icon ?? <LightbulbFilament size={23} />} title={`${actionItem.deviceName}：${actionItem.action}`} subtitle={index === 0 ? "触发后立即执行" : "上一动作之后执行"} onClick={() => { keyboard.hide(); setSheet({ kind: "action-device", index }); }} />)}
        {actions.length < 2 ? <button className="connector-button" onClick={addAction}><Plus size={15} />添加动作（然后）</button> : null}

        <section className="summary-box linkage-summary"><FlowArrow size={20} /><p>{summary}</p></section>
        <section className="validation-row"><ShieldCheck size={19} weight="duotone" /><span><strong>检查通过</strong><small>没有发现循环、冲突或权限问题</small></span></section>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <button className="secondary-button" onClick={() => { keyboard.hide(); yard.notify(`联动测试完成 · ${actions.length} 项动作成功`); }}>测试动作</button>
        <button className="primary-button" data-testid="save-linkage" onClick={saveLinkage}>{existingName ? "保存修改" : "保存并启用"}</button>
      </main></MobileScroll>

      <BottomSheet open={Boolean(sheet)} onOpenChange={(open) => !open && setSheet(null)} title={sheetTitle} description={sheet?.kind.startsWith("trigger") ? "选择设备和可用的状态变化事件。" : sheet?.kind === "condition" ? "只有满足该条件时才执行动作。" : "选择联动触发后要发送的设备动作。"} snap={0.54}>
        <div className="choice-grid two-col">
          {sheet?.kind === "trigger-device" ? devices.map((device) => <button key={device.id} className={triggers[sheet.index]?.deviceId === device.id ? "selected" : ""} onClick={() => { updateTrigger(sheet.index, { deviceId: device.id, deviceName: device.name, event: device.events[0] }); setSheet({ kind: "trigger-event", index: sheet.index }); }}>{device.name}</button>) : null}
          {sheet?.kind === "trigger-event" ? triggerDevice?.events.map((eventName) => <button key={eventName} className={triggers[sheet.index]?.event === eventName ? "selected" : ""} onClick={() => { updateTrigger(sheet.index, { event: eventName }); setSheet(null); }}>{eventName}</button>) : null}
          {sheet?.kind === "condition" ? conditionOptions.map((option) => <button key={option} className={condition === option ? "selected" : ""} onClick={() => { setCondition(option); setSheet(null); }}>{option}</button>) : null}
          {sheet?.kind === "action-device" ? devices.map((device) => <button key={device.id} className={actions[sheet.index]?.deviceId === device.id ? "selected" : ""} onClick={() => { updateAction(sheet.index, { deviceId: device.id, deviceName: device.name, action: device.actions[0] }); setSheet({ kind: "action-value", index: sheet.index }); }}>{device.name}</button>) : null}
          {sheet?.kind === "action-value" ? actionDevice?.actions.map((actionName) => <button key={actionName} className={actions[sheet.index]?.action === actionName ? "selected" : ""} onClick={() => { updateAction(sheet.index, { action: actionName }); setSheet(null); }}>{actionName}</button>) : null}
        </div>
        {sheet && ((sheet.kind.startsWith("trigger") && triggers.length > 1) || (sheet.kind.startsWith("action") && actions.length > 1)) ? <button className="secondary-button destructive-copy" onClick={() => { if (sheet.kind.startsWith("trigger")) setTriggers((current) => current.filter((_, index) => index !== sheet.index)); else setActions((current) => current.filter((_, index) => index !== sheet.index)); setSheet(null); }}>移除此项</button> : null}
        <button className="secondary-button" onClick={() => setSheet(null)}>取消</button>
      </BottomSheet>
    </>
  );
}

function RuleBuilderCard({ label, icon, title, subtitle, action, accent, onClick }: { label: string; icon: ReactNode; title: string; subtitle: string; action?: ReactNode; accent: string; onClick?: () => void }) {
  return <section className={`builder-card ${accent}`}><span className="builder-label">{label}</span><button className="builder-content" onClick={onClick}><span className="builder-icon">{icon}</span><span className="builder-copy"><strong>{title}</strong><small>{subtitle}</small></span></button><span className="builder-control">{action ?? <button aria-label={`编辑${title}`} onClick={onClick}><CaretDown size={18} /></button>}</span></section>;
}

function deviceManagementScreen(): FlowScreen {
  return detailScreen("device-management", "设备管理", (flow) => <DeviceManagementPage flow={flow} />);
}

function DeviceManagementPage({ flow }: { flow: FlowControls }) {
  const yard = useYard();
  const configuredCount = yard.controllerChannels.filter((channel) => channel.configured).length;
  const lights = allLightingDevices(yard.activeYard);
  const onlinePhysicalCount = lights.filter((light) => light.online).length + 1;

  return (
    <MobileScroll className="app-screen dark-screen">
      <main className="detail-page device-management-page">
        <section className="management-summary">
          <ShieldCheck size={24} weight="duotone" />
          <span><strong>{onlinePhysicalCount} 台物理设备在线</strong><small>{lights.length} 个灯光设备 · 1 台 12 路控制器</small></span>
        </section>

        <section className="physical-device-section management-device-section">
          <div className="section-title management-section-heading"><span>物理设备</span><button onClick={() => flow.push(addDeviceScreen())}><Plus size={15} />添加</button></div>
          <div className="physical-device-list">
            {lights.map((light) => <button className="management-device-card" data-testid={`managed-light-${light.id}`} key={light.id} onClick={() => flow.push(lightDeviceDetailScreen(light.id))}>
              <span className="physical-device-icon"><LightbulbFilament size={28} weight="duotone" /></span>
              <span><strong>{light.name}</strong><small>{light.model} · {light.area} · {light.online ? "Wi-Fi 在线" : "离线"}</small><em>{yard.activeYard.lightGroups.some((group) => group.memberIds.includes(light.id)) ? "已加入灯光组" : "独立智能设备"}</em></span>
              <CaretDown size={17} />
            </button>)}
            <button className="management-device-card" data-testid="open-controller-management" onClick={() => flow.push(controllerDetailScreen())}>
              <span className="physical-device-icon"><SlidersHorizontal size={28} weight="duotone" /></span>
              <span><strong>12 路干接点控制器</strong><small>DC12 · 设备尾号 8F2C</small><em>{configuredCount} 路已配置 · {12 - configuredCount} 路未使用</em></span>
              <CaretDown size={17} />
            </button>
          </div>
        </section>

        <section className="physical-device-section management-device-section light-group-management-section">
          <div className="section-title management-section-heading"><span>灯光组</span>{yard.permissions.manageYard ? <button data-testid="manage-create-light-group" onClick={() => flow.push(lightGroupEditorScreen())}><Plus size={15} />新建</button> : null}</div>
          <div className="physical-device-list light-group-management-list">{yard.activeYard.lightGroups.length ? yard.activeYard.lightGroups.map((group) => { const status = lightGroupStatus(yard.activeYard, group); return <button className="management-light-group-card" data-testid={`management-light-group-${group.id}`} key={group.id} onClick={() => flow.push(lightGroupDetailScreen(group.id))}><span className="physical-device-icon"><LightbulbFilament size={28} weight="duotone" /></span><span><strong>{group.name}</strong><small>{group.area} · {status.members.length} 个灯光</small><em>{status.onlineCount}/{status.members.length} 在线 · {status.state === "partial" ? "部分开启" : status.state === "all-on" ? "全部开启" : "全部关闭"}</em></span><CaretDown className="management-card-caret" size={17} /></button>; }) : <div className="empty-state-card"><strong>还没有灯光组</strong><small>将两个以上灯光组合为一个控制入口。</small></div>}</div>
        </section>

        <section className="management-note">
          <LightbulbFilament size={20} weight="duotone" />
          <p><strong>首页设备如何生成？</strong><br />灯光组作为虚拟设备显示；控制器每个已配置通道仍作为庭院门、喷泉、灌溉等独立设备显示。</p>
        </section>
      </main>
    </MobileScroll>
  );
}

function controllerDetailScreen(onboarding = false): FlowScreen {
  return detailScreen(
    onboarding ? "controller-onboarding" : "controller-detail",
    onboarding ? "配置12路通道" : "12路控制器",
    (flow) => <ControllerDetailPage flow={flow} onboarding={onboarding} />,
  );
}

function ControllerDetailPage({ flow, onboarding }: { flow: FlowControls; onboarding: boolean }) {
  const yard = useYard();
  const configuredCount = yard.controllerChannels.filter((channel) => channel.configured).length;

  return (
    <MobileScroll className="app-screen dark-screen">
      <main className="detail-page controller-detail-page">
        {onboarding ? (
          <section className="controller-onboarding-note">
            <Check size={19} weight="bold" />
            <span><strong>控制器已连接</strong><small>请配置实际接线对应的通道，未使用通道可以跳过。</small></span>
          </section>
        ) : null}

        <section className="controller-overview">
          <span className="controller-overview-icon"><SlidersHorizontal size={38} weight="duotone" /></span>
          <div><small>DC12 · 设备尾号 8F2C</small><strong>12 路干接点控制器</strong><p><WifiHigh size={14} /> Wi-Fi 在线　<Bluetooth size={14} /> 本地可用</p></div>
          <span className="status-tag">在线</span>
        </section>

        <section className="controller-stats">
          <div><strong>{configuredCount}</strong><small>已配置</small></div>
          <div><strong>{12 - configuredCount}</strong><small>未使用</small></div>
          <div><strong>0</strong><small>异常</small></div>
        </section>

        <section className="channel-section">
          <div className="section-title"><span>通道配置</span><small>CH1–CH12</small></div>
          <div className="channel-list">
            {yard.controllerChannels.map((channel) => (
              <button key={channel.id} className={channel.configured ? "configured" : ""} data-testid={`channel-${channel.id}`} onClick={() => flow.push(channelEditorScreen(channel.id))}>
                <span className="channel-number">CH{channel.id}</span>
                <span className="channel-device-icon">{channelIcon(channel.type)}</span>
                <span className="channel-copy">
                  <strong>{channel.name}</strong>
                  <small>{channel.configured ? `${channel.area} · ${channel.mode}${channel.mode === "点动/脉冲" ? ` ${channel.pulse}` : ""}` : "点击配置对应设备"}</small>
                </span>
                <span className={`channel-state ${channel.configured ? "ready" : ""}`}>{channel.configured ? "已配置" : "未配置"}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="content-section controller-settings">
          <div className="section-title"><span>控制器设置</span></div>
          <div className="settings-list">
            <button><WifiHigh size={20} /><span>网络设置</span><strong>庭院 Wi-Fi</strong></button>
            <button><ShieldCheck size={20} /><span>通道安全保护</span><strong>已开启</strong></button>
            <button><Gear size={20} /><span>固件与设备信息</span><strong>v1.0.8</strong></button>
          </div>
        </section>

        {onboarding ? <button className="primary-button" onClick={() => { yard.notify("通道配置已保存"); flow.pop(); }}>完成配置</button> : null}
      </main>
    </MobileScroll>
  );
}

function channelEditorScreen(channelId: number): FlowScreen {
  return detailScreen(`channel-editor-${channelId}`, `CH${channelId} 通道设置`, (flow) => <ChannelEditor channelId={channelId} flow={flow} />);
}

function ChannelEditor({ channelId, flow }: { channelId: number; flow: FlowControls }) {
  const yard = useYard();
  const channel = yard.controllerChannels.find((item) => item.id === channelId) ?? initialControllerChannels[channelId - 1];
  const nameRef = useRef<HTMLInputElement>(null);
  const [deviceType, setDeviceType] = useState(channel.type === "未配置" ? "庭院门" : channel.type);
  const [area, setArea] = useState(channel.area === "未分配" ? "未分区" : channel.area);
  const [mode, setMode] = useState<ControllerChannel["mode"]>(channel.mode);
  const [pulse, setPulse] = useState(channel.pulse);
  const [polarity, setPolarity] = useState<ControllerChannel["polarity"]>(channel.polarity);
  const [visible, setVisible] = useState(channel.configured ? channel.visible : true);
  const [sensitive, setSensitive] = useState(channel.sensitive);
  const [automation, setAutomation] = useState(channel.automation);
  const [timeout, setTimeoutValue] = useState(channel.timeout);
  const deviceTypes = ["庭院门", "喷泉", "灌溉", "水泵", "车库门", "卷帘", "自定义"];
  const areas = ["未分区", ...yard.activeYard.areas];

  const saveChannel = () => {
    const enteredName = nameRef.current?.value.trim();
    yard.setControllerChannels((current) => current.map((item) => item.id === channelId ? {
      ...item,
      configured: true,
      name: enteredName || deviceType,
      type: deviceType,
      area,
      mode,
      pulse,
      polarity,
      visible,
      sensitive,
      automation,
      timeout,
    } : item));
    yard.notify(`CH${channelId} 已配置为“${enteredName || deviceType}”`);
    flow.pop();
  };

  const clearChannel = () => {
    yard.setControllerChannels((current) => current.map((item) => item.id === channelId ? {
      ...initialControllerChannels[channelId - 1],
      id: channelId,
      configured: false,
      name: "未配置",
      type: "未配置",
      area: "未分配",
      visible: false,
      sensitive: false,
    } : item));
    yard.notify(`CH${channelId} 已设为未配置`);
    flow.pop();
  };

  return (
    <MobileScroll className="app-screen dark-screen">
      <main className="detail-page channel-editor-page">
        <section className="channel-editor-summary">
          <span>CH{channelId}</span>
          <div><strong>{channel.configured ? channel.name : "配置新通道"}</strong><small>12 路干接点控制器 · DC12</small></div>
          <span className={channel.configured ? "configured" : ""}>{channel.configured ? "已配置" : "未配置"}</span>
        </section>

        <label className="mobile-field" htmlFor={`channel-name-${channelId}`}>
          <span className="field-label">设备名称</span>
          <KeyboardInput ref={nameRef} id={`channel-name-${channelId}`} defaultValue={channel.configured ? channel.name : ""} placeholder={`例如：${deviceType}`} />
        </label>

        <section className="content-section channel-form-section">
          <div className="section-title"><span>设备类型</span></div>
          <div className="channel-type-grid">
            {deviceTypes.map((item) => <button key={item} className={deviceType === item ? "selected" : ""} onClick={() => setDeviceType(item)}>{channelIcon(item, 20)}<span>{item}</span></button>)}
          </div>
        </section>

        <section className="content-section channel-form-section">
          <div className="section-title"><span>所属区域</span></div>
          <Carousel ariaLabel="所属区域" className="channel-area-carousel" contentClassName="channel-area-track">
            {areas.map((item) => <button key={item} className={area === item ? "selected" : ""} onClick={() => setArea(item)}>{item}</button>)}
          </Carousel>
        </section>

        <section className="content-section channel-form-section">
          <div className="section-title"><span>控制方式</span></div>
          <div className="choice-grid two-col">{(["开关", "点动/脉冲"] as ControllerChannel["mode"][]).map((item) => <button key={item} className={mode === item ? "selected" : ""} onClick={() => setMode(item)}>{item}</button>)}</div>
          {mode === "点动/脉冲" ? <><div className="subsection-label">脉冲持续时间</div><div className="choice-grid three-col">{["0.5 秒", "1 秒", "2 秒"].map((item) => <button key={item} className={pulse === item ? "selected" : ""} onClick={() => setPulse(item)}>{item}</button>)}</div></> : null}
          <div className="subsection-label">接点逻辑</div>
          <div className="choice-grid two-col">{(["常开 (NO)", "常闭 (NC)"] as ControllerChannel["polarity"][]).map((item) => <button key={item} className={polarity === item ? "selected" : ""} onClick={() => setPolarity(item)}>{item}</button>)}</div>
        </section>

        {mode === "开关" ? <section className="content-section channel-form-section"><div className="section-title"><span>运行超时提醒</span></div><div className="choice-grid two-col">{["不限制", "15 分钟", "30 分钟", "60 分钟"].map((item) => <button key={item} className={timeout === item ? "selected" : ""} onClick={() => setTimeoutValue(item)}>{item}</button>)}</div></section> : null}

        <section className="content-section channel-form-section">
          <div className="settings-list channel-toggle-list">
            <div><House size={20} /><span><strong>显示在设备首页</strong><small>作为独立逻辑设备显示</small></span><Switch label="显示在设备首页" value={visible} onChange={setVisible} /></div>
            <div><Lock size={20} /><span><strong>敏感操作确认</strong><small>每次远程执行前需要确认</small></span><Switch label="敏感操作确认" value={sensitive} onChange={setSensitive} /></div>
            <div><FlowArrow size={20} /><span><strong>允许场景与自动化</strong><small>可被场景、定时和联动调用</small></span><Switch label="允许场景与自动化" value={automation} onChange={setAutomation} /></div>
          </div>
        </section>

        <button className="primary-button" data-testid="save-channel" onClick={saveChannel}>保存通道设置</button>
        {channel.configured ? <button className="secondary-button destructive-copy" onClick={clearChannel}>取消配置此通道</button> : null}
      </main>
    </MobileScroll>
  );
}

function channelIcon(type: string, size = 23): ReactNode {
  if (type === "庭院门" || type === "车库门" || type === "卷帘") return <Door size={size} weight="duotone" />;
  if (type === "喷泉") return <Waves size={size} weight="duotone" />;
  if (type === "灌溉") return <Plant size={size} weight="duotone" />;
  if (type === "水泵") return <Drop size={size} weight="duotone" />;
  if (type === "未配置") return <Plus size={size} />;
  return <SlidersHorizontal size={size} weight="duotone" />;
}

function MeHome({ flow }: { flow: FlowControls }) {
  const yard = useYard();
  const configuredCount = yard.controllerChannels.filter((channel) => channel.configured).length + allLightingDevices(yard.activeYard).length;
  const installerCount = yard.activeYard.members.filter((member) => member.role === "installer").length;
  const visualMode = useVisualMode();
  const roleLabel = yard.activeYard.membership.role === "owner" ? "庭院所有者" : yard.activeYard.membership.roleLabel;
  return (
    <MobileScroll className="app-screen dark-screen"><main className="root-page standard-page">
      <AppTopBar title="我的" subtitle="家庭、权限与系统设置" />
      <section className={`profile-card ${visualMode === "warm" ? "warm-profile-card" : ""}`}><span><UserCircle size={42} weight="duotone" /></span><div><strong>{roleLabel}</strong><small>{yard.activeYard.profile.name} · {yard.activeYard.membership.roleLabel}</small></div><CaretDown size={18} /></section>
      <section className="content-section flush-section"><div className="settings-list"><button data-testid="open-device-management" onClick={() => flow.push(deviceManagementScreen())}><SlidersHorizontal size={21} /><span>设备管理</span><strong>{configuredCount} 台</strong></button><button onClick={() => flow.push(membersScreen())}><Users size={21} /><span>家庭与成员</span><strong>{yard.activeYard.members.length} 人</strong></button>{yard.permissions.manageYard ? <button onClick={() => flow.push(installerAuthorizationScreen())}><ShareNetwork size={21} /><span>临时安装商权限</span><strong>{installerCount} 个有效</strong></button> : null}<button><Bell size={21} /><span>消息与通知</span><strong>2 条</strong></button><button><ListChecks size={21} /><span>全局操作日志</span><strong>查看</strong></button></div></section>
      <section className="content-section flush-section"><div className="settings-list"><button><Globe size={21} /><span>语言与地区</span><strong>简体中文</strong></button><button onClick={() => flow.push(yardProfileScreen())}><MapPin size={21} /><span>庭院时区</span><strong>{yard.activeYard.profile.timezone}</strong></button><button><Bluetooth size={21} /><span>蓝牙与本地控制</span><strong>可用</strong></button><button><Gear size={21} /><span>应用设置</span><strong> </strong></button></div></section>
    </main></MobileScroll>
  );
}
