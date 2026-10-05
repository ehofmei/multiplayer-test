import { test, expect, type Page } from "@playwright/test";
import {
  chooseGame,
  closePanels,
  expectScreenFits,
  join,
  returnHome,
} from "./ui";
import { expectStableScreenshot } from "./screenshot";
test.use({ actionTimeout: 10000 });
const sizes = [
  { width: 320, height: 568 },
  { width: 320, height: 700 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 768, height: 1024 },
  { width: 1280, height: 720 },
];
const card = (p: Page) => p.locator(".seek-game-card");
async function fit(page: Page, label: string) {
  for (const size of sizes) {
    await page.setViewportSize(size);
    const style = await page.addStyleTag({
      content: ":root{font-family:serif;line-height:1.6}",
    });
    await expectScreenFits(page);
    const metrics = await page
      .locator(".seek-game-card,.seek-workspace,.seek-controls")
      .evaluateAll((es) =>
        es.map((e) => ({
          h: e.clientHeight,
          sh: e.scrollHeight,
          w: e.clientWidth,
          sw: e.scrollWidth,
        })),
      );
    for (const m of metrics) {
      expect(m.sh, `${label} ${size.width} vertical`).toBeLessThanOrEqual(
        m.h + 1,
      );
      expect(m.sw, `${label} horizontal`).toBeLessThanOrEqual(m.w + 1);
    }
    const box = (await card(page).boundingBox())!;
    for (const b of await card(page).getByRole("button").all()) {
      const r = (await b.boundingBox())!;
      expect(r.width).toBeGreaterThanOrEqual(44);
      expect(r.height).toBeGreaterThanOrEqual(44);
      expect(r.y + r.height).toBeLessThanOrEqual(box.y + box.height);
    }
    const board = (await page.locator(".seek-art").boundingBox())!;
    expect(board.height).toBeGreaterThan(24);
    await page.screenshot({
      path: `test-results/seek-${label}-${size.width}x${size.height}.png`,
    });
    await style.evaluate((e) => e.remove());
  }
}
async function area(page: Page, cell: number) {
  await page
    .getByRole("button", {
      name: `${cell >= 50 ? "F–J" : "A–E"} · ${cell % 10 >= 5 ? "6–10" : "1–5"}`,
      exact: true,
    })
    .click();
}
const coordinate = (c: number) =>
  `${String.fromCharCode(65 + Math.floor(c / 10))}${(c % 10) + 1}`;
async function place(page: Page, piece: number, cell: number) {
  await page
    .locator(".seek-controls")
    .getByRole("button", {
      name: new RegExp(
        ["Three-line", "Three-corner", "Four-line", "Four-square", "Five-plus"][
          piece
        ],
      ),
    })
    .click();
  await page
    .getByRole("button", { name: "Choose anchor", exact: true })
    .click();
  await area(page, cell);
  await page
    .getByRole("button", { name: new RegExp(`^${coordinate(cell)},`) })
    .click();
  await page.getByRole("button", { name: "Place piece", exact: true }).click();
}
async function guess(page: Page, cell: number) {
  await page.getByRole("button", { name: "Select cell", exact: true }).click();
  await area(page, cell);
  await page
    .getByRole("button", {
      name: `${coordinate(cell)}, unsearched`,
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: `Illuminate ${coordinate(cell)}`,
      exact: true,
    })
    .last()
    .click();
}
test("Light Seek pairs, places, waits, alternates, finds all pieces, reveals, rematches and switches", async ({
  page: host,
  browser,
}) => {
  test.setTimeout(180000);
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
    await chooseGame(host, "Light Seek");
    await expect(
      host.getByRole("button", { name: "Start Seek", exact: true }),
    ).toBeDisabled();
    await host
      .getByRole("button", { name: "Choose Game", exact: true })
      .click();
    await join(host, client, "Emma");
    await chooseGame(host, "Light Seek");
    await host.clock.install();
    await host.clock.pauseAt(new Date(Date.now() + 1000));
    await host.setViewportSize(sizes[2]);
    await host.getByRole("button", { name: "Start Seek", exact: true }).click();
    await expect(card(client)).toHaveAttribute("data-phase", "setup");
    await expectStableScreenshot(
      host,
      ".seek-game-card",
      `seek-setup-${process.platform}.png`,
      { maxDiffPixels: 180 },
    );
    await fit(host, "setup");
    await host.setViewportSize(sizes[2]);
    await expect(
      host.getByRole("button", { name: "Ready", exact: true }),
    ).toBeDisabled();
    await host.getByRole("button", { name: /Three-line/ }).click();
    await host
      .getByRole("button", { name: "Choose anchor", exact: true })
      .click();
    await area(host, 99);
    await host.getByRole("button", { name: "J10, empty", exact: true }).click();
    await expect(
      host.getByRole("button", { name: "Place piece", exact: true }),
    ).toBeDisabled();
    await host.getByRole("button", { name: "Rotate", exact: true }).click();
    await area(host, 0);
    await host.getByRole("button", { name: "A1, empty", exact: true }).click();
    await host
      .getByRole("button", { name: "A1, empty", exact: true })
      .press("ArrowRight");
    await expect(
      host.getByRole("button", { name: "A2, empty", exact: true }),
    ).toBeFocused();
    await host
      .getByRole("button", { name: "A2, empty", exact: true })
      .press("r");
    await host
      .getByRole("button", { name: "A2, empty", exact: true })
      .press("Enter");
    // Move the already placed piece to the agreed deterministic layout.
    const anchors = [0, 10, 30, 40, 60];
    for (let i = 0; i < 5; i++) {
      await place(host, i, anchors[i]);
      await place(client, i, anchors[i]);
    }
    await host.getByRole("button", { name: "Ready", exact: true }).click();
    await expect(host.locator(".seek-status")).toContainText("Ready confirmed");
    await host.clock.runFor(90000);
    await expect(card(host)).toHaveAttribute("data-phase", "setup");
    await expect(client.locator(".seek-status")).toContainText("5/5 placed");
    await client.getByRole("button", { name: "Ready", exact: true }).tap();
    await expect(card(host)).toHaveAttribute("data-phase", "countdown");
    await host.clock.runFor(3000);
    await expect(card(client)).toHaveAttribute("data-phase", "playing");
    await host.setViewportSize(sizes[2]);
    await expectStableScreenshot(
      host,
      ".seek-game-card",
      `seek-active-${process.platform}.png`,
      { maxDiffPixels: 180 },
    );
    await fit(host, "active");
    await fit(client, "waiting");
    await host.setViewportSize(sizes[0]);
    await host
      .getByRole("button", { name: "Select cell", exact: true })
      .click();
    for (const button of await host.locator(".seek-cell").all()) {
      const r = (await button.boundingBox())!;
      expect(r.width).toBeGreaterThanOrEqual(44);
      expect(r.height).toBeGreaterThanOrEqual(44);
    }
    await area(host, 0);
    await host
      .getByRole("button", { name: "A1, unsearched", exact: true })
      .click();
    await host.screenshot({ path: "test-results/seek-zoom-320.png" });
    await closePanels(host);
    await host.getByRole("button", { name: "Pause", exact: true }).click();
    await host.clock.runFor(50000);
    await expect(card(client)).toHaveAttribute("data-phase", "paused");
    await host.getByRole("button", { name: "Resume", exact: true }).click();
    await host.clock.runFor(3000);
    const targets = [
      0, 1, 2, 10, 20, 21, 30, 31, 32, 33, 40, 41, 50, 51, 61, 70, 71, 72, 81,
    ];
    for (const [i, c] of targets.entries()) {
      await guess(host, c);
      await expect(host.locator(".seek-result")).toContainText(
        [2, 5, 9, 13, 18].includes(i) ? "found!" : "Hit!",
      );
      if (i === 0) {
        await client
          .getByRole("button", { name: "My board", exact: true })
          .click();
        await expect(
          client
            .getByRole("dialog", { name: "My board", exact: true })
            .locator('rect[stroke="#fff3aa"]'),
        ).toHaveCount(1);
        await closePanels(client);
      }
      if (i === 2) {
        await host.setViewportSize(sizes[2]);
        await expectStableScreenshot(
          host,
          ".seek-game-card",
          `seek-found-${process.platform}.png`,
          { maxDiffPixels: 180 },
        );
        await fit(host, "found");
      }
      if (i < 18) {
        await expect(
          client.getByRole("button", { name: "Select cell", exact: true }),
        ).toBeEnabled();
        await guess(client, 99 - i);
        await expect(host.locator(".seek-result")).toContainText("Miss");
      }
    }
    await expect(card(client)).toHaveAttribute("data-phase", "finished");
    await expect(host.locator(".seek-status")).toHaveText("You win!");
    await host.setViewportSize(sizes[2]);
    await expectStableScreenshot(
      host,
      ".seek-game-card",
      `seek-results-${process.platform}.png`,
      { maxDiffPixels: 180 },
    );
    await fit(host, "results");
    await host.getByRole("button", { name: "My board", exact: true }).click();
    await expect(
      host.getByRole("dialog").getByRole("img", {
        name: "Alex board with incoming guesses",
        exact: true,
      }),
    ).toBeVisible();
    await host
      .getByRole("button", { name: "Close", exact: true })
      .press("Escape");
    await expect(
      host.getByRole("button", { name: "My board", exact: true }),
    ).toBeFocused();
    await host.getByRole("button", { name: "Seek Again", exact: true }).click();
    await expect(card(client)).toHaveAttribute("data-phase", "setup");
    await expect(client.locator(".seek-status")).toContainText("0/5 placed");
    await host.getByRole("button", { name: "Stop", exact: true }).click();
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

test("Light Seek fits eight long names, keeps late arrivals public, and resets on participant departure", async ({
  page: host,
  browser,
}) => {
  test.setTimeout(180000);
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
    await host.goto("./");
    await host.getByLabel("Your name").fill("ABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
    await host
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    const clients = await Promise.all(contexts.map((c) => c.newPage()));
    await join(host, clients[0], "0ABCDEFGHIJKLMNOPQRSTUVWXYZ12345");
    await chooseGame(host, "Light Seek");
    await host.getByRole("button", { name: "Start Seek", exact: true }).click();
    for (let i = 1; i < 7; i++)
      await join(host, clients[i], `${i}ABCDEFGHIJKLMNOPQRSTUVWXYZ12345`);
    await expect(card(host)).toHaveAttribute("data-phase", "paused");
    await host.clock.install();
    await host.clock.pauseAt(new Date(Date.now() + 1000));
    await host.getByRole("button", { name: "Resume", exact: true }).click();
    await host.clock.runFor(3000);
    await expect(clients[6].locator(".seek-status")).toContainText("Watching");
    await expect(
      clients[6].getByRole("button", { name: "Select cell", exact: true }),
    ).toBeDisabled();
    await clients[6]
      .getByRole("button", { name: "Boards", exact: true })
      .click();
    await expect(
      clients[6]
        .getByRole("dialog", { name: "Public boards" })
        .getByRole("img"),
    ).toHaveCount(2);
    await closePanels(clients[6]);
    await fit(host, "eight-host");
    await fit(clients[6], "eight-spectator");
    await returnHome(clients[6]);
    await expect(card(host)).toHaveAttribute("data-phase", "setup");
    await host.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(card(host)).toHaveAttribute("data-phase", "paused");
    await returnHome(clients[0]);
    await expect(card(host)).toHaveAttribute("data-phase", "ready");
    await expect(
      host.getByRole("button", { name: "Start Seek", exact: true }),
    ).toBeDisabled();
  } finally {
    for (const c of contexts) await c.close();
  }
});
