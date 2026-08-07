import { expect, test, type Page } from "@playwright/test";

async function openPrototype(page: Page, visual: "night" | "warm" = "night") {
  await page.goto(visual === "warm" ? "/?visual=warm" : "/");
  await expect(page.getByTestId("yard-app")).toHaveAttribute("data-visual", visual);
}

for (const visual of ["night", "warm"] as const) {
  test(`${visual} light group supports mixed state and shared controls`, async ({ page }) => {
    await openPrototype(page, visual);
    await expect(page.getByTestId("light-group-group-ambience")).toContainText("庭院氛围灯");
    await page.getByRole("button", { name: "打开庭院氛围灯详情" }).click();
    const detail = page.getByTestId("flow-current");
    await expect(detail.getByRole("heading", { name: "庭院氛围灯" })).toBeVisible();
    await expect(detail.getByText("2/2 在线", { exact: true })).toBeVisible();

    await detail.getByRole("switch", { name: "露台灯带开关" }).click();
    await expect(detail.getByText(/部分设备开启/)).toBeVisible();

    await detail.getByRole("slider", { name: "灯光组亮度" }).fill("42");
    await expect(detail.getByText("42%", { exact: true })).toBeVisible();
    await detail.getByRole("button", { name: "夕阳" }).click();
    await expect(page.getByRole("status")).toContainText("颜色已调整为夕阳");
  });
}

for (const visual of ["night", "warm"] as const) {
  test(`${visual} light device area can be changed from device settings`, async ({ page }) => {
    await openPrototype(page, visual);
    await page.getByTestId("tab-me").click();
    await page.getByTestId("open-device-management").click();
    await page.getByTestId("managed-light-path-lights").click();
    await page.getByRole("button", { name: "设置" }).click();

    const settings = page.getByTestId("light-device-settings");
    await expect(settings.getByRole("heading", { name: "所属区域" })).toBeVisible();
    await settings.getByRole("button", { name: "后院", exact: true }).click();
    await settings.getByTestId("save-light-device-area").click();
    await expect(page.getByRole("status")).toContainText("所属区域已更新为后院");

    await page.getByTestId("detail-back").click();
    await expect(page.getByTestId("managed-light-path-lights")).toContainText("PL100 · 6 盏 · 后院");
  });

  test(`${visual} device management layout keeps inset independent group cards`, async ({ page }) => {
    await openPrototype(page, visual);
    await page.getByTestId("tab-me").click();
    await page.getByTestId("open-device-management").click();

    const pageLayout = page.locator(".device-management-page");
    const section = page.locator(".light-group-management-section");
    const heading = section.locator(".management-section-heading");
    const card = page.getByTestId("management-light-group-group-ambience");

    await expect(section).not.toHaveClass(/content-section/);
    await expect(card).toHaveClass(/management-light-group-card/);

    const metrics = await pageLayout.evaluate((element) => {
      const groupSection = element.querySelector(".light-group-management-section") as HTMLElement;
      const sectionHeading = groupSection.querySelector(".management-section-heading") as HTMLElement;
      const groupCard = groupSection.querySelector(".management-light-group-card") as HTMLElement;
      const headingStyle = getComputedStyle(sectionHeading);
      const cardStyle = getComputedStyle(groupCard);
      return {
        pageClientWidth: element.clientWidth,
        pageScrollWidth: element.scrollWidth,
        headingLeft: Number.parseFloat(headingStyle.paddingLeft),
        headingRight: Number.parseFloat(headingStyle.paddingRight),
        cardLeft: Number.parseFloat(cardStyle.paddingLeft),
        cardRight: Number.parseFloat(cardStyle.paddingRight),
      };
    });

    expect(metrics.pageScrollWidth).toBeLessThanOrEqual(metrics.pageClientWidth);
    expect(metrics.headingLeft).toBeGreaterThanOrEqual(4);
    expect(metrics.headingRight).toBeGreaterThanOrEqual(4);
    expect(metrics.cardLeft).toBeGreaterThanOrEqual(16);
    expect(metrics.cardRight).toBeGreaterThanOrEqual(16);
  });
}

test("warm add menu uses warm cards outside the app theme container", async ({ page }) => {
  await openPrototype(page, "warm");
  await page.getByTestId("add-device").click();

  const cards = page.locator(".add-choice-list > button");
  await expect(cards).toHaveCount(2);
  const surfaces = await cards.evaluateAll((elements) => elements.map((element) => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, color: style.color };
  }));

  expect(surfaces).toEqual([
    { background: "rgb(255, 254, 251)", color: "rgb(32, 57, 35)" },
    { background: "rgb(255, 254, 251)", color: "rgb(32, 57, 35)" },
  ]);
});

test("light group editor content stays within the mobile viewport", async ({ page }) => {
  await openPrototype(page, "warm");
  await page.getByTestId("add-device").click();
  await page.getByTestId("create-light-group").click();

  const editor = page.locator(".light-group-editor-page");
  const dimensions = await editor.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});

for (const visual of ["night", "warm"] as const) {
  test(`${visual} individual light detail keeps the shared switch geometry`, async ({ page }) => {
    await openPrototype(page, visual);
    await page.getByTestId("tab-me").click();
    await page.getByTestId("open-device-management").click();
    await page.getByRole("button", { name: /庭院路径灯/ }).click();

    const dimensions = await page.getByRole("switch", { name: "庭院路径灯开关" }).evaluate((element) => {
      const thumb = element.querySelector("span");
      return {
        width: (element as HTMLElement).offsetWidth,
        height: (element as HTMLElement).offsetHeight,
        thumbWidth: (thumb as HTMLElement).offsetWidth,
        thumbHeight: (thumb as HTMLElement).offsetHeight,
      };
    });

    expect(dimensions).toEqual({ width: 51, height: 30, thumbWidth: 22, thumbHeight: 22 });
  });

  test(`${visual} channel settings keep nested switches at toggle dimensions`, async ({ page }) => {
    await openPrototype(page, visual);
    await page.getByTestId("tab-me").click();
    await page.getByTestId("open-device-management").click();
    await page.getByRole("button", { name: /12 路干接点控制器/ }).first().click();
    await page.getByTestId("channel-2").click();

    const dimensions = await page.locator(".channel-toggle-list .app-switch").evaluateAll((elements) => elements.map((element) => ({
      width: (element as HTMLElement).offsetWidth,
      height: (element as HTMLElement).offsetHeight,
    })));

    expect(dimensions).toEqual([
      { width: 51, height: 30 },
      { width: 51, height: 30 },
      { width: 51, height: 30 },
    ]);
  });
}

test("owner creates and edits a light group from the devices add menu", async ({ page }) => {
  await openPrototype(page);
  await page.getByTestId("add-device").click();
  await page.getByTestId("create-light-group").click();
  const editor = page.getByTestId("flow-current");
  await editor.getByTestId("light-group-name").fill("前院路径灯组");
  await editor.getByRole("button", { name: /^露台灯带/ }).click();
  await editor.getByRole("button", { name: /^庭院路径灯/ }).click();
  await editor.getByRole("button", { name: "前院", exact: true }).click();
  await editor.getByTestId("save-light-group").click();

  await expect(page.getByRole("status")).toContainText("灯光组已创建");
  await expect(page.getByTestId(/light-group-light-group-/)).toContainText("前院路径灯组");
  await page.getByRole("button", { name: "打开前院路径灯组详情" }).click();
  await page.getByTestId("edit-light-group").click();
  await expect(page.getByTestId("light-group-name")).toHaveValue("前院路径灯组");
});

test("light groups are available to scenes schedules and linkage actions", async ({ page }) => {
  await openPrototype(page);
  await page.getByTestId("tab-scenes").click();
  await page.getByTestId("create-scene").click();
  await expect(page.getByRole("button", { name: /庭院氛围灯/ })).toBeVisible();
  await page.getByTestId("detail-back").click();

  await page.getByTestId("tab-automation").click();
  await page.getByTestId("create-schedule").click();
  await page.getByText("点击更换设备", { exact: true }).click();
  await expect(page.getByRole("button", { name: "庭院氛围灯", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "取消" }).click();
  await page.getByRole("button", { name: "返回" }).click();

  await page.getByRole("button", { name: "联动", exact: true }).click();
  await page.getByTestId("create-linkage").click();
  await page.locator(".builder-card.action .builder-content").first().click();
  await expect(page.getByRole("button", { name: "庭院氛围灯", exact: true })).toBeVisible();
});
