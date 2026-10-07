import { test, expect, type Page } from "@playwright/test";
import {
  chooseGame,
  closePanels,
  expectScreenFits,
  join,
  returnHome,
  showHelp,
} from "./ui";
import { expectStableScreenshot } from "./screenshot";
const sizes = [
  { width: 320, height: 568 },
  { width: 320, height: 700 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 768, height: 1024 },
  { width: 1280, height: 720 },
];
const game = (p: Page) => p.locator(".golf-game-card");
async function fit(page: Page, label: string) {
  for (const size of sizes) {
    await page.setViewportSize(size);
    const style = await page.addStyleTag({
      content: ":root{font-family:serif;line-height:1.6}",
    });
    await expectScreenFits(page);
    const metrics = await page
      .locator(".golf-game-card, .golf-workspace, .golf-controls")
      .evaluateAll((es) =>
        es.map((e) => ({
          scroll: e.scrollHeight,
          height: e.clientHeight,
          width: e.clientWidth,
          scrollWidth: e.scrollWidth,
        })),
      );
    for (const m of metrics) {
      expect(m.scroll, `${label} ${size.width} vertical`).toBeLessThanOrEqual(
        m.height + 1,
      );
      expect(m.scrollWidth).toBeLessThanOrEqual(m.width + 1);
    }
    const boxes = await page
      .locator(".golf-course, .golf-controls, .golf-footer")
      .evaluateAll((es) => es.map((e) => e.getBoundingClientRect().toJSON()));
    expect(boxes[0].width).toBeGreaterThan(200);
    expect(boxes[0].height).toBeGreaterThan(100);
    expect(boxes[0].y + boxes[0].height).toBeLessThanOrEqual(boxes[2].y);
    expect(boxes[1].y + boxes[1].height).toBeLessThanOrEqual(boxes[2].y + 1);
    for (const button of await game(page).getByRole("button").all()) {
      const b = (await button.boundingBox())!;
      expect(b.height).toBeGreaterThanOrEqual(44);
      expect(b.width).toBeGreaterThanOrEqual(44);
    }
    await page.screenshot({
      path: `test-results/golf-${label}-${size.width}x${size.height}.png`,
    });
    await style.evaluate((e) => e.remove());
  }
}
async function ready(page: Page, touch = false) {
  await page.getByRole("slider", { name: "Shot angle" }).press("Home");
  await page.getByRole("slider", { name: "Shot power" }).press("ArrowRight");
  const lock = page.getByRole("button", { name: "Ready", exact: true });
  if (touch) await lock.tap();
  else await lock.click();
}
test("Golf pairs, drags and cancels, locks privately, pauses, scores five holes, rematches and switches", async ({
  page: host,
  browser,
}) => {
  test.setTimeout(120000);
  await host.addInitScript(() => {
    Math.random = () => 0;
  });
  const context = await browser.newContext({
    viewport: sizes[2],
    hasTouch: true,
    reducedMotion: "reduce",
  });
  try {
    const client = await context.newPage();
    await host.goto("./");
    await host.getByLabel("Your name").fill("Alex");
    await host
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    await chooseGame(host, "Meteor Minigolf");
    await expect(
      host.getByRole("button", { name: "Start Golf", exact: true }),
    ).toBeDisabled();
    await host
      .getByRole("button", { name: "Choose Game", exact: true })
      .click();
    await join(host, client, "Emma");
    await chooseGame(host, "Meteor Minigolf");
    await host.clock.install();
    await host.clock.pauseAt(new Date(Date.now() + 1000));
    await host.setViewportSize(sizes[2]);
    await expectStableScreenshot(
      host,
      ".golf-game-card",
      `golf-ready-${process.platform}.png`,
      { maxDiffPixels: 180 },
    );
    await fit(host, "ready");
    await host.getByRole("button", { name: "Start Golf", exact: true }).click();
    await host.clock.runFor(7000);
    await expect(game(client)).toHaveAttribute("data-phase", "aiming");
    await host.setViewportSize(sizes[2]);
    await expect(host.locator(".golf-course")).toHaveAttribute(
      "data-aiming",
      "true",
    );
    await expect(
      host.getByRole("slider", { name: "Shot power" }),
    ).toBeEnabled();
    await host.screenshot({ path: "test-results/golf-drag-before.png" });
    const court = (await host.locator(".golf-course").boundingBox())!;
    const tee = {
      x: court.x + court.width * 0.2,
      y: court.y + court.height * 0.5,
    };
    await host.mouse.move(tee.x, tee.y);
    await host.mouse.down();
    await host.mouse.move(tee.x + 6, tee.y, { steps: 3 });
    await host.mouse.up();
    await expect(
      host.getByRole("slider", { name: "Shot power" }),
    ).not.toHaveValue("60");
    const before = await host
      .getByRole("slider", { name: "Shot power" })
      .inputValue();
    await host.mouse.move(tee.x, tee.y);
    await host.mouse.down();
    await host.mouse.move(tee.x + 50, tee.y, { steps: 3 });
    // Pointer cancellation is the browser event on interruption; normal dragging is above.
    await host.locator(".golf-course").dispatchEvent("pointercancel");
    await host.mouse.up();
    await expect(host.getByRole("slider", { name: "Shot power" })).toHaveValue(
      before,
    );
    await host.setViewportSize(sizes[0]);
    await host.getByRole("button", { name: "Adjust aim", exact: true }).click();
    await expect(
      host.getByRole("dialog", { name: "Adjust shot" }),
    ).toBeVisible();
    await host.getByRole("slider", { name: "Shot power" }).fill("60");
    await closePanels(host);
    await host.setViewportSize(sizes[2]);
    await host
      .getByRole("button", { name: "Ready", exact: true })
      .press("Enter");
    await expect(
      host.getByRole("button", { name: "Shot locked", exact: true }),
    ).toBeDisabled();
    await expect(client.locator(".golf-weather")).toContainText("0, 12 or 24");
    await expect(game(client)).toHaveAttribute("data-phase", "aiming");
    await host.getByRole("button", { name: "Pause", exact: true }).click();
    await host.clock.runFor(10000);
    await expect(game(client)).toHaveAttribute("data-phase", "paused");
    await host.getByRole("button", { name: "Resume", exact: true }).click();
    await host.clock.runFor(3000);
    await expect(
      host.getByRole("button", { name: "Shot locked", exact: true }),
    ).toBeDisabled();
    await host.clock.runFor(60000);
    await expect(game(host)).toHaveAttribute("data-phase", "aiming");
    await expect(host.locator(".golf-status")).toContainText(
      "waiting for players",
    );
    await fit(host, "aiming");
    await fit(client, "aiming-client");
    await client.setViewportSize(sizes[2]);
    await expectStableScreenshot(
      client,
      ".golf-game-card",
      `golf-active-${process.platform}.png`,
      { maxDiffPixels: 180 },
    );
    await showHelp(client);
    await expect(client.getByRole("dialog")).toContainText(
      "everyone launches when all shots are Ready",
    );
    await closePanels(client);
    await ready(client, true);
    await expect(game(client)).toHaveAttribute("data-phase", "rolling");
    await expect(client.locator(".golf-weather")).toContainText("0 units/s²");
    while ((await game(host).getAttribute("data-phase")) === "rolling")
      await host.clock.runFor(100);
    await expect(game(client)).toHaveAttribute("data-phase", "results");
    await expect(host.locator(".golf-status")).toHaveText(
      "In the cup! +100 points.",
    );
    for (let hole = 2; hole <= 5; hole++) {
      await host.clock.runFor(7000);
      await expect(game(host)).toHaveAttribute("data-phase", "aiming");
      await ready(host);
      await host.clock.runFor(60000);
      await expect(game(host)).toHaveAttribute("data-phase", "aiming");
      await ready(client, true);
      await expect(game(host)).toHaveAttribute("data-phase", "rolling");
      while ((await game(host).getAttribute("data-phase")) === "rolling")
        await host.clock.runFor(100);
      await expect(game(host)).toHaveAttribute("data-phase", "results");
    }
    await host.clock.runFor(3000);
    await expect(game(client)).toHaveAttribute("data-phase", "finished");
    await fit(host, "results");
    await fit(client, "results-client");
    await host.setViewportSize(sizes[2]);
    await expectStableScreenshot(
      host,
      ".golf-game-card",
      `golf-results-${process.platform}.png`,
      { maxDiffPixels: 180 },
    );
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
    await host.getByRole("button", { name: "Play Again", exact: true }).click();
    await expect(game(client)).toHaveAttribute("data-phase", "countdown");
    await host.getByRole("button", { name: "Stop", exact: true }).click();
    await expect(game(client)).toHaveAttribute("data-phase", "ready");
    await host
      .getByRole("button", { name: "Choose Game", exact: true })
      .click();
    await chooseGame(host, "Shared Lights");
    await client.getByRole("button", { name: "Cell 1", exact: true }).click();
    await expect(
      host.getByRole("button", { name: "Cell 1", exact: true }),
    ).toHaveClass("cell on");
    await returnHome(host);
    await expect(client.getByRole("status")).toHaveText("Host disconnected");
  } finally {
    await context.close();
  }
});

test("eight golfers fit; late arrivals watch, background pauses, and participant departures reset", async ({
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
    for (const [i, c] of clients.entries())
      await join(host, c, `${i}ABCDEFGHIJKLMNOPQRSTUVWXYZ12345`);
    await chooseGame(host, "Meteor Minigolf");
    await host.clock.install();
    await host.clock.pauseAt(new Date(Date.now() + 1000));
    await host.getByRole("button", { name: "Start Golf", exact: true }).click();
    await host.clock.runFor(7000);
    await fit(host, "eight-aiming");
    for (let hole = 1; hole <= 5; hole++) {
      for (const p of [host, ...clients]) {
        await p.setViewportSize(sizes[2]);
        await ready(p);
      }
      await expect(game(host)).toHaveAttribute("data-phase", "rolling");
      await host.clock.runFor(30000);
    }
    await expect(game(host)).toHaveAttribute("data-phase", "finished");
    await expect(host.locator(".golf-status")).toContainText(
      "8 golfers share the win",
    );
    await fit(host, "eight-results");
    await host.getByRole("button", { name: "Standings", exact: true }).click();
    await expect(host.getByRole("dialog").locator("li")).toHaveCount(8);
    await closePanels(host);
    await returnHome(clients[6]);
    await host.getByRole("button", { name: "Start Golf", exact: true }).click();
    await clients[6].setViewportSize(sizes[0]);
    await join(host, clients[6], "Late watcher");
    await expect(game(host)).toHaveAttribute("data-phase", "paused");
    await host.getByRole("button", { name: "Resume", exact: true }).click();
    await host.clock.runFor(10000);
    await expect(
      clients[6].getByRole("button", { name: "Adjust aim", exact: true }),
    ).toBeDisabled();
    await expect(clients[6].locator(".golf-status")).toContainText("watching");
    await returnHome(clients[6]);
    await expect(game(host)).toHaveAttribute("data-phase", "aiming");
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
    for (const c of contexts) await c.close();
  }
});
