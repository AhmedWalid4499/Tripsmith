import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** Fail on serious or critical WCAG 2 A/AA violations. */
async function expectAccessible(page: Page, context: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  const summary = serious.map(
    (v) =>
      `${v.id}: ${v.help} (${v.nodes
        .map((n) => n.target.join(" "))
        .slice(0, 3)
        .join(", ")})`,
  );
  expect(summary, `accessibility violations on ${context}`).toEqual([]);
}

function isoDaysFromNow(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

test("a guest plans a trip, watches it build, and edits it", async ({ page }) => {
  await page.goto("/");
  await expectAccessible(page, "landing page");
  await page.getByRole("main").getByRole("link", { name: "Plan a trip" }).first().click();

  // Step 1: where
  await expect(page.getByRole("heading", { name: "Where are you going?" })).toBeVisible();
  await expectAccessible(page, "trip form");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Where would you like to go?")).toBeVisible(); // validation
  await page.getByLabel("Destination").fill("Rome and Florence");
  await page.getByLabel("Leaving from").fill("Cairo");
  await page.getByRole("button", { name: "Next" }).click();

  // Step 2: when
  await page.getByLabel("Start date").fill(isoDaysFromNow(60));
  await page.getByLabel("End date").fill(isoDaysFromNow(65));
  await expect(page.getByText("6 days, 5 nights")).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();

  // Step 3: who & budget
  await page.getByRole("button", { name: "More travellers" }).click(); // 3 travellers
  await page.getByLabel("Total budget for the trip").fill("6000");
  await page.getByRole("button", { name: /Mid-range/ }).click();
  await page.getByRole("button", { name: "Next" }).click();

  // Step 4: interests
  await page.getByRole("button", { name: "History" }).click();
  await page.getByRole("button", { name: "Food & drink" }).click();
  await page.getByRole("button", { name: "Next" }).click();

  // Step 5: passport
  await page.getByRole("combobox", { name: "Passport nationality" }).click();
  await page.getByRole("option", { name: "United States", exact: true }).click();
  await page.getByRole("button", { name: "Plan my trip" }).click();

  // Live progress, then the planner
  await expect(page).toHaveURL(/\/trips\/[a-z0-9]+$/);
  await expect(page.getByRole("progressbar", { name: "Plan progress" })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Itinerary/ })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("6 days: Rome & Florence");
  await expect(page.getByText("This trip isn't saved yet.")).toBeVisible();
  await expectAccessible(page, "trip planner");

  const days = page.locator("section[aria-labelledby^='day-']");
  await expect(days).toHaveCount(6);

  // Move the last item of day 2 to day 3 through the item menu
  const day2Items = page.locator(
    "section[aria-labelledby='day-2-heading'] button[aria-label^='Move ']",
  );
  const before = await day2Items.count();
  const lastTitle = (await day2Items.last().getAttribute("aria-label"))!.replace(/^Move /, "");
  await page.getByRole("button", { name: `Options for ${lastTitle}` }).click();
  await page.getByRole("menuitem", { name: "Move to another day" }).click();
  await page.getByRole("menuitem", { name: /^Day 3/ }).click();
  await expect(page.getByText("Moved to Day 3")).toBeVisible();
  await expect(day2Items).toHaveCount(before - 1);
  await expect(
    page.locator("section[aria-labelledby='day-3-heading']").getByText(lastTitle),
  ).toBeVisible();

  // Pick a pricier hotel: the budget in the header updates
  const budgetLine = page.locator("header li").nth(2);
  const budgetBefore = await budgetLine.textContent();
  await page.getByRole("tab", { name: /Stays/ }).click();
  await page.getByRole("button", { name: /^Choose Hotel Hassler/ }).click();
  await expect(page.getByText(/chosen\. Your budget is updated/)).toBeVisible();
  await expect(budgetLine).not.toHaveText(budgetBefore!);

  // Visa: US passport → curated, with the official link and disclaimer
  await page.getByRole("tab", { name: /Visa/ }).click();
  await expect(page.getByText("No visa needed")).toBeVisible();
  await expect(page.getByText("Verify before you travel.", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Visto per l'Italia/ })).toHaveAttribute(
    "href",
    "https://vistoperitalia.esteri.it",
  );

  // Checklist: tick the first task
  await page.getByRole("tab", { name: /Checklist/ }).click();
  await page.getByRole("checkbox").first().click();
  await expect(page.getByRole("tab", { name: /Checklist/ })).toContainText("1/");

  // Budget tab renders the chart table
  await page.getByRole("tab", { name: /Budget/ }).click();
  await expect(page.getByRole("table", { name: /Estimated cost by category/ })).toBeVisible();
  await expectAccessible(page, "budget tab");

  // Sharing needs an account
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByRole("link", { name: "Sign in to share" }),
  ).toBeVisible();
});

test("other public pages are accessible and private trips stay private", async ({ page }) => {
  for (const path of ["/signin", "/signin/check-email"]) {
    await page.goto(path);
    await expectAccessible(page, path);
  }
  await page.goto("/trips/not-a-real-trip");
  await expect(page.getByText("This page took a wrong turn")).toBeVisible();
  await page.goto("/t/nope-AAAAAAAAAAAA");
  await expect(page.getByText("This page took a wrong turn")).toBeVisible();
  const res = await page.request.get("/api/health");
  expect(res.status()).toBe(200);
});
