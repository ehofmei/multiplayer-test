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
const game = (p: Page) => p.locator(".glow-game-card");
async function fit(p: Page, label: string) {
  for (const size of sizes) {
    await p.setViewportSize(size);
    await expect(game(p)).toHaveAttribute(
      "data-short",
      String(size.height <= 450 && size.width >= 651),
    );
    const style = await p.addStyleTag({
      content: ":root {font-family:serif;line-height:1.6}",
    });
    await expectScreenFits(p);
    for (const selector of [
      ".glow-game-card",
      ".glow-workspace",
      ".glow-setup",
      ".glow-controls",
      ".glow-results",
      ".glow-final-ranking",
    ]) {
      for (const m of await p.locator(selector).evaluateAll((es) =>
        es.map((e) => ({
          h: e.clientHeight,
          sh: e.scrollHeight,
          w: e.clientWidth,
          sw: e.scrollWidth,
        })),
      )) {
        expect(
          m.sh,
          `${label} ${size.width} ${selector} vertical`,
        ).toBeLessThanOrEqual(m.h + 1);
        expect(
          m.sw,
          `${label} ${size.width} ${selector} horizontal`,
        ).toBeLessThanOrEqual(m.w + 1);
      }
    }
    for (const button of await game(p).getByRole("button").all()) {
      const b = (await button.boundingBox())!;
      if (
        button &&
        size.height === 390 &&
        (await button.getAttribute("class")) === "glow-cell"
      )
        continue;
      expect(b.width, `${label} button width`).toBeGreaterThanOrEqual(44);
      expect(b.height, `${label} button height`).toBeGreaterThanOrEqual(44);
      expect(b.y + b.height).toBeLessThan(size.height - 4);
    }
    await p.screenshot({
      path: `test-results/glow-${label}-${size.width}x${size.height}.png`,
    });
    await style.evaluate((e) => e.remove());
  }
  await p.setViewportSize(sizes[2]);
}
async function picks(p: Page, cells: number[]) {
  for (const c of cells)
    await p
      .getByRole("button", {
        name: new RegExp(`^${"ABCD"[c % 4]}${Math.floor(c / 4) + 1}( ·|$)`),
      })
      .click();
  await p.getByRole("button", { name: "Lock picks", exact: true }).click();
}
async function snapshot(p: Page, name: string) {
  await p.setViewportSize(sizes[2]);
  await expectStableScreenshot(
    p,
    ".glow-game-card",
    `glow-${name}-${process.platform}.png`,
    { maxDiffPixels: 180 },
  );
}
test("three players choose colors, lock privately, reveal, finish, rematch and switch", async ({
  page: host,
  browser,
}) => {
  test.setTimeout(180000);
  const contexts = await Promise.all(
    Array.from({ length: 2 }, () =>
      browser.newContext({
        viewport: sizes[2],
        hasTouch: true,
        reducedMotion: "reduce",
      }),
    ),
  );
  try {
    await host.addInitScript(() => {
      Math.random = () => 0;
    });
    await host.goto("./");
    await host.getByLabel("Your name").fill("Alex");
    await host
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    await chooseGame(host, "Glow Clash");
    await expect(
      host.getByRole("button", { name: "Start Clash", exact: true }),
    ).toBeDisabled();
    const clients = await Promise.all(contexts.map((c) => c.newPage()));
    await join(host, clients[0], "Emma");
    await expect(
      host.getByRole("button", { name: "Start Clash", exact: true }),
    ).toBeDisabled();
    await join(host, clients[1], "Sam");
    await host.getByRole("button", { name: "5 rounds", exact: true }).click();
    await expect(
      clients[0].getByRole("button", { name: "5 rounds", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await clients[0]
      .getByRole("button", { name: "Pink · Available", exact: true })
      .tap();
    await expect(
      host.getByRole("button", { name: "Pink · Emma", exact: true }),
    ).toBeDisabled();
    await clients[0]
      .getByRole("button", { name: "Green · Available", exact: true })
      .tap();
    await clients[1]
      .getByRole("button", { name: "Blue · Available", exact: true })
      .tap();
    const setupText = await game(host).innerText();
    for (const name of [
      "Red",
      "Orange",
      "Amber",
      "Yellow",
      "Lime",
      "Green",
      "Teal",
      "Cyan",
      "Blue",
      "Violet",
      "Magenta",
      "Pink",
    ])
      expect(setupText).not.toContain(name);
    await snapshot(host, "setup");
    await fit(host, "setup");
    await host.clock.install();
    await host.clock.pauseAt(new Date(Date.now() + 1000));
    await host
      .getByRole("button", { name: "Start Clash", exact: true })
      .click();
    await host.clock.runFor(3000);
    await expect(game(clients[1])).toHaveAttribute("data-phase", "choosing");
    const first = host.locator(".glow-game-card .glow-cell").first();
    await first.focus();
    await first.press("Space");
    await first.press("ArrowRight");
    await expect(
      host.getByRole("button", { name: "B1", exact: true }),
    ).toBeFocused();
    await host.getByRole("button", { name: "B1", exact: true }).press("Space");
    await host.getByRole("button", { name: "C1", exact: true }).click();
    await host.getByRole("button", { name: "D1", exact: true }).click();
    await expect(host.locator(".glow-status")).toContainText("3 of 3");
    await expect(host.locator(".glow-game-card .glow-cell")).toHaveText(
      Array(12).fill(""),
    );
    await snapshot(host, "secret");
    await fit(host, "secret");
    await host.getByRole("button", { name: "Clear", exact: true }).click();
    await expect(
      host.getByRole("button", { name: "Lock picks", exact: true }),
    ).toBeDisabled();
    await picks(host, [0, 1, 2]);
    await expect(host.locator(".glow-status")).toContainText("Picks confirmed");
    await expect(
      clients[0].getByRole("button", { name: "A1", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
    await host.getByRole("button", { name: "Pause", exact: true }).click();
    await host.clock.runFor(10000);
    await expect(game(clients[0])).toHaveAttribute("data-phase", "paused");
    await host.getByRole("button", { name: "Resume", exact: true }).click();
    await host.clock.runFor(3000);
    await host.clock.runFor(60000);
    await expect(game(host)).toHaveAttribute("data-phase", "choosing");
    await picks(clients[0], [0, 3, 4]);
    await picks(clients[1], [0, 4, 5]);
    await expect(game(host)).toHaveAttribute("data-phase", "settling");
    await expect(game(clients[1])).toHaveAttribute("data-phase", "settling");
    await expect(clients[1].locator(".glow-status")).toContainText(
      "Everyone’s locked in",
    );
    await expect(
      host.getByRole("button", { name: "A1 · Selected", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(clients[1].locator(".glow-top")).toContainText("0 pts");
    await snapshot(host, "settling");
    await fit(host, "settling");
    await host.clock.runFor(1400);
    await expect(game(host)).toHaveAttribute("data-phase", "settling");
    await host.clock.runFor(100);
    await expect(game(clients[1])).toHaveAttribute("data-phase", "reveal");
    await expect(host.locator(".glow-round-gain")).toHaveText("+2 points");
    await expect(clients[0].locator(".glow-round-gain")).toHaveText("+1 point");
    expect(
      await clients[0]
        .locator(".glow-round-gain")
        .evaluate((e) => getComputedStyle(e).animationName),
    ).toBe("none");
    await expect(host.locator(".glow-round-total")).toHaveText(
      "This round · 2 total",
    );
    await expect(
      game(host).locator('.glow-cell[data-own-pick="true"]'),
    ).toHaveCount(3);
    await expect(
      game(clients[1]).locator('.glow-cell[data-own-pick="true"]'),
    ).toHaveCount(3);
    await snapshot(host, "mixed");
    await fit(host, "mixed");
    await host
      .getByRole("button", {
        name: "A1 · Collision, 3 players, 0 points · Your pick",
        exact: true,
      })
      .click();
    await expect(
      host.getByRole("dialog", { name: "Tile A1" }).locator("li"),
    ).toHaveCount(3);
    await host
      .getByRole("button", { name: "Close", exact: true })
      .press("Escape");
    await expect(
      host.getByRole("button", {
        name: "A1 · Collision, 3 players, 0 points · Your pick",
        exact: true,
      }),
    ).toBeFocused();
    for (let round = 2; round <= 5; round++) {
      await host.clock.runFor(6000);
      await expect(game(host)).toHaveAttribute("data-phase", "choosing");
      await picks(host, [0, 1, 2]);
      await picks(clients[0], [0, 3, 4]);
      await picks(clients[1], [0, 4, 5]);
      await expect(game(host)).toHaveAttribute("data-phase", "settling");
      await host.clock.runFor(1500);
      await expect(game(host)).toHaveAttribute("data-phase", "reveal");
    }
    await host.clock.runFor(6000);
    await expect(game(clients[0])).toHaveAttribute("data-phase", "finished");
    await expect(host.locator(".glow-final-ranking li").first()).toContainText(
      "Alex",
    );
    await expect(
      host.locator('.glow-final-ranking li[data-winner="true"]'),
    ).toHaveCount(1);
    await expect(host.locator(".glow-final-ranking li strong")).toHaveText([
      "10 pts",
      "5 pts",
      "5 pts",
    ]);
    await host.clock.runFor(60000);
    await expect(game(host)).toHaveAttribute("data-phase", "finished");
    expect(
      await clients[0]
        .locator(".glow-status")
        .evaluate((e) => getComputedStyle(e).animationName),
    ).toBe("none");
    await snapshot(host, "results");
    await fit(host, "results");
    await fit(clients[0], "results-client");
    await host
      .getByRole("button", { name: "Inspect board", exact: true })
      .click();
    await expect(
      host
        .getByRole("dialog", { name: "Clash board", exact: true })
        .locator('.glow-cell[data-own-pick="true"]'),
    ).toHaveCount(3);
    await expect(
      host
        .getByRole("dialog")
        .getByRole("button", { name: "Lock picks", exact: true }),
    ).toHaveCount(0);
    await closePanels(host);
    await host
      .getByRole("button", { name: "Players & scores", exact: true })
      .click();
    await expect(host.getByRole("dialog")).toContainText("R5: 2");
    await closePanels(host);
    await showHelp(host);
    await expect(host.getByRole("dialog")).toContainText("no timer");
    await closePanels(host);
    await host
      .getByRole("button", { name: "Back to setup", exact: true })
      .click();
    await expect(game(clients[0])).toHaveAttribute("data-phase", "ready");
    await host
      .getByRole("button", { name: "Start Clash", exact: true })
      .click();
    await host.clock.runFor(3000);
    await host.setViewportSize(sizes[3]);
    await host.getByRole("button", { name: "Pick tiles", exact: true }).click();
    await host
      .getByRole("dialog")
      .getByRole("button", { name: "A1", exact: true })
      .click();
    for (const b of await host.getByRole("dialog").locator(".glow-cell").all())
      expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await host
      .getByRole("dialog")
      .getByRole("button", { name: "Close", exact: true })
      .press("Escape");
    await host.setViewportSize(sizes[2]);
    await host.getByRole("button", { name: "Stop", exact: true }).click();
    await expect(game(clients[0])).toHaveAttribute("data-phase", "ready");
    await host
      .getByRole("button", { name: "Choose Game", exact: true })
      .click();
    await chooseGame(host, "Shared Lights");
    await clients[0].getByRole("button", { name: "Cell 1", exact: true }).tap();
    await expect(
      host.getByRole("button", { name: "Cell 1", exact: true }),
    ).toHaveClass("cell on");
  } finally {
    for (const c of contexts) await c.close();
  }
});
test("eight colors stripe together, ties fit and late spectators do not resize the board", async ({
  page: host,
  browser,
}) => {
  test.setTimeout(240000);
  const contexts = await Promise.all(
    Array.from({ length: 7 }, () =>
      browser.newContext({
        viewport: sizes[2],
        hasTouch: true,
        reducedMotion: "reduce",
      }),
    ),
  );
  try {
    await host.addInitScript(() => {
      Math.random = () => 0;
    });
    await host.goto("./");
    await host.getByLabel("Your name").fill("ABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
    await host
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    const clients = await Promise.all(contexts.map((c) => c.newPage()));
    for (const [i, c] of clients.entries())
      await join(host, c, `${i}ABCDEFGHIJKLMNOPQRSTUVWXYZ12345`);
    await chooseGame(host, "Glow Clash");
    await host.getByRole("button", { name: "5 rounds", exact: true }).click();
    await clients[1]
      .getByRole("button", { name: "Violet · Available", exact: true })
      .tap();
    await clients[3]
      .getByRole("button", { name: "Magenta · Available", exact: true })
      .tap();
    await clients[5]
      .getByRole("button", { name: "Blue · Available", exact: true })
      .tap();
    await fit(host, "eight-setup");
    await host.clock.install();
    await host.clock.pauseAt(new Date(Date.now() + 1000));
    await host
      .getByRole("button", { name: "Start Clash", exact: true })
      .click();
    await host.clock.runFor(3000);
    await fit(host, "eight-secret");
    for (let r = 1; r <= 5; r++) {
      for (const p of [host, ...clients]) await picks(p, [0, 1, 2]);
      await expect(game(host)).toHaveAttribute("data-phase", "settling");
      await host.clock.runFor(1500);
      await expect(game(host)).toHaveAttribute("data-phase", "reveal");
      if (r === 1) {
        await expect(host.locator(".glow-game-card .glow-cell")).toHaveText(
          Array(32).fill(""),
        );
        await expect(host.locator(".glow-round-gain")).toHaveText("+0 points");
        await snapshot(host, "eight-stripes");
        await fit(host, "eight-stripes");
        const backgrounds = await host
          .locator(".glow-cell")
          .first()
          .evaluate((e) => (e as HTMLElement).style.background);
        expect(backgrounds.match(/rgb\(/g)).toHaveLength(16);
        expect(backgrounds).toContain("linear-gradient");
        expect(backgrounds).not.toContain("repeating");
        expect(backgrounds).toContain("0%");
        expect(backgrounds).toContain("100%");
        await host
          .getByRole("button", {
            name: "A1 · Collision, 8 players, 0 points · Your pick",
            exact: true,
          })
          .click();
        await expect(host.getByRole("dialog").locator("li")).toHaveCount(8);
        await closePanels(host);
      }
      await host.clock.runFor(6000);
    }
    await expect(game(host)).toHaveAttribute("data-phase", "finished");
    await expect(host.locator(".glow-status")).toContainText(
      "8 players share the win",
    );
    await expect(
      host.locator('.glow-final-ranking li[data-winner="true"]'),
    ).toHaveCount(8);
    await expect(host.locator(".glow-final-ranking li strong")).toHaveText(
      Array(8).fill("0 pts"),
    );
    await snapshot(host, "eight-results");
    await fit(host, "eight-results");
    await host
      .getByRole("button", { name: "Players & scores", exact: true })
      .click();
    await expect(host.getByRole("dialog").locator("li")).toHaveCount(8);
    await closePanels(host);
    await host
      .getByRole("button", { name: "Clash Again", exact: true })
      .click();
    await host.clock.runFor(3000);
    await returnHome(clients[6]);
    await expect(game(host)).toHaveAttribute("data-phase", "ready");
    await host
      .getByRole("button", { name: "Start Clash", exact: true })
      .click();
    await host.clock.runFor(3000);
    await join(host, clients[6], "Late watcher");
    await expect(game(host)).toHaveAttribute("data-phase", "paused");
    await host.getByRole("button", { name: "Resume", exact: true }).click();
    await host.clock.runFor(3000);
    await expect(clients[6].locator(".glow-status")).toContainText("Watching");
    await expect(host.locator(".glow-game-card .glow-cell")).toHaveCount(28);
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
    for (const c of contexts) await c.close();
  }
});
