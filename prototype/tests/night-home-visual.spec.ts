import { expect, test } from "@playwright/test";

test("night devices home uses the immersive garden visual layer without affecting warm mode", async ({ page }) => {
  await page.goto("/");

  const nightHome = page.getByTestId("night-devices-home");
  await expect(nightHome).toBeVisible();
  await expect(nightHome.getByRole("button", { name: "切换庭院" })).toBeVisible();
  await expect(nightHome.getByLabel("庭院运行状态")).toBeVisible();

  const nightMetrics = await page.evaluate(() => {
    const home = document.querySelector('[data-testid="night-devices-home"]') as HTMLElement;
    const hero = home.querySelector(".garden-hero") as HTMLElement;
    const card = document.querySelector(".devices-page .device-card") as HTMLElement;
    const nav = document.querySelector(".bottom-nav") as HTMLElement;
    return {
      backgroundImage: getComputedStyle(home).backgroundImage,
      heroHeight: hero.offsetHeight,
      cardBackground: getComputedStyle(card).backgroundImage,
      cardSurface: getComputedStyle(card).backgroundColor,
      cardBorder: getComputedStyle(card).borderColor,
      titleColor: getComputedStyle(card.querySelector(".device-title") as HTMLElement).color,
      metaColor: getComputedStyle(card.querySelector(".device-meta") as HTMLElement).color,
      navRadius: Number.parseFloat(getComputedStyle(nav).borderTopLeftRadius),
      lightCardGlowDisplay: getComputedStyle(document.querySelector(".devices-page .light-card-glow") as HTMLElement).display,
    };
  });

  expect(nightMetrics.backgroundImage).toContain("night-garden-hero-final");
  expect(nightMetrics.backgroundImage).not.toContain("linear-gradient");
  expect(nightMetrics.heroHeight).toBeGreaterThanOrEqual(210);
  expect(nightMetrics.cardBackground).toContain("radial-gradient");
  expect(nightMetrics.cardSurface).toBe("rgb(21, 29, 36)");
  expect(nightMetrics.cardBorder).not.toBe("rgba(255, 255, 255, 0.025)");
  expect(nightMetrics.titleColor).toBe("rgb(241, 241, 238)");
  expect(nightMetrics.metaColor).toBe("rgb(159, 163, 166)");
  expect(nightMetrics.navRadius).toBeGreaterThanOrEqual(28);
  expect(nightMetrics.lightCardGlowDisplay).toBe("none");
  await expect(page.locator(".night-group-photo")).toHaveAttribute("src", /night-garden-hero-final/);

  await page.goto("/?visual=warm");
  await expect(page.getByTestId("night-devices-home")).toHaveCount(0);
  await expect(page.locator(".warm-devices-top")).toBeVisible();
  await expect(page.locator(".night-group-photo")).toHaveCount(0);
});
