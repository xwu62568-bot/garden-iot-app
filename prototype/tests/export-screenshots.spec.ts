import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

type VisualMode = "night" | "warm";

type ScreenshotStep = {
  index: number;
  slug: string;
  run: (page: Page, visual: VisualMode) => Promise<void>;
};

const SCREENSHOT_DIR = path.join(process.cwd(), "exports", "screenshots");

async function openPrototype(page: Page, visual: VisualMode) {
  await page.goto(visual === "warm" ? "/?visual=warm" : "/");
  await expect(page.getByTestId("yard-app")).toBeVisible();
  await expect(page.getByTestId("yard-app")).toHaveAttribute("data-visual", visual);
  await expect(page.getByTestId("yard-app")).toHaveAttribute("data-yard-id", "my-yard");
}

async function ensureIphone(page: Page) {
  const picker = page.getByTestId("device-picker");
  const label = (await picker.textContent())?.trim() ?? "";
  if (label.includes("iPhone")) return;
  await picker.click();
  await page.getByTestId("device-option-iphone").click();
  await expect(picker).toContainText("iPhone");
}

async function capture(page: Page, visual: VisualMode, index: number, slug: string) {
  const dir = path.join(SCREENSHOT_DIR, visual);
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${String(index).padStart(2, "0")}-${slug}.png`;
  const target = path.join(dir, filename);
  await page.waitForTimeout(300);
  await page.getByTestId("device-screen").screenshot({ path: target });
}

async function dismissOverlays(page: Page) {
  for (let i = 0; i < 3; i += 1) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(120);
  }
}

async function goDevicesRoot(page: Page) {
  await page.getByTestId("tab-devices").click();
  await expect(page.getByTestId("device-lightstrip")).toBeVisible();
}

async function popToRoot(page: Page) {
  await dismissOverlays(page);
  for (let i = 0; i < 8; i += 1) {
    const detailBack = page.getByTestId("detail-back");
    if ((await detailBack.count()) === 0) break;
    if (!(await detailBack.first().isVisible())) break;
    await detailBack.first().click({ timeout: 5_000 });
    await page.waitForTimeout(200);
  }
  await goDevicesRoot(page);
}

async function openYardSwitcher(page: Page, visual: VisualMode) {
  await page.getByRole("button", { name: "切换庭院" }).click();
  await expect(page.getByTestId(`${visual}-yard-switcher`)).toBeVisible();
}

async function openYardManagement(page: Page, visual: VisualMode) {
  await popToRoot(page);
  await openYardSwitcher(page, visual);
  await page.getByRole("button", { name: "管理当前庭院" }).click();
  await expect(page.getByText("庭院资料").first()).toBeVisible();
}

const STEPS: ScreenshotStep[] = [
  {
    index: 1,
    slug: "devices-home",
    run: async (page) => {
      await goDevicesRoot(page);
    },
  },
  {
    index: 2,
    slug: "scenes-home",
    run: async (page) => {
      await page.getByTestId("tab-scenes").click();
      await expect(page.getByTestId("scene-run-dinner")).toBeVisible();
    },
  },
  {
    index: 3,
    slug: "automation-schedules",
    run: async (page) => {
      await page.getByTestId("tab-automation").click();
      await page.locator(".automation-tabs").getByRole("button", { name: "定时" }).click();
      await expect(page.getByText("日落路径灯", { exact: true }).first()).toBeVisible();
    },
  },
  {
    index: 4,
    slug: "automation-linkages",
    run: async (page) => {
      await page.getByTestId("tab-automation").click();
      await page.locator(".automation-tabs").getByRole("button", { name: "联动" }).click();
      await expect(page.getByText("开门照明", { exact: true }).first()).toBeVisible();
    },
  },
  {
    index: 5,
    slug: "me-home",
    run: async (page) => {
      await page.getByTestId("tab-me").click();
      await expect(page.getByText("庭院所有者", { exact: true }).first()).toBeVisible();
    },
  },
  {
    index: 6,
    slug: "light-detail",
    run: async (page) => {
      await goDevicesRoot(page);
      await page.getByTestId("device-lightstrip").locator(".device-card-main").click();
      await expect(page.getByTestId("detail-back")).toBeVisible();
      await expect(page.getByText("露台灯带").first()).toBeVisible();
    },
  },
  {
    index: 7,
    slug: "fountain-detail",
    run: async (page) => {
      await popToRoot(page);
      await page.getByTestId("device-fountain").locator(".device-card-main").click();
      await expect(page.getByTestId("detail-back")).toBeVisible();
    },
  },
  {
    index: 8,
    slug: "gate-detail",
    run: async (page) => {
      await popToRoot(page);
      await page.getByTestId("device-gate").locator(".device-card-main").click();
      await expect(page.getByTestId("detail-back")).toBeVisible();
    },
  },
  {
    index: 9,
    slug: "irrigation-detail",
    run: async (page) => {
      await popToRoot(page);
      await page.getByTestId("device-irrigation").locator(".device-card-main").click();
      await expect(page.getByTestId("detail-back")).toBeVisible();
    },
  },
  {
    index: 10,
    slug: "add-device",
    run: async (page) => {
      await popToRoot(page);
      await page.getByTestId("add-device").click();
      await expect(page.getByText("附近设备").first()).toBeVisible();
    },
  },
  {
    index: 11,
    slug: "scene-editor",
    run: async (page) => {
      await popToRoot(page);
      await page.getByTestId("tab-scenes").click();
      await page.getByTestId("create-scene").click();
      await expect(page.getByTestId("scene-name")).toBeVisible();
    },
  },
  {
    index: 12,
    slug: "schedule-editor",
    run: async (page) => {
      await popToRoot(page);
      await page.getByTestId("tab-automation").click();
      await page.locator(".automation-tabs").getByRole("button", { name: "定时" }).click();
      await page.getByTestId("create-schedule").click();
      await expect(page.getByTestId("schedule-name")).toBeVisible();
    },
  },
  {
    index: 13,
    slug: "linkage-editor",
    run: async (page) => {
      await popToRoot(page);
      await page.getByTestId("tab-automation").click();
      await page.locator(".automation-tabs").getByRole("button", { name: "联动" }).click();
      await page.getByTestId("create-linkage").click();
      await expect(page.getByTestId("linkage-name")).toBeVisible();
    },
  },
  {
    index: 14,
    slug: "yard-switcher",
    run: async (page, visual) => {
      await popToRoot(page);
      await openYardSwitcher(page, visual);
    },
  },
  {
    index: 15,
    slug: "create-yard",
    run: async (page, visual) => {
      await popToRoot(page);
      await openYardSwitcher(page, visual);
      await page.getByRole("button", { name: "新建庭院" }).click();
      await expect(page.getByTestId("create-yard-name")).toBeVisible();
    },
  },
  {
    index: 16,
    slug: "join-yard",
    run: async (page, visual) => {
      await popToRoot(page);
      await openYardSwitcher(page, visual);
      await page.getByRole("button", { name: "加入庭院" }).click();
      await expect(page.getByTestId("join-yard-code")).toBeVisible();
    },
  },
  {
    index: 17,
    slug: "yard-management",
    run: async (page, visual) => {
      await openYardManagement(page, visual);
    },
  },
  {
    index: 18,
    slug: "yard-profile",
    run: async (page, visual) => {
      await openYardManagement(page, visual);
      await page.getByRole("button", { name: "庭院资料" }).click();
      await expect(page.getByTestId("yard-profile-name")).toBeVisible();
    },
  },
  {
    index: 19,
    slug: "area-management",
    run: async (page, visual) => {
      await openYardManagement(page, visual);
      await page.getByRole("button", { name: "区域管理" }).click();
      await expect(page.getByText("个区域").first()).toBeVisible();
    },
  },
  {
    index: 20,
    slug: "members",
    run: async (page, visual) => {
      await openYardManagement(page, visual);
      await page.getByRole("button", { name: "家庭与成员" }).click();
      await expect(page.getByText("林先生", { exact: true })).toBeVisible();
    },
  },
  {
    index: 21,
    slug: "installer-authorization",
    run: async (page, visual) => {
      await openYardManagement(page, visual);
      await page.getByRole("button", { name: "临时安装商权限" }).click();
      await expect(page.getByText("DC12 控制器", { exact: true })).toBeVisible();
    },
  },
  {
    index: 22,
    slug: "device-management",
    run: async (page) => {
      await popToRoot(page);
      await page.getByTestId("tab-me").click();
      await page.getByTestId("open-device-management").click();
      await expect(page.getByRole("button", { name: /12 路干接点控制器/ }).first()).toBeVisible();
    },
  },
  {
    index: 23,
    slug: "controller-detail",
    run: async (page) => {
      await popToRoot(page);
      await page.getByTestId("tab-me").click();
      await page.getByTestId("open-device-management").click();
      await page.getByRole("button", { name: /12 路干接点控制器/ }).first().click();
      await expect(page.getByTestId("channel-1").first()).toBeVisible();
    },
  },
  {
    index: 24,
    slug: "channel-editor",
    run: async (page) => {
      await popToRoot(page);
      await page.getByTestId("tab-me").click();
      await page.getByTestId("open-device-management").click();
      await page.getByRole("button", { name: /12 路干接点控制器/ }).first().click();
      await page.getByTestId("channel-1").first().click();
      await expect(page.getByTestId("save-channel").first()).toBeVisible();
    },
  },
  {
    index: 25,
    slug: "sheet-gate-confirm",
    run: async (page) => {
      await popToRoot(page);
      await page.getByTestId("quick-gate").click();
      await expect(page.getByTestId("confirm-gate-open")).toBeVisible();
    },
  },
  {
    index: 26,
    slug: "sheet-irrigation",
    run: async (page) => {
      if (await page.getByRole("button", { name: "取消" }).count()) {
        await page.getByRole("button", { name: "取消" }).click();
      } else {
        await page.keyboard.press("Escape");
      }
      await expect(page.getByTestId("confirm-gate-open")).toHaveCount(0);
      await page.getByTestId("quick-irrigation").click();
      await expect(page.getByTestId("confirm-irrigation")).toBeVisible();
    },
  },
];

test.beforeAll(() => {
  expect(STEPS).toHaveLength(26);
});

for (const visual of ["night", "warm"] as const) {
  test(`exports ${visual} full screenshot set`, async ({ page }) => {
    test.setTimeout(180_000);
    await openPrototype(page, visual);
    await ensureIphone(page);

    for (const step of STEPS) {
      await step.run(page, visual);
      await capture(page, visual, step.index, step.slug);
    }

    await page.keyboard.press("Escape");
  });
}
