import { test, expect } from "@playwright/test";
import { gameCatalog } from "../src/components/gameCatalog";
import { chooseGame, expectScreenFits, join, returnHome } from "./ui";
import { expectStableScreenshot } from "./screenshot";

const next = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: "Next games", exact: true });

test("all fourteen illustrated cards fit phones and landscape iPads", async ({
  page,
}) => {
  for (const size of [
    { width: 320, height: 568 },
    { width: 402, height: 874 },
    { width: 440, height: 956 },
    { width: 844, height: 390 },
    { width: 1180, height: 820 },
    { width: 1080, height: 810 },
  ]) {
    await page.setViewportSize(size);
    await page.goto("./");
    await page.getByLabel("Your name").fill("A family member with a long name");
    await page
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    const seen: string[] = [];
    let index = 0;
    do {
      const cards = page.locator(".game-choice");
      seen.push(
        ...(await cards.evaluateAll((elements) =>
          elements.map((e) => e.getAttribute("data-game")!),
        )),
      );
      await expect(cards.locator("svg")).toHaveCount(await cards.count());
      await expectScreenFits(page);
      const bounds = await cards.evaluateAll((elements) =>
        elements.map((el) => {
          const r = el.getBoundingClientRect();
          return {
            width: r.width,
            height: r.height,
            clipped:
              el.scrollHeight > el.clientHeight + 1 ||
              el.scrollWidth > el.clientWidth + 1,
          };
        }),
      );
      for (const bound of bounds) {
        expect(bound.width).toBeGreaterThanOrEqual(44);
        expect(bound.height).toBeGreaterThanOrEqual(44);
        expect(bound.clipped).toBe(false);
      }
      if (size.width === 402)
        await expectStableScreenshot(
          page,
          "main",
          `library-page-${index + 1}-phone-${process.platform}.png`,
          { maxDiffPixels: 250 },
        );
      if (size.width === 1180 && index === 0)
        await expectStableScreenshot(
          page,
          "main",
          `library-ipad-${process.platform}.png`,
          { maxDiffPixels: 250 },
        );
      await page.screenshot({
        path: `test-results/library-${size.width}-${index + 1}.png`,
      });
      const alternate = await page.addStyleTag({
        content: ":root { font-family: Arial, sans-serif; line-height: 1.6; }",
      });
      await expectScreenFits(page);
      const tallerBounds = await cards.evaluateAll((elements) =>
        elements.map((el) => ({
          game: el.getAttribute("data-game"),
          clipped:
            el.scrollHeight > el.clientHeight + 1 ||
            el.scrollWidth > el.clientWidth + 1,
        })),
      );
      expect(
        tallerBounds.filter((bound) => bound.clipped),
        `${size.width}×${size.height} page ${index + 1} taller fonts`,
      ).toEqual([]);
      await alternate.evaluate((el) => el.remove());
      index++;
      if (!(await next(page).isEnabled())) break;
      await next(page).click();
    } while (index < 5);
    expect(seen).toEqual(gameCatalog.map((g) => g.kind));
    await returnHome(page);
  }
});

test("Choose Game restores position and focus through resize and a fresh room resets it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 402, height: 874 });
  await page.goto("./");
  await page.getByRole("button", { name: "Create Game", exact: true }).click();
  await chooseGame(page, "Light Seek");
  await expect(
    page.getByRole("button", { name: "Start Seek", exact: true }),
  ).toBeDisabled();
  await expect(page.locator("#seek-start-guidance")).toHaveText(
    "Needs 1 more player",
  );
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.getByRole("button", { name: "Choose Game", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Light Seek", exact: true }),
  ).toBeFocused();
  await expect(page.locator(".library-pages")).toContainText("Page 3 of 3");
  await chooseGame(page, "Sumo Bumpers"); // navigation helper can travel backward
  await page.getByRole("button", { name: "Choose Game", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sumo Bumpers", exact: true }),
  ).toBeFocused();
  await next(page).click();
  await page.setViewportSize({ width: 402, height: 874 });
  await expect(
    page.getByRole("button", { name: "Reaction Race", exact: true }),
  ).toBeVisible();
  await returnHome(page);
  await page.getByRole("button", { name: "Create Game", exact: true }).click();
  await expect(page.locator(".library-pages")).toContainText("Page 1 of 4");
});

test("roster guidance updates after real pairing and exact-two is distinct from spectator seats", async ({
  browser,
  page: host,
}) => {
  const contexts = await Promise.all(
    [0, 1].map(() =>
      browser.newContext({ viewport: { width: 402, height: 874 } }),
    ),
  );
  try {
    const [alex, sam] = await Promise.all(contexts.map((c) => c.newPage()));
    await host.goto("./");
    await host
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    await expect(host.locator("#card-sumo")).toContainText(
      "Needs 1 more player",
    );
    await join(host, alex, "Alex");
    await expect(host.locator("#card-sumo")).not.toContainText("Needs");
    await chooseGame(host, "Light Seek");
    await expect(
      host.getByRole("button", { name: "Start Seek", exact: true }),
    ).toBeEnabled();
    await host
      .getByRole("button", { name: "Choose Game", exact: true })
      .click();
    await join(host, sam, "Sam");
    await chooseGame(host, "Light Seek");
    await expect(
      host.getByRole("button", { name: "Start Seek", exact: true }),
    ).toBeDisabled();
    await expect(host.locator("#seek-start-guidance")).toHaveText(
      "Exactly 2 connected players needed; 3 are connected",
    );
    await host
      .getByRole("button", { name: "Choose Game", exact: true })
      .click();
    await expect(host.locator("#card-seek")).toContainText("3 are connected");
    await chooseGame(host, "Pong");
    await host
      .getByLabel("Player 1", { exact: true })
      .selectOption({ label: "Alex" });
    await host
      .getByLabel("Player 2", { exact: true })
      .selectOption({ label: "Alex" });
    await expect(host.locator("#pong-start-guidance")).toHaveText(
      "Choose different players for each seat.",
    );
    await expect(
      host.getByRole("button", { name: "Start Pong", exact: true }),
    ).toBeDisabled();
    await host
      .getByLabel("Player 2", { exact: true })
      .selectOption({ label: "Sam" });
    await expect(host.locator("#pong-start-guidance")).toContainText(
      "You are watching",
    );
    await host.getByRole("button", { name: "Start Pong", exact: true }).click();
    await expect(host.locator(".spectator-status")).toBeVisible();
    await host
      .getByRole("button", { name: "Choose Game", exact: true })
      .click();
    await expect(
      alex.getByRole("region", { name: "Game picker" }),
    ).toBeVisible();
    await next(alex).click();
    await expect(alex.locator(".game-choice:enabled")).toHaveCount(0);
    await expectStableScreenshot(
      alex,
      "main",
      `library-client-phone-${process.platform}.png`,
      { maxDiffPixels: 250 },
    );
    await returnHome(sam);
    await expect(
      host.getByRole("button", { name: "Players", exact: true }),
    ).toHaveText("2/8");
    await chooseGame(host, "Light Seek");
    await expect(
      host.getByRole("button", { name: "Start Seek", exact: true }),
    ).toBeEnabled();
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});

test("eight connected players and reduced-motion keyboard focus remain readable", async ({
  page: host,
  browser,
}) => {
  test.setTimeout(60_000);
  await host.setViewportSize({ width: 402, height: 874 });
  await host.emulateMedia({ reducedMotion: "reduce" });
  const contexts = await Promise.all(
    Array.from({ length: 7 }, () => browser.newContext()),
  );
  try {
    await host.goto("./");
    await host.getByLabel("Your name").fill("Alex with a long family name");
    await host
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    for (const [index, context] of contexts.entries())
      await join(
        host,
        await context.newPage(),
        `Family member ${index + 1} with a long name`,
      );
    await expect(
      host.getByRole("button", { name: "Players", exact: true }),
    ).toHaveText("8/8");
    await next(host).click();
    await next(host).click();
    await next(host).click();
    await host
      .getByRole("button", { name: "Previous games", exact: true })
      .press("Shift+Tab");
    await expect(
      host.getByRole("button", { name: "Glow Clash", exact: true }),
    ).toBeFocused();
    await expect(host.locator("#card-seek")).toContainText("8 are connected");
    await expect(host.locator("#card-glow")).not.toContainText("Needs");
    await expectScreenFits(host);
    await expectStableScreenshot(
      host,
      "main",
      `library-eight-focus-reduced-${process.platform}.png`,
      { maxDiffPixels: 250 },
    );
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
