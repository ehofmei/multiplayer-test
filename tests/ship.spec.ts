import { test, expect, type Page } from "@playwright/test";
import {
  chooseGame,
  join,
  returnHome,
  expectScreenFits,
  showHelp,
  closePanels,
} from "./ui";
import { expectStableScreenshot } from "./screenshot";
import { shipPanels } from "../src/games/ship-controls";
const card = (page: Page) => page.locator(".ship-game-card");
const sizes = [
  { width: 320, height: 568 },
  { width: 320, height: 700 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 768, height: 1024 },
  { width: 1280, height: 720 },
];
async function freeze(page: Page) {
  const start = new Date("2026-10-07T12:00:00Z");
  await page.clock.install({ time: start });
  await page.clock.pauseAt(start);
}
async function create(page: Page) {
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  await page.goto("./");
  await page.getByRole("button", { name: "Create Game", exact: true }).click();
  await chooseGame(page, "Spaceship Panic");
}
async function fit(page: Page, state: string) {
  for (const size of sizes) {
    await page.setViewportSize(size);
    for (const font of ["system", "tall"]) {
      const style =
        font === "tall"
          ? await page.addStyleTag({
              content: ":root{font-family:serif;line-height:1.6}",
            })
          : null;
      await expectScreenFits(page);
      for (const button of await card(page).locator("button:visible").all()) {
        const r = (await button.boundingBox())!;
        expect(r.width).toBeGreaterThanOrEqual(44);
        expect(r.height).toBeGreaterThanOrEqual(44);
        expect(r.y + r.height).toBeLessThanOrEqual(size.height - 8);
      }
      await page.screenshot({
        path: `test-results/ship-${state}-${size.width}x${size.height}-${font}.png`,
      });
      await style?.evaluate((el) => el.remove());
    }
  }
}
async function snapshot(page: Page, state: string) {
  await page.setViewportSize(sizes[2]);
  await expectStableScreenshot(
    page,
    ".ship-game-card",
    `ship-${state}-${process.platform}.png`,
    { maxDiffPixels: 180 },
  );
}
async function answer(caller: Page, owner: Page) {
  const command = await caller.locator(".ship-command").innerText();
  const match = /^(.+): (.+)!$/.exec(command);
  expect(match).not.toBeNull();
  await owner
    .getByRole("button", { name: `${match![1]} ${match![2]}`, exact: true })
    .click();
}
test("Spaceship pairs, matches pictures, scores, pauses, and handles spectators and disconnects", async ({
  page: host,
  browser,
}) => {
  const context = await browser.newContext({
    viewport: sizes[2],
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const lateContext = await browser.newContext();
  try {
    const client = await context.newPage(),
      late = await lateContext.newPage();
    await create(host);
    await join(host, client, "Emma with a long family name");
    await freeze(host);
    await expect(
      host.getByRole("button", { name: "2 minutes", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      client.getByRole("button", { name: "Launch Mission", exact: true }),
    ).toHaveCount(0);
    await snapshot(host, "ready");
    await fit(host, "ready");
    await host
      .getByRole("button", { name: "Launch Mission", exact: true })
      .click();
    await expect(host.locator(".ship-command")).toHaveText("Engine: 1!");
    await expect(client.locator(".ship-command")).toHaveText("Lights: Blue!");
    expect(
      await host
        .locator(".ship-command-pictures svg")
        .evaluateAll((els) => els.map((e) => e.getAttribute("data-picture"))),
    ).toEqual(["Engine", "1"]);
    await client
      .getByRole("button", { name: "Engine 2", exact: true })
      .press("Enter");
    await expect(host.getByTestId("ship-streak")).toHaveText("Streak 0");
    await expect(
      client.getByText("Try another setting", { exact: true }),
    ).toBeVisible();
    await client.getByRole("button", { name: "Engine 1", exact: true }).tap();
    await expect(host.locator(".ship-command")).toHaveText(
      "Order complete! +100 points",
    );
    await expect(
      client.getByText("Try another setting", { exact: true }),
    ).toHaveCount(0);
    await host
      .getByRole("button", { name: "Lights Blue", exact: true })
      .click();
    await expect(client.locator(".ship-command")).toHaveText(
      "Order complete! +120 points",
    );
    await expect(client.getByTestId("ship-score")).toHaveText("220 points");
    await snapshot(host, "success");
    await host.clock.runFor(2000);
    await snapshot(host, "active");
    await fit(client, "active");
    await host
      .getByRole("button", { name: "Pause Mission", exact: true })
      .click();
    await expect(client.locator(".ship-command")).toHaveText(
      "Mission paused · take a breath.",
    );
    await expect(
      client.getByRole("button", { name: "Engine 2", exact: true }),
    ).toBeDisabled();
    await fit(host, "paused");
    await snapshot(host, "paused");
    await host.clock.runFor(10000);
    await expect(client.getByTestId("ship-clock")).toHaveText("1:58");
    await host
      .getByRole("button", { name: "Resume Mission", exact: true })
      .click();
    await join(host, late, "Sam");
    await expect(late.locator(".ship-panels")).toHaveCount(0);
    await host
      .getByRole("button", { name: "Resume Mission", exact: true })
      .click();
    await expect(late.locator(".ship-command")).toHaveText(
      "You’re watching. Join the next mission.",
    );
    await returnHome(late);
    await expect(
      host.getByRole("button", { name: "Pause Mission", exact: true }),
    ).toBeVisible();
    await returnHome(client);
    await expect(card(host)).toHaveAttribute("data-phase", "ready");
    await expect(
      host.getByText("A player left. Choose players and start a new round.", {
        exact: true,
      }),
    ).toBeVisible();
    await host
      .getByRole("button", { name: "Launch Mission", exact: true })
      .click();
    await expect(host.locator(".ship-command")).toHaveText("Lights: Blue!");
    await host
      .getByRole("button", { name: "Choose Game", exact: true })
      .click();
    await chooseGame(host, "Shared Lights");
  } finally {
    await context.close();
    await lateContext.close();
  }
});

test("Spaceship completes unattended missions, resets scores on rematch and pauses on background", async ({
  page,
}) => {
  await create(page);
  await freeze(page);
  await page.getByRole("button", { name: "Gentle", exact: true }).click();
  await page
    .getByRole("button", { name: "Launch Mission", exact: true })
    .click();
  await expect(page.locator(".ship-deadline")).toHaveText("26s left");
  await page.clock.runFor(120000);
  await expect(card(page)).toHaveAttribute("data-phase", "finished");
  await expect(page.getByTestId("ship-score")).toHaveText("0");
  await expect(page.getByTestId("ship-completed")).toHaveText("0");
  await expect(page.getByTestId("ship-best-streak")).toHaveText("0");
  await snapshot(page, "results");
  await fit(page, "results");
  await page.getByRole("button", { name: "Launch Again", exact: true }).click();
  await expect(page.getByTestId("ship-score")).toHaveText("0 points");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(card(page)).toHaveAttribute("data-phase", "paused");
  await page.clock.runFor(10000);
  await expect(page.getByTestId("ship-clock")).toHaveText("2:00");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
  });
  await page
    .getByRole("button", { name: "Resume Mission", exact: true })
    .click();
  await expect(card(page)).toHaveAttribute("data-phase", "playing");
});

test("Spaceship completes every duration with shared score and capped streak bonuses", async ({
  page,
}) => {
  await create(page);
  await freeze(page);
  for (const minutes of [1, 2, 3]) {
    await page
      .getByRole("button", {
        name: `${minutes} minute${minutes === 1 ? "" : "s"}`,
        exact: true,
      })
      .click();
    await page
      .getByRole("button", {
        name: minutes === 1 ? "Launch Mission" : "Launch Again",
        exact: true,
      })
      .click();
    let completed = 0;
    for (let elapsed = 0; elapsed < minutes * 60000; elapsed += 250) {
      if (await page.locator(".ship-command-pictures").count()) {
        await answer(page, page);
        completed++;
      }
      await page.clock.runFor(250);
    }
    await expect(card(page)).toHaveAttribute("data-phase", "finished");
    await expect(page.getByTestId("ship-completed")).toHaveText(
      String(completed),
    );
    await expect(page.getByTestId("ship-best-streak")).toHaveText(
      String(completed),
    );
    const expectedScore = Array.from(
      { length: completed },
      (_, i) => 100 + 20 * Math.min(i, 10),
    ).reduce((a, b) => a + b, 0);
    await expect(page.getByTestId("ship-score")).toHaveText(
      expectedScore.toLocaleString(),
    );
    await expect(
      page.getByRole("button", {
        name: `${minutes} minute${minutes === 1 ? "" : "s"}`,
        exact: true,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    if (minutes === 1) await snapshot(page, "scored-results");
  }
});

test("Spaceship all eight panel sets support direct settings with matching SVGs and comfortable targets", async ({
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
    await create(host);
    const clients = await Promise.all(contexts.map((c) => c.newPage()));
    for (let i = 0; i < 7; i++) await join(host, clients[i], `Crew ${i + 2}`);
    await freeze(host);
    await host
      .getByRole("button", { name: "Launch Mission", exact: true })
      .click();
    const pages = [host, ...clients];
    for (const [seat, page] of pages.entries()) {
      await expect(page.locator(".ship-panel legend > span")).toHaveText(
        shipPanels.slice(seat * 3, seat * 3 + 3).map((p) => p.name),
      );
      for (let i = seat * 3; i < seat * 3 + 3; i++) {
        const panel = shipPanels[i];
        for (let value = 1; value < panel.settings.length; value++) {
          const button = page.getByTestId(`ship-control-${i}-${value}`);
          await expect(button.locator("svg")).toHaveAttribute(
            "data-picture",
            panel.settings[value],
          );
          if (seat === 0) await button.click();
          else await button.tap();
          await expect(button).toHaveAttribute("aria-pressed", "true");
        }
        if (seat === 0) await page.getByTestId(`ship-control-${i}-0`).click();
        else await page.getByTestId(`ship-control-${i}-0`).tap();
        await expect(page.getByTestId(`ship-control-${i}-0`)).toHaveAttribute(
          "aria-pressed",
          "true",
        );
      }
      await page.setViewportSize(sizes[0]);
      await expectScreenFits(page);
      for (const button of await page.locator(".ship-settings button").all()) {
        const r = (await button.boundingBox())!;
        expect(r.width).toBeGreaterThanOrEqual(44);
        expect(r.height).toBeGreaterThanOrEqual(44);
      }
      await host
        .getByRole("button", { name: "Pause Mission", exact: true })
        .click();
      await snapshot(page, `panel-set-${seat + 1}`);
      await host
        .getByRole("button", { name: "Resume Mission", exact: true })
        .click();
    }
    // Every image family stays available offline after the online visit.
    await host
      .getByRole("button", { name: "Pause Mission", exact: true })
      .click();
    await contexts[6].setOffline(true);
    await expect(
      clients[6].locator('.ship-art[data-picture="Bird"]'),
    ).toBeVisible();
    await contexts[6].setOffline(false);
    await showHelp(clients[6]);
    await expect(
      clients[6].getByText(/Correct commands earn 100 points/),
    ).toBeVisible();
    await closePanels(clients[6]);
  } finally {
    for (const context of contexts) await context.close();
  }
});
