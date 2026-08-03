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
