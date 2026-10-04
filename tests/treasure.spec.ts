import { test, expect, type Page } from "@playwright/test";
import {
  chooseGame,
  closePanels,
  expectScreenFits,
  join,
  showHelp,
  returnHome,
} from "./ui";
import { expectStableScreenshot } from "./screenshot";
const sizes = [
  { width: 320, height: 700 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 768, height: 1024 },
  { width: 1280, height: 720 },
];
const game = (page: Page) => page.locator(".dive-game-card");
async function choose(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).click();
  await page.getByRole("button", { name: "Lock choice", exact: true }).click();
}
async function fit(page: Page, label: string) {
  for (const size of sizes) {
    await page.setViewportSize(size);
    const style = await page.addStyleTag({
      content: ":root {font-family:serif;line-height:1.6}",
    });
    await expectScreenFits(page);
    const metrics = await page
      .locator(".dive-workspace")
      .evaluate((e) => ({ scroll: e.scrollHeight, height: e.clientHeight }));
    expect(
      metrics.scroll,
      `${label} ${size.width}×${size.height} workspace overflow`,
    ).toBeLessThanOrEqual(metrics.height + 1);
    const boxes = await page
      .locator(".dive-board, .dive-decision, .dive-footer")
      .evaluateAll((es) => es.map((e) => e.getBoundingClientRect().toJSON()));
    expect(boxes[0].y + boxes[0].height).toBeLessThanOrEqual(size.height);
    expect(boxes[1].y + boxes[1].height).toBeLessThanOrEqual(boxes[2].y + 1);
    for (const button of await game(page).getByRole("button").all()) {
      const b = (await button.boundingBox())!;
      expect(b.height).toBeGreaterThanOrEqual(44);
      expect(b.width).toBeGreaterThanOrEqual(44);
    }
    await page.screenshot({
      path: `test-results/dive-${label}-${size.width}.png`,
    });
    await style.evaluate((e) => e.remove());
  }
}
test("Treasure pairs, secretly locks, banks, times out, pauses, finishes and switches without re-pairing", async ({
  page: host,
  browser,
}) => {
  test.setTimeout(120000);
  await host.addInitScript(() => {
    Math.random = () => 0.5;
  });
  const context = await browser.newContext({
    viewport: sizes[1],
    hasTouch: true,
  });
  try {
    const client = await context.newPage();
    await host.goto("./");
    await host.getByLabel("Your name").fill("Alex");
    await host
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    await chooseGame(host, "Treasure Dive");
    await expect(
      host.getByRole("button", { name: "Start Dive", exact: true }),
    ).toBeDisabled();
    await host
      .getByRole("button", { name: "Choose Game", exact: true })
      .click();
    await join(host, client, "Emma");
    await chooseGame(host, "Treasure Dive");
    await host.clock.install();
    await host.clock.pauseAt(new Date(Date.now() + 1000));
    await host.setViewportSize(sizes[1]);
    // The fixture normalizes font metrics, but macOS/Linux rasterize text
    // differently. Keep reviewed OS baselines and the same strict pixel budget.
    await expectStableScreenshot(
      host,
      ".dive-game-card",
      `dive-ready-${process.platform}.png`,
      { maxDiffPixels: 180 },
    );
    await fit(host, "ready");
    await host.getByRole("button", { name: "Start Dive", exact: true }).click();
    await host.clock.runFor(3000);
    await expect(game(client)).toHaveAttribute("data-phase", "choosing");
    await client
      .getByRole("button", { name: "Explore with shield", exact: true })
      .tap();
    await expect(client.locator(".dive-preview")).toContainText(
      "Spend your shield",
    );
    await client
      .getByRole("button", { name: "Lock choice", exact: true })
      .tap();
    await expect(
      client.getByRole("button", { name: "Choice locked", exact: true }),
    ).toBeDisabled();
    await expect(host.locator(".dive-card")).toHaveText(
      "Choices stay secret until the reveal",
    );
    await host.getByRole("button", { name: "Pause Dive", exact: true }).click();
    await host.clock.runFor(10000);
    await expect(game(client)).toHaveAttribute("data-phase", "paused");
    await host
      .getByRole("button", { name: "Resume Dive", exact: true })
      .click();
    await host.clock.runFor(3000);
    await expect(
      client.getByRole("button", { name: "Choice locked", exact: true }),
    ).toBeDisabled();
    await host
      .getByRole("button", { name: "Explore", exact: true })
      .press("Enter");
    await host
      .getByRole("button", { name: "Lock choice", exact: true })
      .click();
    await expect(game(client)).toHaveAttribute("data-phase", "reveal");
    await host.clock.runFor(2000);
    await expect(game(host)).toHaveAttribute("data-phase", "choosing");
    await fit(host, "play");
    await fit(client, "play-client");
    // Layout fixture for the same notice rendered by a waiting service worker.
    await client.evaluate(() => {
      const banner = document.createElement("aside");
      banner.className = "banner dive-update-fixture";
      banner.textContent = "Update ready in Menu.";
      document.querySelector("main > header")!.after(banner);
    });
    await fit(client, "update-notice");
    await client.evaluate(() =>
      document.querySelector(".dive-update-fixture")!.remove(),
    );
    await client.setViewportSize(sizes[1]);
    await expectStableScreenshot(
      client,
      ".dive-board",
      `dive-active-${process.platform}.png`,
      { maxDiffPixels: 180 },
    );
    await showHelp(client);
    await expect(client.getByRole("dialog")).toContainText(
      "Missing a choice defaults to Return",
    );
    await closePanels(client);
    await client
      .getByRole("button", { name: "Standings", exact: true })
      .click();
    await expect(client.getByRole("dialog").locator("li")).toHaveCount(2);
    await client
      .getByRole("button", { name: "Close", exact: true })
      .press("Escape");
    await expect(
      client.getByRole("button", { name: "Standings", exact: true }),
    ).toBeFocused();
    // Continue together on treasure; then Return on the following door.
    for (const p of [client, host])
      if (
        await p
          .getByRole("button", { name: "Explore", exact: true })
          .isEnabled()
      )
        await choose(p, "Explore");
    await host.clock.runFor(2000);
    for (const p of [client, host])
      if (
        await p.getByRole("button", { name: "Return", exact: true }).isEnabled()
      )
        await choose(p, "Return");
    await host.clock.runFor(6000);
    await expect(game(host)).toHaveAttribute("data-phase", "choosing");
    await host.clock.runFor(28000);
    await expect(game(host)).toHaveAttribute("data-phase", "finished");
    await expect(host.locator(".dive-status")).toContainText("win");
    await fit(host, "results");
    await fit(client, "results-client");
    await host.setViewportSize(sizes[1]);
    await expectStableScreenshot(
      host,
      ".dive-game-card",
      `dive-results-${process.platform}.png`,
      { maxDiffPixels: 180 },
    );
    await host.getByRole("button", { name: "Dive Again", exact: true }).click();
    await expect(game(client)).toHaveAttribute("data-phase", "countdown");
    await host.getByRole("button", { name: "Stop Dive", exact: true }).click();
    await expect(game(host)).toHaveAttribute("data-phase", "ready");
    await host
      .getByRole("button", { name: "Choose Game", exact: true })
      .click();
    await chooseGame(host, "Shared Lights");
    await client.getByRole("button", { name: "Cell 1", exact: true }).click();
    await expect(
      host.getByRole("button", { name: "Cell 1", exact: true }),
    ).toHaveAttribute("class", "cell on");
    await returnHome(host);
    await expect(client.getByRole("status")).toHaveText("Host disconnected");
  } finally {
    await context.close();
  }
});

test("eight Treasure divers and long names fit, late arrivals watch, departures reset and host background pauses", async ({
  page: host,
  browser,
}) => {
  test.setTimeout(180000);
  const contexts = await Promise.all(
    Array.from({ length: 7 }, () =>
      browser.newContext({
        viewport: sizes[0],
        hasTouch: true,
        reducedMotion: "reduce",
      }),
    ),
  );
  try {
    await host.goto("./");
    await host.getByLabel("Your name").fill("ABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
    await host
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    const clients = await Promise.all(contexts.map((c) => c.newPage()));
    for (const [i, client] of clients.entries())
      await join(host, client, `${i}ABCDEFGHIJKLMNOPQRSTUVWXYZ12345`);
    await chooseGame(host, "Treasure Dive");
    await host.clock.install();
    await host.clock.pauseAt(new Date(Date.now() + 1000));
    await host.getByRole("button", { name: "Start Dive", exact: true }).click();
    await host.clock.runFor(3000);
    await fit(host, "eight-play");
    await host.clock.runFor(42000);
    await expect(game(host)).toHaveAttribute("data-phase", "finished");
    await fit(host, "eight-results");
    await fit(clients[0], "eight-results-client");
    await host.getByRole("button", { name: "Standings", exact: true }).click();
    await expect(host.getByRole("dialog").locator("li")).toHaveCount(8);
    await closePanels(host);
    await returnHome(clients[6]);
    await host.getByRole("button", { name: "Start Dive", exact: true }).click();
    await join(host, clients[6], "Late watcher");
    await expect(game(host)).toHaveAttribute("data-phase", "paused");
    await host
      .getByRole("button", { name: "Resume Dive", exact: true })
      .click();
    await host.clock.runFor(6000);
    await expect(
      clients[6].getByRole("button", { name: "Explore", exact: true }),
    ).toBeDisabled();
    await returnHome(clients[6]);
    await expect(game(host)).toHaveAttribute("data-phase", "choosing");
    await host.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(game(host)).toHaveAttribute("data-phase", "paused");
    await returnHome(clients[0]);
    await expect(game(host)).toHaveAttribute("data-phase", "ready");
  } finally {
    for (const context of contexts) await context.close();
  }
});
