import { expect, test, type Page } from "@playwright/test";
import {
  chooseGame,
  expectScreenFits,
  join,
  showHelp,
  closePanels,
} from "./ui";
import { expectStableScreenshot } from "./screenshot";

const sizes = [
  { width: 390, height: 844 },
  { width: 320, height: 700 },
  { width: 320, height: 568 },
  { width: 844, height: 390 },
  { width: 768, height: 1024 },
  { width: 1280, height: 720 },
];
async function fit(page: Page, label: string) {
  for (const size of sizes) {
    await page.setViewportSize(size);
    const style = await page.addStyleTag({
      content: ":root {font-family:serif;line-height:1.6}",
    });
    await expectScreenFits(page);
    const metrics = await page.locator(".reaction-game-card").evaluate((e) => ({
      h: e.clientHeight,
      sh: e.scrollHeight,
      w: e.clientWidth,
      sw: e.scrollWidth,
    }));
    expect(metrics.sh).toBeLessThanOrEqual(metrics.h + 1);
    expect(metrics.sw).toBeLessThanOrEqual(metrics.w + 1);
    for (const button of await page
      .locator(".reaction-game-card")
      .getByRole("button")
      .all()) {
      const b = await button.evaluate((e) =>
        e.getBoundingClientRect().toJSON(),
      );
      expect(b.width).toBeGreaterThanOrEqual(44);
      expect(b.height).toBeGreaterThanOrEqual(44);
      expect(b.y + b.height).toBeLessThanOrEqual(size.height);
    }
    await page.screenshot({
      path: `test-results/race-${label}-${size.width}x${size.height}.png`,
    });
    await style.evaluate((e) => e.remove());
  }
  await page.setViewportSize(sizes[0]);
}
async function advance(page: Page, phase: string) {
  for (let i = 0; i < 65; i++) {
    if (
      (await page.locator(".reaction-game-card").getAttribute("data-phase")) ===
      phase
    )
      return;
    await page.clock.runFor(100);
  }
  throw new Error(`Race did not reach ${phase}`);
}

test("Race shows immediate cues, exact hit rewards, keyboard input, misses and stable targets", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  await page.goto("./");
  await page.getByLabel("Your name").fill("Alex");
  await page.getByRole("button", { name: "Create Game", exact: true }).click();
  await chooseGame(page, "Reaction Race");
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await fit(page, "ready");
  // Same layout notice as a waiting service worker; lifecycle is covered in updates.spec.
  await page.evaluate(() => {
    const banner = document.createElement("aside");
    banner.className = "banner race-update-fixture";
    banner.textContent = "An update is ready in Menu when you’re done playing.";
    document.querySelector("main > header")!.after(banner);
  });
  await fit(page, "update-notice");
  await page.evaluate(() =>
    document.querySelector(".race-update-fixture")!.remove(),
  );

  await showHelp(page);
  await expect(
    page.getByText(/Faster correct hits earn up to 100/),
  ).toBeVisible();
  await closePanels(page);
  await page.getByRole("button", { name: "Start Race", exact: true }).click();
  const target = page.getByRole("button", { name: "Target 1", exact: true });
  const before = await target.evaluate((e) =>
    e.getBoundingClientRect().toJSON(),
  );
  await expect(page.locator(".race-target.lit,.race-target.decoy")).toHaveCount(
    0,
  );
  await advance(page, "active");
  expect(
    await target.evaluate((e) => e.getBoundingClientRect().toJSON()),
  ).toEqual(before);
  await expect(target).toContainText("TAP");
  await target.press("Tab");
  await target.press("Enter");
  await expect(page.locator(".race-feedback")).toHaveText(
    "Hit · +100 pts · 0 ms",
  );
  await expect(target).toBeDisabled();
  await expect(page.locator(".race-dashboard")).toContainText("100 pts");
  await expectStableScreenshot(
    page,
    ".reaction-game-card",
    `race-hit-${process.platform}.png`,
    { maxDiffPixels: 250 },
  );
  await fit(page, "hit");
  await advance(page, "results");
  await advance(page, "waiting");
  await expect(
    page.locator(".race-target.mistake,.race-target.intended"),
  ).toHaveCount(0);
  await advance(page, "active");
  await advance(page, "results");
  await expect(page.locator(".race-feedback")).toHaveText("Missed · 0 pts");
  for (const size of sizes) {
    await advance(page, "waiting");
    await page.setViewportSize(size);
    // Read DOM bounds directly: compositor boxes can lag after emulated rotation.
    const font = await page.addStyleTag({
      content: ":root {font-family:serif;line-height:1.6}",
    });
    const bounds = await target.evaluate((e) =>
      e.getBoundingClientRect().toJSON(),
    );
    await advance(page, "active");
    expect(
      await target.evaluate((e) => e.getBoundingClientRect().toJSON()),
    ).toEqual(bounds);
    await advance(page, "results");
    expect(
      await target.evaluate((e) => e.getBoundingClientRect().toJSON()),
    ).toEqual(bounds);
    await expectScreenFits(page);
    await font.evaluate((e) => e.remove());
  }

  await page.getByRole("button", { name: "Stop Race", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Start Race", exact: true }),
  ).toBeVisible();
});

test("Race keeps eight shared winners readable, scrolls standings and rematches", async ({
  page: host,
  browser,
}) => {
  test.setTimeout(180000);
  const contexts = [];
  await host.addInitScript(() => {
    Math.random = () => 0;
  });
  await host.goto("./");
  await host.getByLabel("Your name").fill("Alexandria");
  await host.getByRole("button", { name: "Create Game", exact: true }).click();
  try {
    for (const name of [
      "Emma",
      "Benjamin",
      "Charlotte",
      "Theodore",
      "Margaret",
      "Josephine",
      "Alexander",
    ]) {
      const context = await browser.newContext();
      contexts.push(context);
      await join(host, await context.newPage(), name);
    }
    await chooseGame(host, "Reaction Race");
    await host.emulateMedia({ reducedMotion: "reduce" });
    await host.clock.install();
    await host.clock.pauseAt(new Date(Date.now() + 1000));
    await host.setViewportSize(sizes[0]);
    await host.getByRole("button", { name: "Start Race", exact: true }).click();
    for (let round = 1; round <= 10; round++) {
      await advance(host, "active");
      if (round === 3) {
        await expect(host.locator(".race-target.decoy")).toHaveText(/HOLD/);
        await expectStableScreenshot(
          host,
          ".reaction-game-card",
          `race-hold-${process.platform}.png`,
          { maxDiffPixels: 250 },
        );
      }
      await advance(host, "results");
      await advance(host, round === 10 ? "finished" : "waiting");
    }
    for (const context of contexts)
      await expect(
        context.pages()[0].locator(".reaction-game-card"),
      ).toHaveAttribute("data-phase", "finished");
    await expect(
      host.locator('.race-scores li[data-winner="true"]'),
    ).toHaveCount(8);
    await expect(host.locator(".race-dashboard")).toContainText("150 pts");
    await expect(host.locator(".race-dashboard")).toContainText("#1");
    await expectStableScreenshot(
      host,
      ".reaction-game-card",
      `race-results-eight-${process.platform}.png`,
      { maxDiffPixels: 250 },
    );
    await fit(host, "results-eight");
    await host.locator(".race-scores li").last().scrollIntoViewIfNeeded();
    await expect(host.locator(".race-scores li").last()).toBeInViewport();
    await host.getByRole("button", { name: "Race Again", exact: true }).click();
    await expect(host.locator(".race-dashboard")).toContainText("0 pts");
    await expect(
      host.locator(".race-target.mistake,.race-target.intended"),
    ).toHaveCount(0);
    await host.getByRole("button", { name: "Stop Race", exact: true }).click();
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
