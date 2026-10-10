import { expect, test } from "@playwright/test";
import {
  chooseGame,
  expectScreenFits,
  join,
  showHelp,
  closePanels,
} from "./ui";
import { expectStableScreenshot } from "./screenshot";

// QA inventory: ready/setup; rotated real pairing; local pointer/keyboard/deck;
// confirmed brick/paddle feedback; pause/resume; help/roster/palette; spectators;
// three levels and persistent results/rematch; phones/tablet/desktop/landscape;
// taller fonts, long names, reduced motion and offline reload.
test("Breakout arcade screen fits and confirms paired hits, controls and pause", async ({
  page: host,
  browser,
}) => {
  test.setTimeout(90_000);
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  try {
    const client = await context.newPage();
    await host.setViewportSize({ width: 390, height: 844 });
    await host.goto("./");
    await host.getByLabel("Your name").fill("Alex");
    await host
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    await join(host, client, "Emma with a very long name");
    await chooseGame(host, "Co-op Breakout");
    await expect(host.locator(".breakout-brick")).toHaveCount(25);
    await expectScreenFits(host);
    await expectStableScreenshot(
      host,
      ".breakout-game-card",
      `breakout-ready-phone-${process.platform}.png`,
      { maxDiffPixels: 160 },
    );
    await host.clock.install();
    await host.clock.pauseAt(new Date(Date.now() + 1000));
    await host
      .getByRole("button", { name: "Start Co-op Breakout", exact: true })
      .click();
    await expect(client.locator(".breakout-message strong")).toHaveText(
      "Ready?",
    );
    await host.clock.runFor(1150);
    await expect(client.locator(".breakout-game-card")).toHaveAttribute(
      "data-phase",
      "playing",
    );
    for (const [name, viewport] of [
      ["phone", { width: 390, height: 844 }],
      ["tablet", { width: 768, height: 1024 }],
      ["desktop", { width: 1280, height: 900 }],
      ["landscape", { width: 844, height: 390 }],
    ] as const) {
      await client.setViewportSize(viewport);
      await expectScreenFits(client);
      const court = (await client.locator(".breakout-court").boundingBox())!;
      expect(court.width).toBeGreaterThan(name === "landscape" ? 200 : 300);
      expect(court.width).toBeCloseTo(court.height, 0);
      await expectStableScreenshot(
        client,
        ".breakout-game-card",
        `breakout-active-${name}-${process.platform}.png`,
        { maxDiffPixels: 160 },
      );
    }
    await client.setViewportSize({ width: 390, height: 844 });
    await client
      .getByRole("group", { name: "Breakout court", exact: true })
      .press("ArrowRight");
    await expect
      .poll(async () =>
        Number(await host.getByTestId("arena-paddle-1").getAttribute("y")),
      )
      .toBeLessThan(380);
    await client.locator(".breakout-steer").tap({ position: { x: 40, y: 24 } });
    await expect
      .poll(async () =>
        Number(await host.getByTestId("arena-paddle-1").getAttribute("y")),
      )
      .toBeGreaterThan(550);
    // First natural ball path hits the outer core. Capture the confirmed burst.
    await host.emulateMedia({ reducedMotion: "reduce" });
    for (let i = 0; i < 100; i++) {
      await host.clock.runFor(10);
      if (await host.locator(".breakout-break").count()) break;
    }
    await expect(host.locator(".breakout-break")).toHaveCount(1);
    await host.clock.runFor(50);
    await expect(client.locator(".breakout-brick")).toHaveCount(24);
    await expect(host.locator(".breakout-break")).toHaveCSS(
      "animation-name",
      "none",
    );
    await expectStableScreenshot(
      host,
      ".breakout-game-card",
      `breakout-break-phone-${process.platform}.png`,
      { maxDiffPixels: 160 },
    );
    await host.clock.runFor(300);
    await expect(host.locator(".breakout-break")).toHaveCount(0);
    await host
      .getByRole("button", { name: "Pause Breakout", exact: true })
      .click();
    await expect(client.locator(".breakout-message strong")).toHaveText(
      "Paused",
    );
    const ball = await host
      .locator(".breakout-court svg circle")
      .last()
      .getAttribute("cy");
    await host.clock.runFor(2000);
    await expect(
      host.locator(".breakout-court svg circle").last(),
    ).toHaveAttribute("cy", ball!);
    await client.setViewportSize({ width: 320, height: 700 });
    await client.addStyleTag({
      content:
        ":root { font-family: Arial,sans-serif; line-height:1.3; --safe-area-bottom:20px; }",
    });
    await expectScreenFits(client);
    expect(
      (await client.locator(".breakout-court").boundingBox())!.width,
    ).toBeGreaterThan(250);
    await expectStableScreenshot(
      client,
      ".breakout-game-card",
      `breakout-paused-short-phone-${process.platform}.png`,
      { maxDiffPixels: 160 },
    );
    await showHelp(client);
    const panel = client.getByRole("dialog", {
      name: "Controls & help",
      exact: true,
    });
    await expect(
      panel.getByRole("list", { name: "Team paddles" }),
    ).toContainText("Emma with a very long name");
    await expect(
      panel.getByLabel("Your paddle", { exact: true }),
    ).toBeDisabled();
    await panel
      .getByRole("button", { name: "Lavender paddle", exact: true })
      .click();
    await closePanels(client);
    await expect(
      client.getByRole("button", { name: "Controls & help", exact: true }),
    ).toBeFocused();
    await host
      .getByRole("button", { name: "Resume Breakout", exact: true })
      .click();
    await expect(client.locator(".breakout-message strong")).toHaveText(
      "Ready?",
    );
    await host.clock.runFor(1150);
    await expect(client.locator(".breakout-game-card")).toHaveAttribute(
      "data-phase",
      "playing",
    );
    await expect(client.locator(".breakout-break")).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("Breakout naturally loses as a team, retains results, rematches and starts offline", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await page.getByRole("button", { name: "Create Game", exact: true }).click();
  await chooseGame(page, "Co-op Breakout");
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page
    .getByRole("button", { name: "Start Co-op Breakout", exact: true })
    .click();
  await page.clock.runFor(60000);
  await expect(page.locator(".breakout-overlay")).toHaveAttribute(
    "data-result",
    "loss",
  );
  await expect(page.locator(".breakout-message strong")).toHaveText(
    "One more try?",
  );
  await expectScreenFits(page);
  await expectStableScreenshot(
    page,
    ".breakout-game-card",
    `breakout-results-phone-${process.platform}.png`,
    { maxDiffPixels: 160 },
  );
  await page.clock.runFor(60000);
  await expect(page.locator(".breakout-overlay")).toHaveAttribute(
    "data-result",
    "loss",
  );
  await page
    .getByRole("button", { name: "Play Breakout Again", exact: true })
    .click();
  await expect(page.getByLabel("Team progress")).toContainText(
    "5 shared lives",
  );
  await expect(page.locator(".breakout-brick")).toHaveCount(25);
  await expect(page.locator(".breakout-break")).toHaveCount(0);
  await page.clock.resume();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await page.context().setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "Create Game", exact: true }).click();
  await chooseGame(page, "Co-op Breakout");
  await expect(page.locator(".breakout-brick")).toHaveCount(25);
  await page
    .getByRole("button", { name: "Start Co-op Breakout", exact: true })
    .click();
  await expect(page.locator(".breakout-game-card")).toHaveAttribute(
    "data-phase",
    "playing",
  );
  await page.context().setOffline(false);
});

test("paired Breakout teammates clear three cores and keep a shared victory", async ({
  page: host,
  browser,
}) => {
  test.setTimeout(180_000);
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  try {
    const client = await context.newPage();
    await host.setViewportSize({ width: 390, height: 844 });
    await host.goto("./");
    await host
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    await join(host, client, "Emma");
    await chooseGame(host, "Co-op Breakout");
    await host.clock.install();
    await host.clock.pauseAt(new Date(Date.now() + 1000));
    await host
      .getByRole("button", { name: "Start Co-op Breakout", exact: true })
      .click();
    await host.clock.runFor(1150);
    const courts = [
      host.locator(".breakout-court"),
      client.locator(".breakout-court"),
    ];
    const bounds = await Promise.all(courts.map((c) => c.boundingBox()));
    const captured = new Set<number>();
    const targets = [0.5, 0.5];
    // Normal pointer/touch input follows the incoming ball and varies paddle contact.
    // Predict only in the clear outer lanes, where no brick can change its path.
    for (let tick = 0; tick < 4000; tick++) {
      const phase = await host
        .locator(".breakout-game-card")
        .getAttribute("data-phase");
      if (phase === "finished") break;
      if (phase === "serve") {
        await host.clock.runFor(1150);
        continue;
      }
      const ball = await host
        .locator(".breakout-court svg circle")
        .last()
        .evaluate((e) => ({
          x: Number(e.getAttribute("cx")) / 1000,
          y: Number(e.getAttribute("cy")) / 1000,
          vx: Number(e.getAttribute("data-vx")),
          vy: Number(e.getAttribute("data-vy")),
        }));
      const offset = Math.sin(tick / 12) * 0.05;
      const bottom =
        ball.vy > 0 && ball.y > 0.69
          ? ball.x + (ball.vx * (0.935 - ball.y)) / ball.vy
          : ball.x;
      const right =
        ball.vx > 0 && ball.x > 0.69
          ? ball.y + (ball.vy * (0.935 - ball.x)) / ball.vx
          : ball.y;
      for (const i of [0, 1]) {
        if (
          i === 0
            ? ball.vy <= 0 || ball.y < 0.69
            : ball.vx <= 0 || ball.x < 0.69
        )
          continue;
        const target = Math.max(
          0.12,
          Math.min(0.88, i === 0 ? bottom + offset : 1 - right + offset),
        );
        if (Math.abs(target - targets[i]) < 0.015) continue;
        targets[i] = target;
        // Coordinates come from measured visible courts. Native pointer input
        // avoids locator stability waits on the deliberately paused host clock.
        const x = bounds[i]!.x + target * bounds[i]!.width;
        const y = bounds[i]!.y + bounds[i]!.height - 30;
        if (i === 0) await host.mouse.click(x, y);
        else await client.touchscreen.tap(x, y);
      }
      await host.clock.runFor(200);
      const level = Number(
        (await host.locator(".breakout-level small").innerText()).match(
          /CORE (\d+)/,
        )![1],
      );
      if (level > 1 && !captured.has(level)) {
        captured.add(level);
        await expect(client.locator(".breakout-level small")).toContainText(
          `0${level} / 03`,
        );
        await expectStableScreenshot(
          host,
          ".breakout-game-card",
          `breakout-core-${level}-phone-${process.platform}.png`,
          { maxDiffPixels: 160 },
        );
      }
    }
    await expect(host.locator(".breakout-overlay")).toHaveAttribute(
      "data-result",
      "win",
    );
    await expect(client.locator(".breakout-overlay")).toHaveAttribute(
      "data-result",
      "win",
    );
    await expect(client.locator(".breakout-message")).toContainText(
      "75 / 75 bricks cleared",
    );
    await expectScreenFits(host);
    await expectStableScreenshot(
      host,
      ".breakout-game-card",
      `breakout-victory-phone-${process.platform}.png`,
      { maxDiffPixels: 160 },
    );
    await host.clock.runFor(5000);
    await expect(client.locator(".breakout-message strong")).toHaveText(
      "Brilliant together!",
    );
    await host
      .getByRole("button", { name: "Play Breakout Again", exact: true })
      .click();
    await expect(client.locator(".breakout-brick")).toHaveCount(25);
    await expect(client.getByLabel("Team progress")).toContainText(
      "5 shared lives",
    );
  } finally {
    await context.close();
  }
});
