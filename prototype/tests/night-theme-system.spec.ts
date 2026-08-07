import { expect, test, type Page } from "@playwright/test";

type SurfaceMetrics = {
  backgroundColor: string;
  borderColor: string;
  color: string;
};

async function surfaceMetrics(page: Page, selector: string): Promise<SurfaceMetrics> {
  return page.locator(selector).first().evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      borderColor: style.borderColor,
      color: style.color,
    };
  });
}

test("night visual system stays consistent across root pages, details and sheets", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("yard-app")).toHaveAttribute("data-visual", "night");

  const tokens = await page.getByTestId("yard-app").evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      canvas: style.getPropertyValue("--night-canvas").trim(),
      surface: style.getPropertyValue("--night-surface").trim(),
      text: style.getPropertyValue("--night-text").trim(),
      accent: style.getPropertyValue("--night-accent").trim(),
    };
  });

  expect(tokens).toEqual({
    canvas: "#0e161d",
    surface: "#151d24",
    text: "#f3f2ee",
    accent: "#deb365",
  });

  await page.getByTestId("tab-scenes").click();
  await expect(page.getByTestId("yard-app")).toHaveAttribute("data-active-tab", "scenes");
  expect((await surfaceMetrics(page, ".root-page > .flush-section")).backgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect(await surfaceMetrics(page, ".scene-card")).toMatchObject({
    backgroundColor: "rgb(21, 29, 36)",
    color: "rgb(243, 242, 238)",
  });
  expect((await surfaceMetrics(page, ".execution-summary")).backgroundColor).toBe("rgb(21, 29, 36)");
  expect(await page.locator(".execution-summary").evaluate((element) => getComputedStyle(element).borderRadius)).toBe("16px");

  await page.getByTestId("tab-automation").click();
  expect((await surfaceMetrics(page, ".automation-tabs")).backgroundColor).toBe("rgb(18, 27, 35)");
  expect(await surfaceMetrics(page, ".rule-card")).toMatchObject({
    backgroundColor: "rgb(21, 29, 36)",
    color: "rgb(243, 242, 238)",
  });
  expect((await surfaceMetrics(page, ".automation-status")).backgroundColor).toBe("rgb(43, 41, 36)");

  await page.getByTestId("tab-me").click();
  expect(await surfaceMetrics(page, ".profile-card")).toMatchObject({
    backgroundColor: "rgb(21, 29, 36)",
    color: "rgb(243, 242, 238)",
  });
  expect((await surfaceMetrics(page, ".root-page > .flush-section")).backgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect((await surfaceMetrics(page, ".root-page > .flush-section > .settings-list")).backgroundColor).toBe("rgb(21, 29, 36)");

  await page.getByTestId("open-device-management").click();
  await expect(page.locator(".detail-header strong")).toHaveText("设备管理");
  expect((await surfaceMetrics(page, ".detail-header")).backgroundColor).toBe("rgb(14, 22, 29)");
  expect((await surfaceMetrics(page, ".management-summary")).backgroundColor).toBe("rgb(21, 29, 36)");
  expect((await surfaceMetrics(page, ".physical-device-list > button")).backgroundColor).toBe("rgb(21, 29, 36)");

  await page.getByTestId("detail-back").click();
  await page.getByTestId("tab-devices").click();
  await page.getByTestId("add-device").click();
  await expect(page.getByTestId("bottom-sheet")).toBeVisible();
  expect((await surfaceMetrics(page, "[data-testid='bottom-sheet']")).backgroundColor).toBe("rgb(21, 31, 39)");
});

test("warm visual keeps its independent light surfaces", async ({ page }) => {
  await page.goto("/?visual=warm");
  await page.getByTestId("tab-scenes").click();

  const sceneSurface = await surfaceMetrics(page, ".scene-card");
  expect(sceneSurface.backgroundColor).toBe("rgb(255, 255, 255)");
  expect(sceneSurface.color).not.toBe("rgb(243, 242, 238)");
});

test("night detail cards keep primary and inset surfaces visually separate", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "打开庭院氛围灯详情", exact: true }).click();

  expect((await surfaceMetrics(page, ".light-group-hero")).backgroundColor).toBe("rgb(21, 29, 36)");
  expect((await surfaceMetrics(page, ".light-group-control-section")).backgroundColor).toBe("rgb(21, 29, 36)");
  expect((await surfaceMetrics(page, ".light-group-color-grid button")).backgroundColor).toBe("rgb(17, 26, 33)");
  expect((await surfaceMetrics(page, ".light-group-member-list > div")).backgroundColor).toBe("rgb(17, 26, 33)");
});

test("scene editor action cards read as inset controls inside the primary section", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("tab-scenes").click();
  await page.getByTestId("create-scene").click();
  await page.locator(".scene-editor-page .select-list > button").first().click();

  expect((await surfaceMetrics(page, ".scene-editor-page > .content-section:nth-of-type(2)")).backgroundColor).toBe("rgb(21, 29, 36)");
  expect((await surfaceMetrics(page, ".scene-editor-page .step-list > button")).backgroundColor).toBe("rgb(17, 26, 33)");
  expect(await page.locator(".scene-editor-page .step-list > button").evaluate((element) => getComputedStyle(element).borderRadius)).toBe("13px");
});

test("night yard switcher uses the current raised, inset and accent surfaces", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "切换庭院", exact: true }).click();

  expect((await surfaceMetrics(page, ".bottom-sheet:has(.night-yard-switcher)")).backgroundColor).toBe("rgb(29, 40, 50)");
  expect((await surfaceMetrics(page, ".night-yard-option:not([aria-current='true'])")).backgroundColor).toBe("rgb(17, 26, 33)");
  expect((await surfaceMetrics(page, ".night-yard-option[aria-current='true']")).backgroundColor).toBe("rgb(43, 41, 36)");
  expect((await surfaceMetrics(page, ".night-yard-actions .secondary-button")).backgroundColor).toBe("rgb(21, 29, 36)");
});
