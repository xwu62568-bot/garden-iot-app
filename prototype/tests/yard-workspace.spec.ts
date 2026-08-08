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

for (const visual of ["night", "warm"] as const) {
  test(`${visual} yard switcher changes the complete workspace`, async ({ page }) => {
    await openPrototype(page, visual);
    await page.getByRole("button", { name: "切换庭院" }).first().click();
    await expect(page.getByTestId(`${visual}-yard-switcher`)).toBeVisible();
    await expect(page.getByText("父母家", { exact: true })).toBeVisible();
    await expect(page.getByText(/家庭账号 · 用户/).first()).toBeVisible();

    await page.getByRole("button", { name: /切换到父母家/ }).click();

    await expect(page.getByTestId("yard-app")).toHaveAttribute("data-yard-id", "parents-yard");
    await expect(page.getByTestId("active-yard-name")).toHaveText("父母家");
    await expect(page.getByRole("status")).toContainText("已切换至父母家");
  });
}

test("yard data and permissions stay isolated across all root tabs", async ({ page }) => {
  await openPrototype(page);
  await page.getByRole("button", { name: "切换庭院" }).click();
  await page.getByRole("button", { name: /切换到父母家/ }).click();

  await expect(page.getByRole("button", { name: "后院" })).toHaveCount(0);
  await page.getByTestId("tab-scenes").click();
  await expect(page.getByText("父母家", { exact: true })).toBeVisible();
  await expect(page.getByTestId("create-scene")).toBeVisible();
  await expect(page.getByRole("button", { name: /点击立即执行/ }).first()).toBeEnabled();

  await page.getByTestId("tab-automation").click();
  await expect(page.getByTestId("create-schedule")).toBeVisible();
  await expect(page.getByRole("switch").first()).toBeEnabled();

  await page.getByTestId("tab-devices").click();
  await page.getByRole("button", { name: "切换庭院" }).click();
  await page.getByRole("button", { name: /切换到我的庭院/ }).click();
  await expect(page.getByText("露台灯带", { exact: true })).toBeVisible();
  await expect(page.getByText("父母家廊灯", { exact: true })).toHaveCount(0);
});

test("single-page yard creation auto-detects timezone and submits once", async ({ page }) => {
  await openPrototype(page, "warm");
  await page.getByRole("button", { name: "切换庭院" }).click();
  await page.getByRole("button", { name: "新建庭院" }).click();

  const systemTimezone = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  await expect(page.getByTestId("create-yard-single-page")).toBeVisible();
  await expect(page.getByTestId("create-yard-next")).toHaveCount(0);
  await expect(page.getByTestId("create-yard-timezone-trigger")).toContainText(systemTimezone);

  await page.getByTestId("create-yard-name").fill("湖畔小院");
  await page.getByTestId("create-yard-location-trigger").click();
  await page.getByRole("button", { name: "中国 · 杭州", exact: true }).click();
  await expect(page.getByTestId("create-yard-timezone-trigger")).toContainText("Asia/Shanghai");
  await page.getByTestId("create-yard-timezone-trigger").click();
  await page.getByRole("button", { name: "Asia/Tokyo", exact: true }).click();
  await expect(page.getByTestId("create-yard-timezone-trigger")).toContainText("已手动选择");
  await page.getByTestId("flow-current").getByRole("button", { name: "前院" }).click();
  await page.getByTestId("flow-current").getByRole("button", { name: "露台" }).click();
  await page.getByTestId("finish-create-yard").click();

  await expect(page.getByTestId("active-yard-name")).toHaveText("湖畔小院");
  await expect(page.getByText("还没有设备")).toBeVisible();
  await expect(page.getByTestId("add-device")).toBeVisible();
  await page.getByTestId("tab-scenes").click();
  await expect(page.getByText("还没有场景")).toBeVisible();
  await page.getByTestId("tab-automation").click();
  await expect(page.getByText("还没有定时")).toBeVisible();
});

for (const visual of ["night", "warm"] as const) {
  test(`${visual} yard switcher keeps actions outside the scrollable list`, async ({ page }) => {
    await openPrototype(page, visual);
    await page.getByRole("button", { name: "切换庭院" }).first().click();

    const sheet = page.getByTestId("bottom-sheet");
    const list = page.locator(".yard-switcher-scroll");
    const actions = page.locator(".yard-switcher-fixed-actions");
    await expect(list).toBeVisible();
    await expect(actions).toBeVisible();
    await expect(actions.getByRole("button", { name: "新建庭院" })).toBeVisible();
    await expect(actions.getByRole("button", { name: "管理当前庭院" })).toBeVisible();

    const metrics = await page.evaluate(() => {
      const sheetElement = document.querySelector('[data-testid="bottom-sheet"]') as HTMLElement;
      const listElement = document.querySelector(".yard-switcher-scroll") as HTMLElement;
      const listContentElement = listElement.firstElementChild as HTMLElement;
      const actionsElement = document.querySelector(".yard-switcher-fixed-actions") as HTMLElement;
      return {
        overflowY: getComputedStyle(listElement).overflowY,
        listClientHeight: listElement.clientHeight,
        listContentHeight: listContentElement.offsetHeight,
        actionsBottom: actionsElement.getBoundingClientRect().bottom,
        sheetBottom: sheetElement.getBoundingClientRect().bottom,
        shellScrollWidth: (sheetElement.querySelector(".yard-switcher-shell") as HTMLElement).scrollWidth,
        shellClientWidth: (sheetElement.querySelector(".yard-switcher-shell") as HTMLElement).clientWidth,
      };
    });
    const buttonHeights = await actions.getByRole("button").evaluateAll((buttons) => buttons.map((button) => (button as HTMLElement).offsetHeight));
    expect(metrics.overflowY).toBe("auto");
    expect(metrics.listClientHeight).toBeLessThanOrEqual(metrics.listContentHeight + 1);
    expect(metrics.actionsBottom).toBeLessThanOrEqual(metrics.sheetBottom);
    expect(metrics.shellScrollWidth).toBeLessThanOrEqual(metrics.shellClientWidth);
    expect(buttonHeights.every((height) => height <= 52)).toBe(true);
    await expect(sheet).toBeVisible();
  });
}

test("yard management uses profile area and member tabs with area summaries", async ({ page }) => {
  await openPrototype(page, "warm");
  await page.getByRole("button", { name: "切换庭院" }).click();
  await page.getByRole("button", { name: "管理当前庭院" }).click();

  const management = page.getByTestId("yard-management");
  await expect(management.getByRole("tab", { name: "资料" })).toBeVisible();
  await expect(management.getByRole("tab", { name: "区域" })).toHaveAttribute("aria-selected", "true");
  await expect(management.getByRole("tab", { name: "成员" })).toBeVisible();
  await expect(management.getByTestId("yard-area-card-前院")).toContainText("庭院路径灯");
  await expect(management.getByTestId("yard-area-card-前院")).toContainText("庭院门");

  await management.getByTestId("yard-area-card-前院").click();
  await expect(page.getByRole("heading", { name: "前院" })).toBeVisible();
  await page.getByTestId("detail-back").click();
  await management.getByRole("tab", { name: "成员" }).click();
  await expect(management.getByText("安装服务", { exact: true })).toBeVisible();
});

test("area detail moves a dry-contact logical device and updates home filtering", async ({ page }) => {
  await openPrototype(page, "warm");
  await page.getByRole("button", { name: "切换庭院" }).click();
  await page.getByRole("button", { name: "管理当前庭院" }).click();
  await page.getByTestId("yard-area-card-前院").click();
  await page.getByTestId("area-device-channel-1").click();
  await page.getByRole("button", { name: "后院", exact: true }).click();
  await page.getByTestId("save-logical-device-area").click();
  await expect(page.getByRole("status")).toContainText("庭院门已移动到后院");

  await page.getByTestId("detail-back").click();
  await expect(page.getByTestId("yard-area-card-后院")).toContainText("庭院门");
  await page.getByTestId("detail-back").click();
  await page.getByLabel("庭院区域").getByRole("button", { name: "前院", exact: true }).click();
  await expect(page.getByTestId("device-gate")).toHaveCount(0);
  await page.getByLabel("庭院区域").getByRole("button", { name: "后院", exact: true }).click();
  await expect(page.getByTestId("device-gate")).toBeVisible();
});

test("joins a yard from a valid invitation", async ({ page }) => {
  await openPrototype(page);
  await page.getByRole("button", { name: "切换庭院" }).click();
  await page.getByRole("button", { name: "加入庭院" }).click();
  await page.getByTestId("join-yard-code").fill("GARDEN-NEW");
  await page.getByTestId("lookup-invite").click();
  await expect(page.getByText("四季庭院", { exact: true })).toBeVisible();
  await expect(page.getByText("用户", { exact: true }).first()).toBeVisible();
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

test("owner updates yard profile and cannot remove an area in use", async ({ page }) => {
  await openPrototype(page);
  await page.getByRole("button", { name: "切换庭院" }).click();
  await page.getByRole("button", { name: "管理当前庭院" }).click();
  await page.getByRole("tab", { name: "资料" }).click();
  await page.getByRole("button", { name: "庭院资料" }).click();
  await page.getByTestId("yard-profile-name").fill("我的花园");
  await page.getByTestId("save-yard-profile").click();
  await expect(page.getByRole("status")).toContainText("庭院资料已保存");

  await page.getByRole("tab", { name: "区域" }).click();
  await page.getByTestId("yard-area-card-露台").click();
  await page.getByRole("button", { name: "删除露台" }).click();
  await expect(page.getByRole("alert")).toContainText("个设备仍在使用此区域");
});

test("user can edit while guest is strictly read-only", async ({ page }) => {
  await openPrototype(page);
  await page.getByRole("button", { name: "切换庭院" }).click();
  await page.getByRole("button", { name: /切换到父母家/ }).click();
  await page.getByRole("button", { name: "切换庭院" }).click();
  await page.getByRole("button", { name: "管理当前庭院" }).click();
  await expect(page.getByText("只读访问")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "添加区域" })).toBeVisible();
  await page.getByTestId("detail-back").click();

  await page.getByRole("button", { name: "切换庭院" }).click();
  await page.getByRole("button", { name: /切换到回访庭院/ }).click();
  await expect(page.getByTestId("add-device")).toHaveCount(0);
  await expect(page.getByRole("switch").first()).toBeDisabled();
  await page.getByRole("button", { name: "切换庭院" }).click();
  await page.getByRole("button", { name: "管理当前庭院" }).click();
  await expect(page.getByText("只读访问")).toBeVisible();
  await page.getByRole("tab", { name: "资料" }).click();
  await expect(page.getByRole("button", { name: "退出庭院" })).toBeVisible();
});

test("me tab follows the active yard role and links to shared management", async ({ page }) => {
  await openPrototype(page);
  await page.getByTestId("tab-me").click();
  await expect(page.getByText("庭院拥有者", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /成员与权限/ })).toContainText("管理");

  await page.getByRole("button", { name: /成员与权限/ }).click();
  await expect(page.getByText(/林先生（当前账号）/)).toBeVisible();
  await expect(page.getByText("王女士", { exact: true })).toBeVisible();
  await expect(page.getByText("安装服务", { exact: true })).toBeVisible();
  await expect(page.getByTestId("add-yard-member")).toBeVisible();
  await expect(page.getByTestId("transfer-yard")).toBeVisible();
});

test("installer identity uses the same owner user and guest roles", async ({ page }) => {
  await openPrototype(page);
  await page.getByRole("button", { name: "切换庭院" }).click();
  await expect(page.getByRole("button", { name: /切换到客户庭院/ })).toContainText("安装商账号 · 用户");
  await expect(page.getByRole("button", { name: /切换到待交付庭院/ })).toContainText("安装商账号 · 拥有者");
  await expect(page.getByRole("button", { name: /切换到回访庭院/ })).toContainText("安装商账号 · 访客");
});

test("owner can add a member and transfer the unique ownership", async ({ page }) => {
  await openPrototype(page);
  await page.getByTestId("tab-me").click();
  await page.getByRole("button", { name: /成员与权限/ }).click();
  await page.getByTestId("add-yard-member").click();
  await page.getByTestId("new-yard-member-name").fill("赵师傅");
  await page.getByRole("button", { name: "安装商账号", exact: true }).click();
  await page.locator(".member-role-choices").getByRole("button", { name: /访客/ }).click();
  await page.getByTestId("confirm-add-yard-member").click();
  await expect(page.getByText("赵师傅（当前账号）")).toHaveCount(0);
  await expect(page.getByTestId("yard-members-page")).toContainText("赵师傅");

  await page.getByTestId("transfer-yard").click();
  await page.locator(".transfer-target-list").getByRole("button", { name: /安装服务/ }).click();
  await page.getByTestId("confirm-transfer-yard").click();
  await expect(page.getByRole("status")).toContainText("你现在是访客");
  await page.getByTestId("tab-me").click();
  await expect(page.getByText("访客", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /成员与权限/ })).toContainText("5 人");
});

test("both visual entry points preserve the active yard workspace", async ({ page }) => {
  await openPrototype(page, "night");
  await page.getByRole("button", { name: "切换庭院" }).click();
  await page.getByRole("button", { name: /切换到父母家/ }).click();
  await expect(page.getByText("父母家廊灯", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "暖白" }).click();
  await expect(page.getByTestId("yard-app")).toHaveAttribute("data-visual", "warm");
  await expect(page.getByTestId("yard-app")).toHaveAttribute("data-yard-id", "parents-yard");
  await expect(page.getByTestId("active-yard-name")).toHaveText("父母家");
  await expect(page.getByText("父母家廊灯", { exact: true })).toBeVisible();
});
