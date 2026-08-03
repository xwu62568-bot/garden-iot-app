# 庭院切换与庭院管理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有庭院 IoT App 原型中完成庭院切换、新建、加入和管理，并让设备、区域、场景、定时、联动、时区和权限随庭院完整隔离，同时保持深色版与暖白版两套独立视觉。

**Architecture:** 把当前单庭院的扁平 `YardState` 改为 `YardWorkspace[] + activeYardId`，并通过绑定到活动庭院的兼容 setter 继续服务现有设备、场景和自动化页面。业务状态、权限判断和流程动作共用；庭院选择、新建、加入、管理和空状态分别由 Night/Warm 视图组件渲染。所有 App UI 继续留在 `src/Prototype.tsx` 与 `src/prototype.css`，不修改受保护的移动运行时。

**Tech Stack:** React 19、TypeScript 7、Vite 8、Playwright 1.61、现有 Mobile Runtime（`FlowStack`、`BottomSheet`、`MobileScroll`、`KeyboardInput`）

## Global Constraints

- 默认深色版保持在 `/`，暖白版保持在 `/?visual=warm`。
- 视觉切换保留当前庭院和庭院业务状态，并返回设备根页。
- 两种视觉共用数据、权限、校验和导航逻辑，但庭院相关页面采用独立 Night/Warm 组件与样式。
- 不用一套 DOM 结构加颜色变量模拟两套庭院页面。
- 不实现真实后端、相机扫码、庭院删除、所有权转让或庭院平面图。
- 新建庭院只包含名称、所在地/时区、初始区域和完成页；邀请成员和添加设备留在创建后入口。
- 临时安装商只可操作授权设备、添加设备、配置干接点通道、测试和诊断；场景与自动化只读。
- 视觉验收由用户执行；自动化检查只覆盖功能、权限、状态隔离、运行时完整性和构建。
- 不修改 `src/App.tsx`、`src/main.tsx`、`src/styles.css`、`src/mobile/`、`public/assets/iphone/`、`public/assets/android/`、`public/assets/status/`、`vite.config.ts`、`worker/index.js` 或 `scripts/prepare-sites-build.mjs`。
- 每次预览或交付前必须在 `prototype/` 下运行 `npm run check:runtime`。

## File Map

- Modify: `prototype/src/Prototype.tsx:39-345` — 庭院类型、预置数据、活动庭院状态、兼容 setter、切换/创建/加入/管理动作。
- Modify: `prototype/src/Prototype.tsx:383-518` — 顶部庭院入口、Night/Warm 设备头部和庭院选择面板触发。
- Modify: `prototype/src/Prototype.tsx:502-734` — 设备页按活动庭院渲染、区域状态、权限与空状态。
- Modify: `prototype/src/Prototype.tsx:1194-1405` — 场景和自动化按庭院读取、角色权限、空状态。
- Modify: `prototype/src/Prototype.tsx:1824-1836` — “我的”页的庭院资料和管理入口。
- Modify: `prototype/src/Prototype.tsx` after `MeHome` — Night/Warm 庭院选择、新建、加入、管理、区域和权限视图组件。
- Modify: `prototype/src/prototype.css:61-115, 2344-2450, 2823-3025, 3661-3720` — 复用现有顶部、BottomSheet 和双视觉基础样式。
- Append: `prototype/src/prototype.css` — `.night-yard-*` 与 `.warm-yard-*` 两套独立庭院页面样式。
- Create: `prototype/tests/yard-workspace.spec.ts` — 真实原型上的庭院流程、权限、隔离和双视觉功能测试。
- Modify: `prototype/AGENTS.md` under `Project Design Decisions` — 记录已确认的庭院工作空间、角色权限和双视觉边界。

---

### Task 1: 建立多庭院工作空间状态

**Files:**
- Modify: `prototype/src/Prototype.tsx:39-345`
- Create: `prototype/tests/yard-workspace.spec.ts`

**Interfaces:**
- Produces: `YardRole`, `YardProfile`, `YardMembership`, `YardWorkspace`, `YardPermissions`。
- Produces: `YardState.activeYard`, `YardState.yards`, `YardState.activeYardId`, `YardState.switchYard(yardId)`。
- Produces: `updateActiveYard(updater: (yard: YardWorkspace) => YardWorkspace): void`，后续所有 setter 基于它更新活动庭院。
- Preserves: 当前页面使用的 `lightOn`、`setLightOn`、`controllerChannels`、`setScenes`、`setSchedules`、`setLinkages` 等接口。

- [ ] **Step 1: 写默认活动庭院与视觉切换保持状态的失败测试**

```ts
import { expect, test, type Page } from "@playwright/test";

async function openPrototype(page: Page, visual: "night" | "warm" = "night") {
  await page.goto(visual === "warm" ? "/?visual=warm" : "/");
  await expect(page.getByTestId("yard-app")).toBeVisible();
}

test("boots into the owner yard and preserves it across visual switching", async ({ page }) => {
  await openPrototype(page);
  await expect(page.getByTestId("yard-app")).toHaveAttribute("data-yard-id", "my-yard");
  await expect(page.getByTestId("active-yard-name")).toHaveText("我的庭院");

  await page.getByRole("button", { name: "暖白" }).click();

  await expect(page.getByTestId("yard-app")).toHaveAttribute("data-visual", "warm");
  await expect(page.getByTestId("yard-app")).toHaveAttribute("data-yard-id", "my-yard");
  await expect(page.getByTestId("active-yard-name")).toHaveText("我的庭院");
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `cd prototype && npx playwright test tests/yard-workspace.spec.ts -g "boots into"`

Expected: FAIL，`yard-app` 没有 `data-yard-id`，顶部没有 `active-yard-name`。

- [ ] **Step 3: 定义工作空间、权限和设备运行状态类型**

在 `VisualMode` 后加入以下类型；不删除已有 `ControllerChannel`、`SceneDefinition`、`ScheduleDefinition`、`LinkageDefinition`。

```ts
type YardRole = "owner" | "member" | "installer";

type YardProfile = {
  name: string;
  city: string;
  timezone: string;
};

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

type LightStripState = {
  id: "light";
  name: string;
  area: string;
  visible: boolean;
  on: boolean;
  brightness: number;
  effect: string;
};

type YardWorkspace = {
  id: string;
  profile: YardProfile;
  membership: YardMembership;
  members: YardMember[];
  areas: string[];
  light: LightStripState;
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
```

- [ ] **Step 4: 添加三套不共享数组引用的预置庭院工厂**

新增 `makeOwnerYard()`、`makeParentYard()`、`makeInstallerYard()`。三个工厂每次都返回新数组，使用以下固定数据：

| 字段 | 我的庭院 | 父母家 | 客户庭院 |
| --- | --- | --- | --- |
| `id` | `my-yard` | `parents-yard` | `client-yard` |
| `city` | 上海 | 苏州 | 杭州 |
| `timezone` | `Asia/Shanghai` | `Asia/Shanghai` | `Asia/Shanghai` |
| `role` | `owner` | `member` | `installer` |
| `roleLabel` | 所有者 | 普通成员 | 临时安装商 |
| `expiresAt` | `null` | `null` | `2026-08-31T23:59:59+08:00` |
| `areas` | 后院、露台、泳池、前院、车库 | 门廊、花园 | 前院、设备间、车库 |
| 灯带 | 露台灯带，露台，可见 | 父母家廊灯，门廊，可见 | 设备间测试灯，不可见 |
| 成员 | 林先生（所有者）、王女士（普通成员）、安装服务（临时安装商） | 陈女士（所有者）、当前账户（普通成员） | 周先生（所有者）、当前账户（临时安装商） |
| 场景 | `initialScenes` 的新副本 | 回家照明、全部关闭 | 空数组 |
| 定时 | `initialSchedules` 的新副本 | 门廊日落开灯 | 空数组 |
| 联动 | `initialLinkages` 的新副本 | 开门照明 | 空数组 |

`父母家` 只配置通道 1“父母家庭院门”和通道 3“花园灌溉”；`客户庭院` 使用十二路控制器数据，并把当前账户和 owner yard 中“安装服务”的 `authorizedDeviceIds` 设为 `['controller', 'channel-1', 'channel-2', 'channel-3', 'channel-4']`，到期时间设为 `2026-08-31T23:59:59+08:00`。

```ts
const cloneControllerChannels = () => initialControllerChannels.map((channel) => ({ ...channel }));
const cloneScenes = (scenes: SceneDefinition[]) => scenes.map((scene) => ({ ...scene }));
const cloneSchedules = (schedules: ScheduleDefinition[]) => schedules.map((schedule) => ({ ...schedule }));
const cloneLinkages = (linkages: LinkageDefinition[]) => linkages.map((linkage) => ({
  ...linkage,
  triggers: linkage.triggers.map((trigger) => ({ ...trigger })),
  actions: linkage.actions.map((action) => ({ ...action })),
}));

const makeInitialYards = (): YardWorkspace[] => [
  makeOwnerYard(),
  makeParentYard(),
  makeInstallerYard(),
];

const permissionsFor = (membership: YardMembership): YardPermissions => ({
  controlDevices: membership.role !== "installer" || membership.authorizedDeviceIds.length > 0,
  runScenes: membership.role !== "installer",
  editScenes: membership.role === "owner",
  editAutomations: membership.role === "owner",
  addDevices: membership.role === "owner" || membership.role === "installer",
  configureController: membership.role === "owner" || membership.role === "installer",
  manageYard: membership.role === "owner",
});
```

- [ ] **Step 5: 用 `yards + activeYardId` 替换扁平 useState，并保留兼容 setter**

```ts
const [yards, setYards] = useState<YardWorkspace[]>(makeInitialYards);
const [activeYardId, setActiveYardId] = useState("my-yard");
const activeYard = yards.find((yard) => yard.id === activeYardId) ?? yards[0];

const updateActiveYard = useCallback(
  (updater: (yard: YardWorkspace) => YardWorkspace) => {
    setYards((current) => current.map((yard) => yard.id === activeYardId ? updater(yard) : yard));
  },
  [activeYardId],
);

const setLightOn = useCallback((value: boolean) => {
  updateActiveYard((yard) => ({ ...yard, light: { ...yard.light, on: value } }));
}, [updateActiveYard]);

const setControllerChannels = useCallback<YardState["setControllerChannels"]>((value) => {
  updateActiveYard((yard) => ({
    ...yard,
    controllerChannels: typeof value === "function" ? value(yard.controllerChannels) : value,
  }));
}, [updateActiveYard]);
```

其余兼容 setter 使用以下精确映射：

```ts
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
const setScenes = useCallback<YardState["setScenes"]>((value) => {
  updateActiveYard((yard) => ({ ...yard, scenes: typeof value === "function" ? value(yard.scenes) : value }));
}, [updateActiveYard]);
const setSchedules = useCallback<YardState["setSchedules"]>((value) => {
  updateActiveYard((yard) => ({ ...yard, schedules: typeof value === "function" ? value(yard.schedules) : value }));
}, [updateActiveYard]);
const setLinkages = useCallback<YardState["setLinkages"]>((value) => {
  updateActiveYard((yard) => ({ ...yard, linkages: typeof value === "function" ? value(yard.linkages) : value }));
}, [updateActiveYard]);
const runDinnerScene = useCallback(() => {
  updateActiveYard((yard) => ({
    ...yard,
    light: { ...yard.light, on: true, brightness: 68, effect: "日落流光" },
    fountainOn: true,
  }));
  notify("“花园晚宴”已执行 · 4 项成功");
}, [notify, updateActiveYard]);
```

- [ ] **Step 6: 暴露活动庭院信息并让顶部名称读取它**

`YardState` 增加精确字段：

```ts
yards: YardWorkspace[];
activeYardId: string;
activeYard: YardWorkspace;
permissions: YardPermissions;
switchYard: (yardId: string) => "switched" | "expired" | "missing";
```

在根元素和两种设备头部加入：

```tsx
<div
  className={`yard-app visual-${visualMode}`}
  data-testid="yard-app"
  data-visual={visualMode}
  data-yard-id={activeYard.id}
>

<strong data-testid="active-yard-name">{yard.activeYard.profile.name}</strong>
```

- [ ] **Step 7: 运行测试、类型检查和运行时检查**

Run: `cd prototype && npx playwright test tests/yard-workspace.spec.ts -g "boots into"`

Expected: PASS。

Run: `cd prototype && npm run check:runtime && npx tsc --noEmit`

Expected: 两条命令均退出码 0。

- [ ] **Step 8: 提交工作空间状态**

```bash
git add prototype/src/Prototype.tsx prototype/tests/yard-workspace.spec.ts
git commit -m "feat: add isolated yard workspaces"
```

---

### Task 2: 完成深色与暖白庭院选择面板

**Files:**
- Modify: `prototype/src/Prototype.tsx:383-518`
- Modify: `prototype/src/prototype.css:2344-2450, 2823-3025, 3661-3720`
- Modify: `prototype/tests/yard-workspace.spec.ts`

**Interfaces:**
- Consumes: `YardState.yards`, `activeYard`, `switchYard`。
- Produces: `YardSwitcherSheet({ open, onOpenChange, onManage, onCreate, onJoin })`。
- Produces: `NightYardSwitcherContent` 与 `WarmYardSwitcherContent`，二者只共享数据和回调，不共享页面 DOM。

- [ ] **Step 1: 写两种视觉切换庭院的失败测试**

```ts
for (const visual of ["night", "warm"] as const) {
  test(`${visual} yard switcher changes the complete workspace`, async ({ page }) => {
    await openPrototype(page, visual);
    await page.getByRole("button", { name: "切换庭院" }).first().click();
    await expect(page.getByTestId(`${visual}-yard-switcher`)).toBeVisible();
    await expect(page.getByText("父母家", { exact: true })).toBeVisible();
    await expect(page.getByText("普通成员", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: /切换到父母家/ }).click();

    await expect(page.getByTestId("yard-app")).toHaveAttribute("data-yard-id", "parents-yard");
    await expect(page.getByTestId("active-yard-name")).toHaveText("父母家");
    await expect(page.getByRole("status")).toContainText("已切换至父母家");
  });
}
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `cd prototype && npx playwright test tests/yard-workspace.spec.ts -g "yard switcher"`

Expected: FAIL，顶部按钮没有打开庭院面板。

- [ ] **Step 3: 把顶部入口接到设备页的 `yardSwitcherOpen` 状态**

给 `AppTopBar` 增加 `onSelectYard?: () => void`，并接到 selectable 按钮。`NightDevicesTop`、`WarmDevicesTop` 接收相同回调，但各自保留现有独立头部结构。

```tsx
function NightDevicesTop({ flow, onSelectYard }: { flow: FlowControls; onSelectYard: () => void }) {
  return <AppTopBar selectable onSelectYard={onSelectYard} showNotifications action={{
    label: "添加设备",
    testId: "add-device",
    onClick: () => flow.push(addDeviceScreen()),
  }} />;
}

function WarmDevicesTop({ flow, onSelectYard }: { flow: FlowControls; onSelectYard: () => void }) {
  const yard = useYard();
  return (
    <section className="warm-devices-top">
      <header className="warm-devices-topbar">
        <button className="warm-yard-selector" aria-label="切换庭院" onClick={onSelectYard}>
          <strong data-testid="active-yard-name">{yard.activeYard.profile.name}</strong>
          <CaretDown size={18} weight="bold" />
        </button>
        <div className="warm-topbar-actions">
          <button aria-label="通知"><Bell size={24} /></button>
          <button aria-label="添加设备" data-testid="add-device" onClick={() => flow.push(addDeviceScreen())}>
            <Plus size={26} />
          </button>
        </div>
      </header>
    </section>
  );
}
```

- [ ] **Step 4: 实现独立 Night/Warm 选择面板内容**

`YardSwitcherSheet` 只负责 `BottomSheet` 生命周期和动作分发；内部根据 `visualMode` 选择完全独立的内容组件。

```tsx
type YardSwitcherSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (yardId: string) => void;
  onCreate: () => void;
  onJoin: () => void;
  onManage: () => void;
};

type YardSwitcherContentProps = {
  yards: YardWorkspace[];
  activeYardId: string;
  onSelect: (yardId: string) => void;
  onCreate: () => void;
  onJoin: () => void;
  onManage: () => void;
};

function YardSwitcherSheet(props: YardSwitcherSheetProps) {
  const visualMode = useVisualMode();
  const yard = useYard();
  const contentProps: YardSwitcherContentProps = {
    yards: yard.yards,
    activeYardId: yard.activeYardId,
    onSelect: props.onSelect,
    onCreate: props.onCreate,
    onJoin: props.onJoin,
    onManage: props.onManage,
  };
  return (
    <BottomSheet open={props.open} onOpenChange={props.onOpenChange} title="切换庭院" snap={0.68}>
      {visualMode === "warm"
        ? <WarmYardSwitcherContent {...contentProps} />
        : <NightYardSwitcherContent {...contentProps} />}
    </BottomSheet>
  );
}
```

每个庭院按钮的可访问名称必须为 `切换到${yard.profile.name}`，并展示角色、城市/时区、在线摘要、到期时间和当前选中标记。

- [ ] **Step 5: 分别添加深色和暖白样式**

```css
.night-yard-switcher { display: grid; gap: 10px; }
.night-yard-option { background: #111c28; border: 1px solid #263748; color: #eef4fa; }
.night-yard-option[aria-current="true"] { border-color: #d99a3e; box-shadow: inset 0 0 0 1px rgb(217 154 62 / 28%); }

.warm-yard-switcher { display: grid; gap: 12px; }
.warm-yard-option { background: #fffefb; border: 1px solid #ebe6dc; color: #203923; box-shadow: 0 8px 22px rgb(75 61 36 / 8%); }
.warm-yard-option[aria-current="true"] { border-color: #315f35; background: #f5f8f1; }

.night-yard-role { color: #f0b45a; background: rgb(217 154 62 / 12%); }
.night-yard-summary { color: #8294a7; }
.night-yard-actions { border-top: 1px solid #263748; }
.night-yard-actions .primary-button { background: #d99a3e; color: #101820; }

.warm-yard-role { color: #315f35; background: #eaf2e7; }
.warm-yard-summary { color: #77766f; }
.warm-yard-actions { border-top: 1px solid #ebe6dc; }
.warm-yard-actions .primary-button { background: #315f35; color: #fff; }
```

面板底部动作固定使用 `.night-yard-actions` 与 `.warm-yard-actions`；“新建庭院”为主按钮，“加入庭院”和“管理当前庭院”为次按钮。选中图标放在各自 option 的 trailing 区域，不复用跨视觉背景和边框类。

- [ ] **Step 6: 运行两种视觉测试和运行时检查**

Run: `cd prototype && npx playwright test tests/yard-workspace.spec.ts -g "yard switcher"`

Expected: 2 tests PASS。

Run: `cd prototype && npm run check:runtime`

Expected: PASS。

- [ ] **Step 7: 提交庭院选择面板**

```bash
git add prototype/src/Prototype.tsx prototype/src/prototype.css prototype/tests/yard-workspace.spec.ts
git commit -m "feat: add dual-style yard switcher"
```

---

### Task 3: 让设备、场景和自动化完整跟随活动庭院

**Files:**
- Modify: `prototype/src/Prototype.tsx:502-734, 1194-1405`
- Modify: `prototype/src/prototype.css`
- Modify: `prototype/tests/yard-workspace.spec.ts`

**Interfaces:**
- Consumes: `activeYard.areas`, `activeYard.selectedArea`, `activeYard.light`, `permissions`。
- Produces: `setSelectedArea(area: string)`，只更新当前庭院。
- Produces: `NightEmptyState`、`WarmEmptyState`，接收 `{ kind, title, description, action? }`。

- [ ] **Step 1: 写跨 Tab 数据隔离、区域记忆和权限的失败测试**

```ts
test("yard data and permissions stay isolated across all root tabs", async ({ page }) => {
  await openPrototype(page);
  await page.getByRole("button", { name: "切换庭院" }).click();
  await page.getByRole("button", { name: /切换到父母家/ }).click();

  await expect(page.getByRole("button", { name: "后院" })).toHaveCount(0);
  await page.getByTestId("tab-scenes").click();
  await expect(page.getByText("父母家", { exact: true })).toBeVisible();
  await expect(page.getByTestId("create-scene")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /执行/ }).first()).toBeEnabled();

  await page.getByTestId("tab-automation").click();
  await expect(page.getByTestId("create-schedule")).toHaveCount(0);
  await expect(page.getByRole("switch").first()).toBeDisabled();

  await page.getByTestId("tab-devices").click();
  await page.getByRole("button", { name: "切换庭院" }).click();
  await page.getByRole("button", { name: /切换到我的庭院/ }).click();
  await expect(page.getByText("露台灯带", { exact: true })).toBeVisible();
  await expect(page.getByText("父母家廊灯", { exact: true })).toHaveCount(0);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `cd prototype && npx playwright test tests/yard-workspace.spec.ts -g "data and permissions"`

Expected: FAIL，区域、标题和创建入口仍使用单庭院静态数据。

- [ ] **Step 3: 设备页从活动庭院读取名称、区域和设备**

把 `DevicesHome` 的局部 `area` 状态改为 `yard.activeYard.selectedArea`，区域数组改为 `['全部', ...yard.activeYard.areas]`。灯带名称、区域、可见性、开关、亮度、效果全部读取 `activeYard.light`。控制器逻辑设备继续从 `activeYard.controllerChannels` 生成。

```ts
const areas = ["全部", ...yard.activeYard.areas];
const area = yard.activeYard.selectedArea;
const setArea = yard.setSelectedArea;
const visibleLight = yard.activeYard.light.visible
  && (area === "全部" || yard.activeYard.light.area === area);
```

设备操作前调用权限判断；安装商只渲染 `membership.authorizedDeviceIds` 包含的设备。

- [ ] **Step 4: 场景页读取当前庭院并应用角色权限**

```tsx
<AppTopBar
  title="场景"
  subtitle={yard.activeYard.profile.name}
  action={yard.permissions.editScenes ? {
    label: "新建场景",
    testId: "create-scene",
    onClick: () => flow.push(sceneEditorScreen()),
  } : undefined}
/>
```

普通成员保留执行按钮但隐藏编辑菜单。临时安装商把卡片改为只读信息，不渲染执行和编辑按钮。空数组时按视觉模式渲染对应 `NightEmptyState` 或 `WarmEmptyState`。

- [ ] **Step 5: 自动化页读取当前庭院并应用角色权限**

标题副标题改为当前庭院名称。只有 `permissions.editAutomations` 为真时渲染创建入口和可操作的 `Switch`；其他角色仍可查看规则摘要，但开关 disabled，点击卡片不进入编辑页。无定时或联动时分别显示对应空状态。

- [ ] **Step 6: 添加两套空状态样式**

深色空状态使用墨蓝卡片、低饱和蓝灰图标和琥珀主按钮；暖白空状态使用暖白悬浮卡片、浅绿色图标底和庭院绿主按钮。不得让 `.warm-empty-state` 继承 `.night-empty-state` 的背景与边框。

- [ ] **Step 7: 运行测试并确认通过**

Run: `cd prototype && npx playwright test tests/yard-workspace.spec.ts -g "data and permissions"`

Expected: PASS。

Run: `cd prototype && npm run check:runtime && npx tsc --noEmit`

Expected: PASS。

- [ ] **Step 8: 提交跨 Tab 数据与权限**

```bash
git add prototype/src/Prototype.tsx prototype/src/prototype.css prototype/tests/yard-workspace.spec.ts
git commit -m "feat: isolate yard tabs and permissions"
```

---

### Task 4: 完成新建庭院流程和新庭院空状态

**Files:**
- Modify: `prototype/src/Prototype.tsx` after `MeHome`
- Modify: `prototype/src/prototype.css`
- Modify: `prototype/tests/yard-workspace.spec.ts`

**Interfaces:**
- Produces: `CreateYardInput = { name: string; city: string; timezone: string; areas: string[] }`。
- Produces: `YardState.createYard(input: CreateYardInput): string`，返回新庭院 id 并设为活动庭院。
- Produces: `CreateYardFlow` 负责草稿；`NightCreateYardView` 与 `WarmCreateYardView` 分别渲染。

- [ ] **Step 1: 写完整新建流程的失败测试**

```ts
test("creates an empty yard with location timezone and initial areas", async ({ page }) => {
  await openPrototype(page, "warm");
  await page.getByRole("button", { name: "切换庭院" }).click();
  await page.getByRole("button", { name: "新建庭院" }).click();

  await page.getByTestId("create-yard-name").fill("湖畔小院");
  await page.getByTestId("create-yard-next").click();
  await page.getByRole("button", { name: "杭州" }).click();
  await expect(page.getByTestId("create-yard-timezone")).toHaveText("Asia/Shanghai");
  await page.getByTestId("create-yard-next").click();
  await page.getByRole("button", { name: "前院" }).click();
  await page.getByRole("button", { name: "露台" }).click();
  await page.getByTestId("create-yard-next").click();
  await page.getByTestId("finish-create-yard").click();

  await expect(page.getByTestId("active-yard-name")).toHaveText("湖畔小院");
  await expect(page.getByText("还没有设备")).toBeVisible();
  await expect(page.getByRole("button", { name: "添加设备" })).toBeVisible();
  await page.getByTestId("tab-scenes").click();
  await expect(page.getByText("还没有场景")).toBeVisible();
  await page.getByTestId("tab-automation").click();
  await expect(page.getByText("还没有定时")).toBeVisible();
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `cd prototype && npx playwright test tests/yard-workspace.spec.ts -g "creates an empty yard"`

Expected: FAIL，“新建庭院”入口没有页面流程。

- [ ] **Step 3: 实现 `createYard` 数据动作**

```ts
const createYard = useCallback((input: CreateYardInput) => {
  const id = `yard-${Date.now()}`;
  const next = makeEmptyOwnerYard(id, input);
  setYards((current) => [...current, next]);
  setActiveYardId(id);
  return id;
}, []);
```

`makeEmptyOwnerYard` 必须创建 `visible: false` 的灯带、12 个未配置通道、空场景/定时/联动、`selectedArea: '全部'` 和所有者 membership。

- [ ] **Step 4: 实现四步共享草稿控制器**

`CreateYardFlow` 保存 `step`、`name`、`city`、`timezone`、`areas`、`error`。使用 `KeyboardInput` 输入名称，下一步前调用 `keyboard.hide()`。城市选择时自动设置时区，允许在第二步手动选择 `Asia/Shanghai`、`Asia/Tokyo`、`Europe/London`、`America/Los_Angeles`。

- [ ] **Step 5: 分别实现 Night/Warm 四步页面**

每个视觉组件都接收完整且相同的 props：

```ts
type CreateYardViewProps = {
  step: 1 | 2 | 3 | 4;
  name: string;
  city: string;
  timezone: string;
  areas: string[];
  error: string;
  onNameChange: (value: string) => void;
  onCityChange: (city: string, timezone: string) => void;
  onTimezoneChange: (timezone: string) => void;
  onToggleArea: (area: string) => void;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
};
```

Night 使用编号步骤条、深色输入卡和琥珀按钮；Warm 使用细线进度、暖白分组卡和庭院绿按钮。两套组件不能共享同一表单容器 DOM。

- [ ] **Step 6: 完成每步校验和返回行为**

- 第一步：去除首尾空格后名称不能为空。
- 第二步：城市和时区都必须有值。
- 第三步：至少选择一个初始区域。
- 第四步：显示名称、城市、时区和区域摘要；完成后把根 Tab 设为设备并调用 `flow.pop()` 返回已有根页，避免在栈中产生第二个 `root-tabs`。

庭院选择面板的“新建庭院”先关闭 `BottomSheet`，再调用 `flow.push(createYardScreen())`；`createYardScreen()` 使用 `headerHeight: 58`、对应视觉的固定返回头和 `CreateYardFlow` 内容。

- [ ] **Step 7: 添加双视觉流程样式并运行测试**

Run: `cd prototype && npx playwright test tests/yard-workspace.spec.ts -g "creates an empty yard"`

Expected: PASS。

Run: `cd prototype && npm run check:runtime && npx tsc --noEmit`

Expected: PASS。

- [ ] **Step 8: 提交新建庭院流程**

```bash
git add prototype/src/Prototype.tsx prototype/src/prototype.css prototype/tests/yard-workspace.spec.ts
git commit -m "feat: add create yard flow"
```

---

### Task 5: 完成邀请码与模拟扫码加入庭院

**Files:**
- Modify: `prototype/src/Prototype.tsx` after create-yard components
- Modify: `prototype/src/prototype.css`
- Modify: `prototype/tests/yard-workspace.spec.ts`

**Interfaces:**
- Produces: `InvitePreview`, `InviteLookupResult`。
- Produces: `YardState.lookupInvite(code: string): InviteLookupResult` 与 `YardState.acceptInvite(invite: InvitePreview): string`。
- Produces: `JoinYardFlow`、`NightJoinYardView`、`WarmJoinYardView`。

- [ ] **Step 1: 写正常、无效、过期和重复加入的失败测试**

```ts
test("joins a yard from a valid invitation", async ({ page }) => {
  await openPrototype(page);
  await page.getByRole("button", { name: "切换庭院" }).click();
  await page.getByRole("button", { name: "加入庭院" }).click();
  await page.getByTestId("join-yard-code").fill("GARDEN-NEW");
  await page.getByTestId("lookup-invite").click();
  await expect(page.getByText("四季庭院", { exact: true })).toBeVisible();
  await expect(page.getByText("普通成员", { exact: true })).toBeVisible();
  await page.getByTestId("accept-invite").click();
  await expect(page.getByTestId("active-yard-name")).toHaveText("四季庭院");
});

for (const entry of [
  { code: "NOT-FOUND", message: "邀请码无效" },
  { code: "EXPIRED-2026", message: "邀请码已过期" },
  { code: "PARENTS-2026", message: "你已加入该庭院" },
]) {
  test(`shows ${entry.message}`, async ({ page }) => {
    await openPrototype(page);
    await page.getByRole("button", { name: "切换庭院" }).click();
    await page.getByRole("button", { name: "加入庭院" }).click();
    await page.getByTestId("join-yard-code").fill(entry.code);
    await page.getByTestId("lookup-invite").click();
    await expect(page.getByRole("alert")).toHaveText(entry.message);
  });
}
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `cd prototype && npx playwright test tests/yard-workspace.spec.ts -g "invitation|joins a yard|邀请码|已加入"`

Expected: FAIL，加入入口没有查找和确认流程。

- [ ] **Step 3: 定义固定邀请数据和查找结果**

```ts
type InvitePreview = {
  code: string;
  yardId: string;
  yardName: string;
  inviter: string;
  city: string;
  timezone: string;
  membership: YardMembership;
  validUntil: string;
};

type InviteLookupResult =
  | { status: "ready"; invite: InvitePreview }
  | { status: "invalid" | "expired" | "joined"; message: string };
```

固定数据必须包含：`GARDEN-NEW`（有效的“四季庭院”普通成员邀请）、`EXPIRED-2026`（2026-07-31 过期）、`PARENTS-2026`（对应已存在的 `parents-yard`）。

- [ ] **Step 4: 实现输入邀请码与模拟扫码**

输入使用 `KeyboardInput`。点击“查询邀请”前隐藏键盘。点击“扫描二维码”直接把 `GARDEN-NEW` 写入草稿并显示预览，不请求浏览器相机权限。

- [ ] **Step 5: 实现 Night/Warm 加入页面与确认动作**

两套页面分别展示庭院名称、邀请人、角色、权限范围、所在地/时区和有效期。`acceptInvite` 根据邀请创建空的成员庭院工作空间，追加到 `yards`，设为活动庭院并返回设备根页。

- [ ] **Step 6: 运行加入流程测试**

Run: `cd prototype && npx playwright test tests/yard-workspace.spec.ts -g "invitation|joins a yard|邀请码|已加入"`

Expected: 4 tests PASS。

Run: `cd prototype && npm run check:runtime && npx tsc --noEmit`

Expected: PASS。

- [ ] **Step 7: 提交加入庭院流程**

```bash
git add prototype/src/Prototype.tsx prototype/src/prototype.css prototype/tests/yard-workspace.spec.ts
git commit -m "feat: add join yard invitation flow"
```

---

### Task 6: 完成庭院资料、时区和区域管理

**Files:**
- Modify: `prototype/src/Prototype.tsx` after join-yard components
- Modify: `prototype/src/prototype.css`
- Modify: `prototype/tests/yard-workspace.spec.ts`

**Interfaces:**
- Produces: `updateYardProfile(yardId: string, profile: YardProfile): void`、`addYardArea(yardId: string, name: string): boolean`、`renameYardArea(yardId: string, oldName: string, newName: string): boolean`、`removeYardArea(yardId: string, name: string): RemoveAreaResult`。
- Produces: `RemoveAreaResult = "removed" | "in-use" | "last-area" | "missing"`。
- Produces: `YardManagementFlow`、`NightYardManagementView`、`WarmYardManagementView`。

- [ ] **Step 1: 写所有者管理和非所有者只读的失败测试**

```ts
test("owner updates yard profile and cannot remove an area in use", async ({ page }) => {
  await openPrototype(page);
  await page.getByRole("button", { name: "切换庭院" }).click();
  await page.getByRole("button", { name: "管理当前庭院" }).click();
  await page.getByRole("button", { name: "庭院资料" }).click();
  await page.getByTestId("yard-profile-name").fill("我的花园");
  await page.getByTestId("save-yard-profile").click();
  await expect(page.getByRole("status")).toContainText("庭院资料已保存");

  await page.getByRole("button", { name: "区域管理" }).click();
  await page.getByRole("button", { name: "删除露台" }).click();
  await expect(page.getByRole("alert")).toHaveText("请先移动露台中的设备");
});

test("member sees read-only yard information", async ({ page }) => {
  await openPrototype(page);
  await page.getByRole("button", { name: "切换庭院" }).click();
  await page.getByRole("button", { name: /切换到父母家/ }).click();
  await page.getByRole("button", { name: "切换庭院" }).click();
  await page.getByRole("button", { name: "管理当前庭院" }).click();
  await expect(page.getByText("只读访问")).toBeVisible();
  await expect(page.getByTestId("save-yard-profile")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "退出庭院" })).toBeVisible();
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `cd prototype && npx playwright test tests/yard-workspace.spec.ts -g "yard profile|read-only"`

Expected: FAIL，管理入口和资料页尚不存在。

- [ ] **Step 3: 实现管理页摘要和权限分支**

管理页显示庭院资料、区域、成员/安装商、设备/场景/定时/联动数量。所有者看到编辑入口；成员与安装商看到只读信息和“退出庭院”。退出操作先打开确认 `BottomSheet`，确认后移除该庭院并切换到 `my-yard`。

- [ ] **Step 4: 实现庭院资料编辑与时区确认**

名称使用 `KeyboardInput`。所在地和时区使用选择按钮。若时区发生变化，保存前打开确认 Sheet，文案固定为“现有定时将按新时区执行”；确认后再写入 `profile`。保存成功后调用 `flow.pop()` 返回庭院管理摘要，使“区域管理”入口重新可见。

- [ ] **Step 5: 实现区域新增、重命名、排序和删除约束**

- 新增与重命名使用 `KeyboardInput`，去除首尾空格，不允许空名称或同名。
- 排序使用明确的“上移”“下移”按钮，不实现拖拽。
- 删除前检查灯带 area 与所有已配置 controller channel 的 area。
- 区域有设备时返回 `in-use`；只剩一个区域时返回 `last-area`；成功后若 `selectedArea` 被删则重置为“全部”。

- [ ] **Step 6: 分别实现 Night/Warm 管理页面样式**

Night 管理页使用深色分组卡、琥珀色可编辑标记和蓝灰统计；Warm 使用暖白悬浮卡、浅绿统计徽章和深绿动作。危险操作仅使用文字警示，不把退出按钮做成高饱和红色主按钮。

- [ ] **Step 7: 运行管理流程测试**

Run: `cd prototype && npx playwright test tests/yard-workspace.spec.ts -g "yard profile|read-only"`

Expected: 2 tests PASS。

Run: `cd prototype && npm run check:runtime && npx tsc --noEmit`

Expected: PASS。

- [ ] **Step 8: 提交庭院管理流程**

```bash
git add prototype/src/Prototype.tsx prototype/src/prototype.css prototype/tests/yard-workspace.spec.ts
git commit -m "feat: add yard profile and area management"
```

---

### Task 7: 接通成员权限、“我的”页面和授权到期状态

**Files:**
- Modify: `prototype/src/Prototype.tsx:1824-1836` and yard management components
- Modify: `prototype/src/prototype.css`
- Modify: `prototype/tests/yard-workspace.spec.ts`

**Interfaces:**
- Consumes: `activeYard.profile`, `activeYard.membership`, `permissions`。
- Produces: `isMembershipExpired(membership, now = Date.now()): boolean`。
- Produces: `updateInstallerAuthorization(yardId: string, memberId: string, deviceIds: string[], expiresAt: string): void`。
- Produces: `MembersPage`、`InstallerAuthorizationPage`、角色化 `MeHome` 和 `ExpiredMembershipNotice`。

- [ ] **Step 1: 写“我的”页和授权到期的失败测试**

```ts
test("me tab follows the active yard role and links to shared management", async ({ page }) => {
  await openPrototype(page);
  await page.getByRole("button", { name: "切换庭院" }).click();
  await page.getByRole("button", { name: /切换到父母家/ }).click();
  await page.getByTestId("tab-me").click();
  await expect(page.getByText("父母家 · 普通成员")).toBeVisible();
  await page.getByRole("button", { name: "庭院时区" }).click();
  await expect(page.getByText("Asia/Shanghai", { exact: true })).toBeVisible();
});

test("owner can inspect members and installer authorization", async ({ page }) => {
  await openPrototype(page);
  await page.getByTestId("tab-me").click();
  await page.getByRole("button", { name: "家庭与成员" }).click();
  await expect(page.getByText("林先生")).toBeVisible();
  await expect(page.getByText("王女士")).toBeVisible();
  await expect(page.getByText("安装服务")).toBeVisible();
  await page.getByRole("button", { name: "返回" }).click();

  await page.getByRole("button", { name: "临时安装商权限" }).click();
  await expect(page.getByText("DC12 控制器")).toBeVisible();
  await expect(page.getByText("2026-08-31")).toBeVisible();
  await expect(page.getByRole("button", { name: "保存授权" })).toBeVisible();
});

test("expired installer membership cannot become active", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-01T08:00:00+08:00"));
  await openPrototype(page);
  await page.getByRole("button", { name: "切换庭院" }).click();
  await page.getByRole("button", { name: /切换到客户庭院/ }).click();
  await expect(page.getByText("授权已到期")).toBeVisible();
  await expect(page.getByTestId("yard-app")).toHaveAttribute("data-yard-id", "my-yard");
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `cd prototype && npx playwright test tests/yard-workspace.spec.ts -g "me tab|inspect members|expired installer"`

Expected: FAIL，“我的”页仍为静态所有者信息，切换未检查有效期。

- [ ] **Step 3: 让 `MeHome` 全部读取活动庭院**

用户卡显示 `${activeYard.profile.name} · ${membership.roleLabel}`。设备管理数量、成员入口、临时安装商权限和庭院时区读取当前庭院。庭院资料、成员、权限、时区入口复用 Task 6 的管理子页面，不创建第二套数据和表单。

- [ ] **Step 4: 按角色隐藏“我的”页入口**

- 所有者：设备管理、家庭与成员、临时安装商权限、庭院时区均可进入。
- 普通成员：设备管理、成员、时区为只读；不显示临时安装商授权管理。
- 临时安装商：显示授权范围、有效期、设备管理和诊断；不显示家庭成员、庭院资料编辑、场景和自动化编辑入口。

- [ ] **Step 5: 实现成员列表与临时安装商授权页**

`MembersPage` 读取 `activeYard.members`，展示姓名、角色、状态和临时授权到期时间。所有者看到“生成成员邀请码”，点击后显示固定原型码 `MEMBER-8F2K`；成员和安装商进入时只读，不显示生成入口。

`InstallerAuthorizationPage` 只列出 `role === 'installer'` 的成员。所有者可以勾选 `controller` 与 `channel-1` 至 `channel-12`，并从 `7 天`、`30 天`、`自定义日期`中设置期限；点击“保存授权”调用 `updateInstallerAuthorization`。非所有者只显示当前授权范围和到期时间。

```ts
const updateInstallerAuthorization = useCallback((yardId: string, memberId: string, deviceIds: string[], expiresAt: string) => {
  setYards((current) => current.map((yard) => {
    if (yard.id !== yardId) return yard;
    const members = yard.members.map((member) => {
      if (member.id !== memberId || member.role !== "installer") return member;
      return { ...member, authorizedDeviceIds: deviceIds, expiresAt, status: "active" as const };
    });
    return { ...yard, members };
  }));
}, []);
```

- [ ] **Step 6: 在 `switchYard` 中阻止已到期授权**

```ts
const isMembershipExpired = (membership: YardMembership, now = Date.now()) =>
  Boolean(membership.expiresAt && new Date(membership.expiresAt).getTime() <= now);

const switchYard = useCallback((yardId: string) => {
  const target = yards.find((yard) => yard.id === yardId);
  if (!target) return "missing" as const;
  if (isMembershipExpired(target.membership)) return "expired" as const;
  setActiveYardId(yardId);
  return "switched" as const;
}, [yards]);
```

选择面板收到 `expired` 后保持原庭院、关闭选择列表并显示对应视觉的到期说明 Sheet；Sheet 只提供“知道了”。

- [ ] **Step 7: 运行成员、角色与到期测试**

Run: `cd prototype && npx playwright test tests/yard-workspace.spec.ts -g "me tab|inspect members|expired installer"`

Expected: 3 tests PASS。

Run: `cd prototype && npm run check:runtime && npx tsc --noEmit`

Expected: PASS。

- [ ] **Step 8: 提交成员、“我的”页和授权状态**

```bash
git add prototype/src/Prototype.tsx prototype/src/prototype.css prototype/tests/yard-workspace.spec.ts
git commit -m "feat: connect yard roles and membership expiry"
```

---

### Task 8: 补全双视觉覆盖、规格记录和完整回归

**Files:**
- Modify: `prototype/src/Prototype.tsx`
- Modify: `prototype/src/prototype.css`
- Modify: `prototype/tests/yard-workspace.spec.ts`
- Modify: `prototype/AGENTS.md` under `Project Design Decisions`

**Interfaces:**
- Consumes: 前七个任务的全部庭院流程。
- Produces: 两种视觉的同功能覆盖测试、稳定的测试选择器和项目决策记录。

- [ ] **Step 1: 添加关键流程在两种视觉下都可达的回归测试**

```ts
for (const visual of ["night", "warm"] as const) {
  test(`${visual} exposes all yard entry points`, async ({ page }) => {
    await openPrototype(page, visual);
    await page.getByRole("button", { name: "切换庭院" }).click();
    await expect(page.getByRole("button", { name: "新建庭院" })).toBeVisible();
    await expect(page.getByRole("button", { name: "加入庭院" })).toBeVisible();
    await expect(page.getByRole("button", { name: "管理当前庭院" })).toBeVisible();
    await expect(page.getByTestId(`${visual}-yard-switcher`)).toBeVisible();
  });
}

test("visual switching preserves a non-default yard and its device state", async ({ page }) => {
  await openPrototype(page);
  await page.getByRole("button", { name: "切换庭院" }).click();
  await page.getByRole("button", { name: /切换到父母家/ }).click();
  await page.getByRole("switch", { name: /灯/ }).first().click();
  const before = await page.getByRole("switch", { name: /灯/ }).first().getAttribute("aria-checked");

  await page.getByRole("button", { name: "暖白" }).click();

  await expect(page.getByTestId("yard-app")).toHaveAttribute("data-yard-id", "parents-yard");
  await expect(page.getByRole("switch", { name: /灯/ }).first()).toHaveAttribute("aria-checked", before ?? "false");
});
```

- [ ] **Step 2: 运行测试并修正仅一套视觉可达的功能缺口**

Run: `cd prototype && npx playwright test tests/yard-workspace.spec.ts`

Expected: 全部测试 PASS。若失败，只修正测试指出的功能、权限、可访问名称或状态保持问题；不在此任务进行用户负责的像素级视觉验收。

- [ ] **Step 3: 检查双视觉类名和共享边界**

Run: `cd prototype && rg -n "Night(Yard|Create|Join)|Warm(Yard|Create|Join)|night-yard-|warm-yard-" src/Prototype.tsx src/prototype.css`

Expected: 选择、新建、加入、管理和空状态均同时存在 Night/Warm 实现；不存在只有 `.visual-warm` 换色而没有 Warm 视图组件的庭院页面。

- [ ] **Step 4: 把庭院决策写入 `AGENTS.md`**

在 `Project Design Decisions` 增加一条完整决策：庭院是独立工作空间；切换时设备、区域、场景、定时、联动、时区和权限整体切换；所有者、成员和临时安装商使用权限表；深色与暖白庭院页面保持独立视觉组件；视觉验收由用户完成。

- [ ] **Step 5: 执行完整功能与运行时回归**

Run: `cd prototype && npm run check:runtime`

Expected: PASS。

Run: `cd prototype && npx playwright test tests/yard-workspace.spec.ts`

Expected: PASS。

Run: `cd prototype && npm run test:runtime`

Expected: 现有移动运行时测试全部 PASS。

Run: `cd prototype && npm run build`

Expected: TypeScript、Vite 构建和 Sites 打包退出码均为 0，生成 `dist/client/index.html`、`dist/server/index.js` 与 `dist/.openai/hosting.json`。

- [ ] **Step 6: 检查工作区只包含计划内文件**

Run: `git status --short`

Expected: 仅列出 `prototype/src/Prototype.tsx`、`prototype/src/prototype.css`、`prototype/tests/yard-workspace.spec.ts`、`prototype/AGENTS.md`，以及构建流程原本就忽略的产物；不得出现受保护运行时文件。

- [ ] **Step 7: 提交完整庭院功能**

```bash
git add prototype/src/Prototype.tsx prototype/src/prototype.css prototype/tests/yard-workspace.spec.ts prototype/AGENTS.md
git commit -m "feat: complete dual-style yard management"
```

## Final Acceptance Checklist

- [ ] 三个预置庭院可以切换，且四个主 Tab 始终读取同一个活动庭院。
- [ ] 切换回原庭院后，设备开关、区域筛选和自动化启停状态保持原值。
- [ ] 所有者、普通成员、临时安装商的入口和操作权限符合设计规格。
- [ ] 新建庭院走完名称、所在地/时区、区域和确认四步，并进入空庭院首页。
- [ ] 邀请码正常、无效、过期和重复加入状态均可到达。
- [ ] 庭院资料、时区、区域和成员/安装商摘要从同一管理模块读取。
- [ ] 非空区域不能删除，时区变更需要二次确认。
- [ ] 安装商授权到期后不能切换进入客户庭院。
- [ ] 深色和暖白均具备独立的选择、新建、加入、管理和空状态视图。
- [ ] 切换视觉后保留活动庭院和庭院内业务状态。
- [ ] `npm run check:runtime`、庭院功能测试、现有运行时测试和 `npm run build` 全部通过。
- [ ] 不修改任何受保护移动运行时文件。
