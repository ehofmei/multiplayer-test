import { test, expect, type Page } from "@playwright/test";
import {
  chooseGame,
  closePanels,
  expectScreenFits,
  join,
  returnHome,
  showHelp,
} from "./ui";
import { picnicPlacement, type Shape } from "../src/games/picnic";
import { expectStableScreenshot } from "./screenshot";
const sizes = [
  { width: 320, height: 568 },
  { width: 320, height: 700 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 768, height: 1024 },
  { width: 1280, height: 720 },
];
const game = (p: Page) => p.locator(".picnic-game-card");
async function fit(page: Page, label: string) {
  for (const size of sizes) {
    await page.setViewportSize(size);
    await expect(game(page)).toHaveAttribute(
      "data-compact",
      String((size.height <= 700 && size.width <= 650) || size.height <= 650),
    );
    const style = await page.addStyleTag({
      content: ":root {font-family:serif;line-height:1.6}",
    });
    await expectScreenFits(page);
    const metrics = await page
      .locator(
        ".picnic-game-card,.picnic-workspace,.picnic-controls,.picnic-grid:visible",
      )
      .evaluateAll((es) =>
        es.map((e) => ({
          h: e.clientHeight,
          sh: e.scrollHeight,
          w: e.clientWidth,
          sw: e.scrollWidth,
          box: e.getBoundingClientRect().toJSON(),
        })),
      );
    for (const m of metrics) {
      expect(m.sh, `${label} ${size.width} vertical`).toBeLessThanOrEqual(
        m.h + 1,
      );
      expect(m.sw, `${label} ${size.width} horizontal`).toBeLessThanOrEqual(
        m.w + 1,
      );
    }
    const footer = (await page.locator(".picnic-footer").boundingBox())!;
    for (const button of await game(page).getByRole("button").all()) {
      const b = (await button.boundingBox())!;
      expect(b.width).toBeGreaterThanOrEqual(44);
      expect(b.height).toBeGreaterThanOrEqual(44);
      expect(b.y + b.height).toBeLessThanOrEqual(footer.y + footer.height + 1);
    }
    await page.screenshot({
      path: `test-results/picnic-${label}-${size.width}x${size.height}.png`,
    });
    await style.evaluate((e) => e.remove());
  }
}
async function single(page: Page, round: number) {
  const compact = page.getByRole("button", {
    name: "Arrange piece",
    exact: true,
  });
  if (await compact.count()) await compact.click();
  await page.getByRole("button", { name: /^Piece 1:/ }).click();
  await page
    .getByRole("button", {
      name: `Row ${Math.floor((round - 1) / 6) + 1}, column ${((round - 1) % 6) + 1}, Empty`,
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Place", exact: true }).click();
}
test("Picnic pairs, previews, rotates, locks privately, pauses, waits untimed, scores, rematches and switches", async ({
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
    await chooseGame(host, "Patchwork Picnic");
    await expect(
      host.getByRole("button", { name: "Start Picnic", exact: true }),
    ).toBeDisabled();
    await host
      .getByRole("button", { name: "Choose Game", exact: true })
      .click();
    await join(host, client, "Emma");
    await chooseGame(host, "Patchwork Picnic");
    await host.clock.install();
    await host.clock.pauseAt(new Date(Date.now() + 1000));
    await host.setViewportSize(sizes[2]);
    await expectStableScreenshot(
      host,
      ".picnic-game-card",
      `picnic-ready-${process.platform}.png`,
      { maxDiffPixels: 180 },
    );
    await fit(host, "ready");
    await host
      .getByRole("button", { name: "Start Picnic", exact: true })
      .click();
    await host.clock.runFor(3000);
    await expect(game(client)).toHaveAttribute("data-phase", "placing");
    await host.setViewportSize(sizes[2]);
    await host.getByRole("button", { name: /^Piece 3:/ }).click();
    await host
      .getByRole("button", { name: "Row 6, column 6, Empty", exact: true })
      .click();
    await expect(
      host.getByRole("button", { name: "Place", exact: true }),
    ).toBeDisabled();
    await expect(host.locator(".picnic-status")).toContainText("Blocked");
    await host.getByRole("button", { name: "Rotate", exact: true }).click();
    await host.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(
      host.getByRole("button", { name: "Place", exact: true }),
    ).toBeDisabled();
    await host.getByRole("button", { name: /^Piece 1:/ }).click();
    const anchor = host.getByRole("button", {
      name: "Row 1, column 1, Empty",
      exact: true,
    });
    await anchor.click();
    await host
      .getByRole("button", {
        name: "Row 1, column 1, Empty, preview",
        exact: true,
      })
      .press("ArrowRight");
    await expect(
      host.getByRole("button", {
        name: "Row 1, column 2, Empty, preview",
        exact: true,
      }),
    ).toBeFocused();
    await host
      .getByRole("button", {
        name: "Row 1, column 2, Empty, preview",
        exact: true,
      })
      .press("r");
    await host.setViewportSize(sizes[2]);
    await expectStableScreenshot(
      host,
      ".picnic-game-card",
      `picnic-active-${process.platform}.png`,
      { maxDiffPixels: 180 },
    );
    await expect(host.locator(".picnic-forecast:visible")).toContainText(
      "+1 points on Place",
    );
    await expect(client.locator('[data-preview="true"]')).toHaveCount(0);
    await fit(host, "preview");
    await fit(client, "client");
    await host.setViewportSize(sizes[2]);
    await host
      .getByRole("button", {
        name: "Row 1, column 2, Empty, preview",
        exact: true,
      })
      .press("Enter");
    await expect(host.locator(".picnic-status")).toContainText(
      "Placement confirmed",
    );
    await expect(client.locator(".picnic-status")).toContainText(
      "Choose a piece",
    );
    await host.clock.runFor(60000);
    await expect(game(client)).toHaveAttribute("data-phase", "placing");
    await expect(host.locator(".picnic-status")).toContainText("waiting");
    await host.getByRole("button", { name: "Pause", exact: true }).click();
    await host.clock.runFor(10000);
    await expect(game(client)).toHaveAttribute("data-phase", "paused");
    await host.getByRole("button", { name: "Resume", exact: true }).click();
    await host.clock.runFor(3000);
    await expect(host.locator(".picnic-status")).toContainText(
      "Placement confirmed",
    );
    await client.setViewportSize(sizes[2]);
    await client.getByRole("button", { name: "Skip", exact: true }).tap();
    await expect(game(host)).toHaveAttribute("data-phase", "reveal");
    await expect(host.locator(".picnic-status")).toContainText("+1 points");
    await host.clock.runFor(3000);
    await host.clock.runFor(60000);
    await expect(game(client)).toHaveAttribute("data-phase", "placing");
    await host.getByRole("button", { name: "Skip", exact: true }).click();
    await client.getByRole("button", { name: "Skip", exact: true }).tap();
    await expect(game(host)).toHaveAttribute("data-phase", "reveal");
    for (let round = 3; round <= 10; round++) {
      await host.clock.runFor(3000);
      await expect(game(host)).toHaveAttribute("data-phase", "placing");
      if (round >= 7) await single(host, round - 4);
      else
        await host.getByRole("button", { name: "Skip", exact: true }).click();
      await client.getByRole("button", { name: "Skip", exact: true }).tap();
      await expect(game(host)).toHaveAttribute("data-phase", "reveal");
    }
    await host.clock.runFor(3000);
    await expect(game(client)).toHaveAttribute("data-phase", "finished");
    await fit(host, "results");
    await host.setViewportSize(sizes[2]);
    await expectStableScreenshot(
      host,
      ".picnic-game-card",
      `picnic-results-${process.platform}.png`,
      { maxDiffPixels: 180 },
    );
    await host.getByRole("button", { name: "Standings", exact: true }).click();
    await expect(host.getByRole("dialog").locator("li")).toHaveCount(2);
    await expect(host.getByRole("dialog")).toContainText("cells");
    await host
      .getByRole("button", { name: "Close", exact: true })
      .press("Escape");
    await expect(
      host.getByRole("button", { name: "Standings", exact: true }),
    ).toBeFocused();
    await showHelp(host);
    await expect(host.getByRole("dialog")).toContainText(
      "no placement deadline",
    );
    await closePanels(host);
    await host
      .getByRole("button", { name: "Picnic Again", exact: true })
      .click();
    await host.clock.runFor(3000);
    await host.setViewportSize(sizes[0]);
    await host
      .getByRole("button", { name: "Arrange piece", exact: true })
      .click();
    await host.getByRole("button", { name: /^Piece 1:/ }).click();
    const panel = host.getByRole("dialog", { name: "Arrange your picnic" });
    const bounds = await panel
      .locator(".panel-content")
      .evaluate((e) => ({ width: e.clientWidth, scroll: e.scrollWidth }));
    expect(bounds.scroll).toBeLessThanOrEqual(bounds.width + 1);
    for (const button of await panel.locator(".picnic-cell").all()) {
      const b = (await button.boundingBox())!;
      expect(b.width).toBeGreaterThanOrEqual(44);
      expect(b.height).toBeGreaterThanOrEqual(44);
    }
    await host
      .getByRole("button", { name: "Row 1, column 1, Empty", exact: true })
      .click();
    await expectStableScreenshot(
      host,
      ".app-panel[open]",
      `picnic-arrange-${process.platform}.png`,
      { maxDiffPixels: 180 },
    );
    await host.screenshot({ path: "test-results/picnic-short-placement.png" });
    await host.getByRole("button", { name: "Place", exact: true }).click();
    await expect(
      host.getByRole("button", { name: "Choice locked", exact: true }),
    ).toBeDisabled();
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
test("eight long names fit, late arrivals watch, background pauses, and disconnects reset", async ({
  page: host,
  browser,
}) => {
  test.setTimeout(180000);
  const contexts = await Promise.all(
    Array.from({ length: 7 }, () =>
      browser.newContext({
        viewport: sizes[1],
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
    await chooseGame(host, "Patchwork Picnic");
    await host.clock.install();
    await host.clock.pauseAt(new Date(Date.now() + 1000));
    await host
      .getByRole("button", { name: "Start Picnic", exact: true })
      .click();
    await host.clock.runFor(3000);
    await fit(host, "eight");
    for (let round = 1; round <= 10; round++) {
      for (const p of [host, ...clients]) {
        await p.setViewportSize(sizes[2]);
        await p.getByRole("button", { name: "Skip", exact: true }).click();
      }
      await expect(game(host)).toHaveAttribute("data-phase", "reveal");
      await host.clock.runFor(3000);
    }
    await expect(game(host)).toHaveAttribute("data-phase", "finished");
    await expect(host.locator(".picnic-status")).toContainText(
      "8 picnickers share the win",
    );
    await fit(host, "eight-results");
    await host.setViewportSize(sizes[2]);
    await expectStableScreenshot(
      host,
      ".picnic-game-card",
      `picnic-eight-tie-${process.platform}.png`,
      { maxDiffPixels: 180 },
    );
    await host.getByRole("button", { name: "Standings", exact: true }).click();
    await expect(host.getByRole("dialog").locator("li")).toHaveCount(8);
    await expectStableScreenshot(
      host,
      ".app-panel[open]",
      `picnic-eight-standings-${process.platform}.png`,
      { maxDiffPixels: 180 },
    );
    await closePanels(host);
    await returnHome(clients[6]);
    await host
      .getByRole("button", { name: "Start Picnic", exact: true })
      .click();
    await clients[6].setViewportSize(sizes[0]);
    await join(host, clients[6], "Late watcher");
    await expect(game(host)).toHaveAttribute("data-phase", "paused");
    await host.getByRole("button", { name: "Resume", exact: true }).click();
    await host.clock.runFor(6000);
    await expect(clients[6].locator(".picnic-status")).toContainText(
      "watching",
    );
    await expect(
      clients[6].getByRole("button", { name: "Arrange piece", exact: true }),
    ).toBeDisabled();
    await returnHome(clients[6]);
    await expect(game(host)).toHaveAttribute("data-phase", "placing");
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

test("ten packed rounds preview exact rewards, celebrate rows, and compare final blankets", async ({
  page: host,
  browser,
}) => {
  test.setTimeout(120000);
  await host.addInitScript(() => {
    Math.random = () => 0;
  });
  const context = await browser.newContext({
    viewport: sizes[2],
    reducedMotion: "reduce",
    hasTouch: true,
  });
  try {
    const client = await context.newPage();
    await host.goto("./");
    await host.getByLabel("Your name").fill("Alex");
    await host
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    await join(host, client, "Emma");
    await chooseGame(host, "Patchwork Picnic");
    await host.clock.install();
    await host.clock.pauseAt(new Date(Date.now() + 1000));
    await host.setViewportSize(sizes[2]);
    await host
      .getByRole("button", { name: "Start Picnic", exact: true })
      .click();
    await host.clock.runFor(3000);
    let rowCaptured = false,
      base = 0,
      bonus = 0;
    const shapeNames: Record<string, Shape> = {
      Single: "single",
      Domino: "domino",
      Line: "line",
      Corner: "corner",
      Square: "square",
      "Long L": "ell",
    };
    for (let round = 1; round <= 10; round++) {
      await expect(game(client)).toHaveAttribute("data-phase", "placing");
      const board = await host
        .locator(".picnic-grid:visible .picnic-cell")
        .evaluateAll((es) =>
          es.map((e) => e.getAttribute("data-food")).join(""),
        );
      const offers = await host
        .locator(".picnic-options:visible button")
        .evaluateAll((es) => es.map((e) => e.getAttribute("aria-label")!));
      let best: {
        option: number;
        x: number;
        y: number;
        rotation: number;
        preview: NonNullable<ReturnType<typeof picnicPlacement>>;
      } | null = null;
      for (const [option, label] of offers.entries()) {
        const [, food, shape] = label.match(
          /Piece \d: (Strawberry|Cheese|Grapes) (.+)/,
        )!;
        const piece = {
          shape: shapeNames[shape],
          food: ({ Strawberry: 1, Cheese: 2, Grapes: 3 } as const)[
            food as "Strawberry" | "Cheese" | "Grapes"
          ],
        };
        for (let rotation = 0; rotation < 4; rotation++)
          for (let y = 0; y < 6; y++)
            for (let x = 0; x < 6; x++) {
              const preview = picnicPlacement(
                board,
                piece,
                { option, x, y, rotation },
                "corners",
              );
              if (
                preview &&
                (!best ||
                  preview.gain + preview.bonus >
                    best.preview.gain + best.preview.bonus)
              )
                best = { option, x, y, rotation, preview };
            }
      }
      expect(best).not.toBeNull();
      const b = best!;
      await host
        .getByRole("button", { name: new RegExp(`^Piece ${b.option + 1}:`) })
        .click();
      for (let r = 0; r < b.rotation; r++)
        await host.getByRole("button", { name: "Rotate", exact: true }).click();
      await host
        .locator(".picnic-cell:visible")
        .nth(b.y * 6 + b.x)
        .click();
      await expect(host.locator(".picnic-forecast:visible")).toContainText(
        `+${b.preview.gain} points on Place`,
      );
      await expect(host.locator(".picnic-forecast:visible")).toContainText(
        `+${b.preview.bonus} bonus at finale`,
      );
      if (b.preview.edges.length)
        await expect(
          host.locator('[data-match-right="true"], [data-match-down="true"]'),
        ).not.toHaveCount(0);
      if (b.preview.rows.length && !rowCaptured) {
        await expectStableScreenshot(
          host,
          ".picnic-game-card",
          `picnic-row-preview-${process.platform}.png`,
          { maxDiffPixels: 180 },
        );
      }
      await host.getByRole("button", { name: "Place", exact: true }).click();
      await expect(
        client.locator('.picnic-grid:visible [data-food="1"]'),
      ).toHaveCount(0);
      await client.getByRole("button", { name: "Skip", exact: true }).click();
      await expect(game(host)).toHaveAttribute("data-phase", "reveal");
      await expect(game(client)).toHaveAttribute("data-phase", "reveal");
      await expect(host.locator(".picnic-status")).toContainText(
        `+${b.preview.gain} points`,
      );
      base += b.preview.gain;
      bonus += b.preview.bonus;
      await expect(host.locator(".picnic-top")).toContainText(
        `${base} pts · bonus ${bonus}`,
      );
      if (b.preview.rows.length && !rowCaptured) {
        rowCaptured = true;
        await expectStableScreenshot(
          host,
          ".picnic-game-card",
          `picnic-row-reveal-${process.platform}.png`,
          { maxDiffPixels: 180 },
        );
      }
      await host.clock.runFor(3000);
    }
    expect(rowCaptured).toBe(true);
    await expect(host.locator(".picnic-final")).toContainText("earned #1");
    await expect(host.locator(".picnic-final-total")).toContainText(
      `${base + bonus}`,
    );
    await fit(host, "packed-results");
    await host.setViewportSize(sizes[2]);
    await expectStableScreenshot(
      host,
      ".picnic-game-card",
      `picnic-packed-results-${process.platform}.png`,
      { maxDiffPixels: 180 },
    );
    await host.getByRole("button", { name: "Standings", exact: true }).click();
    await expectStableScreenshot(
      host,
      ".app-panel[open]",
      `picnic-blanket-comparison-${process.platform}.png`,
      { maxDiffPixels: 180 },
    );
  } finally {
    await context.close();
  }
});
