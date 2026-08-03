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
