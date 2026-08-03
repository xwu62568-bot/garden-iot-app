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
    await expect(page.getByText(/普通成员/).first()).toBeVisible();

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
  await expect(page.getByTestId("create-scene")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /点击立即执行/ }).first()).toBeEnabled();

  await page.getByTestId("tab-automation").click();
  await expect(page.getByTestId("create-schedule")).toHaveCount(0);
  await expect(page.getByRole("switch").first()).toBeDisabled();

  await page.getByTestId("tab-devices").click();
  await page.getByRole("button", { name: "切换庭院" }).click();
  await page.getByRole("button", { name: /切换到我的庭院/ }).click();
  await expect(page.getByText("露台灯带", { exact: true })).toBeVisible();
  await expect(page.getByText("父母家廊灯", { exact: true })).toHaveCount(0);
});

test("creates an empty yard with location timezone and initial areas", async ({ page }) => {
  await openPrototype(page, "warm");
  await page.getByRole("button", { name: "切换庭院" }).click();
  await page.getByRole("button", { name: "新建庭院" }).click();

  await page.getByTestId("create-yard-name").fill("湖畔小院");
  await page.getByTestId("create-yard-next").click();
  await page.getByRole("button", { name: "杭州" }).click();
  await expect(page.getByTestId("create-yard-timezone")).toContainText("Asia/Shanghai");
  await page.getByTestId("create-yard-next").click();
  await page.getByTestId("flow-current").getByRole("button", { name: "前院" }).click();
  await page.getByTestId("flow-current").getByRole("button", { name: "露台" }).click();
  await page.getByTestId("create-yard-next").click();
  await page.getByTestId("finish-create-yard").click();

  await expect(page.getByTestId("active-yard-name")).toHaveText("湖畔小院");
  await expect(page.getByText("还没有设备")).toBeVisible();
  await expect(page.getByTestId("add-device")).toBeVisible();
  await page.getByTestId("tab-scenes").click();
  await expect(page.getByText("还没有场景")).toBeVisible();
  await page.getByTestId("tab-automation").click();
  await expect(page.getByText("还没有定时")).toBeVisible();
});

test("joins a yard from a valid invitation", async ({ page }) => {
  await openPrototype(page);
  await page.getByRole("button", { name: "切换庭院" }).click();
  await page.getByRole("button", { name: "加入庭院" }).click();
  await page.getByTestId("join-yard-code").fill("GARDEN-NEW");
  await page.getByTestId("lookup-invite").click();
  await expect(page.getByText("四季庭院", { exact: true })).toBeVisible();
  await expect(page.getByText(/普通成员/).first()).toBeVisible();
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

test("me tab follows the active yard role and links to shared management", async ({ page }) => {
  await openPrototype(page);
  await page.getByTestId("tab-me").click();
  await expect(page.getByText("庭院所有者", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /家庭与成员/ })).toContainText("3 人");

  await page.getByRole("button", { name: /家庭与成员/ }).click();
  await expect(page.getByText("林先生", { exact: true })).toBeVisible();
  await expect(page.getByText("王女士", { exact: true })).toBeVisible();
  await expect(page.getByText("安装服务", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "返回" }).click();
  await page.getByRole("button", { name: /临时安装商权限/ }).click();
  await expect(page.getByText("DC12 控制器", { exact: true })).toBeVisible();
  await expect(page.getByText("2026-08-31", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "保存授权" })).toBeVisible();
});

test("expired installer membership cannot become active", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-01T08:00:00+08:00"));
  await openPrototype(page);
  await page.getByRole("button", { name: "切换庭院" }).click();
  await page.getByRole("button", { name: /切换到客户庭院/ }).click();
  await expect(page.getByRole("status")).toContainText("授权已到期");
  await expect(page.getByTestId("yard-app")).toHaveAttribute("data-yard-id", "my-yard");
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
