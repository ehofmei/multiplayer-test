import { expect, test } from "@playwright/test";
import {
  chooseGame,
  expectScreenFits,
  join,
  showHelp,
  closePanels,
} from "./ui";
import { expectStableScreenshot } from "./screenshot";
import { audioStarts, monitorAudio } from "./audio";

// QA inventory: ready/setup; rotated real pairing; local pointer/keyboard/deck;
// confirmed brick/paddle feedback; pause/resume; help/roster/palette; spectators;
// three levels and persistent results/rematch; phones/tablet/desktop/landscape;
// taller fonts, long names, reduced motion and offline reload.
test("Breakout last target stays clear in a deliberate solo serve", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 402, height: 874 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await page.getByRole("button", { name: "Create Game", exact: true }).click();
  await chooseGame(page, "Co-op Breakout");
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page
    .getByRole("button", { name: "Start Co-op Breakout", exact: true })
    .click();
  await page.clock.runFor(1150);
  const court = (await page.locator(".breakout-court").boundingBox())!;
  let prepared = false;
  for (let tick = 0; tick < 1800; tick++) {
    const visible = await page.locator(".breakout-game-card").evaluate((e) => {
      const ball = e.querySelector(".breakout-court svg circle:last-child")!;
      return {
        remaining: e.querySelectorAll(".breakout-brick").length,
        level: e.querySelector(".breakout-level small")!.textContent!,
        phase: e.getAttribute("data-phase"),
        x: Number(ball.getAttribute("cx")) / 1000,
        y: Number(ball.getAttribute("cy")) / 1000,
        vx: Number(ball.getAttribute("data-vx")),
        vy: Number(ball.getAttribute("data-vy")),
      };
    });
    if (!visible.level.includes("01 / 03")) break;
    const incoming = visible.vy > 0 && visible.y > 0.69;
    const arrival = visible.x + (visible.vx * (0.935 - visible.y)) / visible.vy;
    if (visible.remaining === 1 && incoming) {
      // Deliberately miss in the clear outer lane, then capture the known serve
      // pose, rather than a timing-dependent ball position from an active rally.
      await page.mouse.click(
        court.x + (arrival > 0.5 ? 0.12 : 0.88) * court.width,
        court.y + court.height - 25,
      );
      for (let step = 0; step < 80; step++) {
        await page.clock.runFor(20);
        if (
          (await page
            .locator(".breakout-game-card")
            .getAttribute("data-phase")) === "serve"
        )
          break;
      }
      await expect(page.getByLabel("Team progress")).toContainText(
        "4 shared lives",
      );
      await showHelp(page);
      await page.getByRole("slider", { name: "Your paddle" }).fill("50");
      await closePanels(page);
      await page.clock.runFor(100);
      prepared = true;
      break;
    }
    if (incoming) {
      const target = Math.max(
        0.12,
        Math.min(0.88, arrival + Math.sin(tick / 12) * 0.05),
      );
      await page.mouse.click(
        court.x + target * court.width,
        court.y + court.height - 25,
      );
    }
    await page.clock.runFor(200);
  }
  expect(prepared).toBe(true);
  await expect(page.locator(".breakout-game-card")).toHaveAttribute(
    "data-phase",
    "serve",
  );
  await expect(page.locator(".breakout-brick[data-last=true]")).toHaveCount(1);
  await expect(page.getByTestId("brick-13")).toHaveAttribute("data-hp", "1");
  await expect(page.locator(".breakout-brick-count")).toHaveAttribute(
    "aria-label",
    "1 brick left, 1 hit remaining",
  );
  await expect(page.getByTestId("arena-paddle-0")).toHaveAttribute("x", "380");
  await expect(
    page.locator(".breakout-court svg circle").last(),
  ).toHaveAttribute("cx", "500");
  await expect(
    page.locator(".breakout-court svg circle").last(),
  ).toHaveAttribute("cy", "800");
  for (const [name, viewport] of [
    ["phone", { width: 402, height: 874 }],
    ["ipad", { width: 1180, height: 820 }],
  ] as const) {
    await page.setViewportSize(viewport);
    await expectScreenFits(page);
    await expectStableScreenshot(
      page,
      ".breakout-game-card",
      `breakout-last-target-${name}-${process.platform}.png`,
      { maxDiffPixels: 160 },
    );
  }
});

test("Breakout shares one life-loss cue, resets the serve and recovers quietly", async ({
  page: host,
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  try {
    const client = await context.newPage();
    await monitorAudio(host);
    await host.setViewportSize({ width: 390, height: 844 });
    await host.emulateMedia({ reducedMotion: "reduce" });
    await host.goto("./");
    await host
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    await host.getByRole("button", { name: "Sound", exact: true }).click();
    await join(host, client, "Emma");
    await chooseGame(host, "Co-op Breakout");
    await host.clock.install();
    await host.clock.pauseAt(new Date(Date.now() + 1000));
    await host
      .getByRole("button", { name: "Start Co-op Breakout", exact: true })
      .click();
    await host.clock.runFor(1150);
    for (let step = 0; step < 1200; step++) {
      if (
        (await host.locator(".breakout-health").getAttribute("data-loss")) ===
        "true"
      )
        break;
      await host.clock.runFor(50);
    }
    await expect(host.locator(".breakout-status")).toHaveText(
      "Team life lost · 4 left",
    );
    await host.clock.runFor(50); // Deliver the reset through a real host broadcast.
    for (const player of [host, client]) {
      await expect(player.getByLabel("Team progress")).toContainText(
        "4 shared lives",
      );
      await expect(
        player.locator(".breakout-life-dots i[data-lost=true]"),
      ).toHaveCount(1);
      await expect(player.locator(".breakout-game-card")).toHaveAttribute(
        "data-phase",
        "serve",
      );
      await expect(player.locator(".breakout-break")).toHaveCount(0);
      await expect(
        player.locator(".breakout-court svg circle").last(),
      ).toHaveAttribute("cx", "800");
      await expect(
        player.locator(".breakout-court svg circle").last(),
      ).toHaveAttribute("cy", "500");
    }
    await expectStableScreenshot(
      host,
      ".breakout-game-card",
      `breakout-life-loss-phone-${process.platform}.png`,
      { maxDiffPixels: 160 },
    );
    const heard = await audioStarts(host);
    await host.clock.runFor(100);
    expect(await audioStarts(host)).toBe(heard);
    await host.clock.runFor(350);
    await expect(host.locator(".breakout-health")).toHaveAttribute(
      "data-loss",
      "false",
    );
    await host
      .getByRole("button", { name: "Pause Breakout", exact: true })
      .click();
    await host
      .getByRole("button", { name: "Resume Breakout", exact: true })
      .click();
    await expect(host.locator(".breakout-status")).toHaveText(
      "Core 1 of 3 · Get ready…",
    );
    await expect(
      host.locator(".breakout-life-dots i[data-lost=true]"),
    ).toHaveCount(0);
    const resumed = await audioStarts(host);
    await host.evaluate(() => window.dispatchEvent(new Event("pageshow")));
    await host.clock.runFor(100);
    expect(await audioStarts(host)).toBe(resumed);
    await expect(host.locator(".breakout-status")).not.toContainText(
      "life lost",
    );
    await host.clock.runFor(1100);
    await expect(host.locator(".breakout-game-card")).toHaveAttribute(
      "data-phase",
      "playing",
    );
    await expect(
      host.locator(".breakout-life-dots i[data-lost=true]"),
    ).toHaveCount(0);
  } finally {
    await context.close();
  }
});

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
}, testInfo) => {
  test.setTimeout(180_000);
  const profile: Record<string, { calls: number; durationMs: number }> = {};
  async function measure<T>(
    name: string,
    action: () => Promise<T>,
  ): Promise<T> {
    const start = performance.now();
    try {
      return await action();
    } finally {
      const entry = (profile[name] ??= { calls: 0, durationMs: 0 });
      entry.calls++;
      entry.durationMs += performance.now() - start;
    }
  }
  const advance = (ms: number) =>
    measure("simulation", () => host.clock.runFor(ms));
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
    await measure("pairing", () => join(host, client, "Emma"));
    await chooseGame(host, "Co-op Breakout");
    await host.clock.install();
    await host.clock.pauseAt(new Date(Date.now() + 1000));
    await host
      .getByRole("button", { name: "Start Co-op Breakout", exact: true })
      .click();
    await advance(1150);
    const courts = [
      host.locator(".breakout-court"),
      client.locator(".breakout-court"),
    ];
    const bounds = await Promise.all(courts.map((c) => c.boundingBox()));
    const captured = new Set<number>();
    const sparse = new Set<number>();
    const targets = [0.5, 0.5];
    // Normal pointer/touch input follows the incoming ball and varies paddle contact.
    // Predict only in the clear outer lanes, where no brick can change its path.
    for (let tick = 0; tick < 4000; tick++) {
      // Read the visible frame together so paired runs spend their time playing,
      // rather than making separate browser round trips for each HUD field.
      const frame = await measure("observations", () =>
        host.locator(".breakout-game-card").evaluate((e) => {
          const ball = Array.from(
            e.querySelectorAll(".breakout-court svg circle"),
          ).at(-1)!;
          return {
            phase: e.getAttribute("data-phase"),
            finalCore: e
              .querySelector(".breakout-level small")!
              .textContent!.includes("03 / 03"),
            remaining: e.querySelectorAll(".breakout-brick").length,
            level: Number(
              e
                .querySelector(".breakout-level small")!
                .textContent!.match(/CORE (\d+)/)![1],
            ),
            ball: {
              x: Number(ball.getAttribute("cx")) / 1000,
              y: Number(ball.getAttribute("cy")) / 1000,
              vx: Number(ball.getAttribute("data-vx")),
              vy: Number(ball.getAttribute("data-vy")),
            },
          };
        }),
      );
      const level = frame.level;
      if (frame.remaining > 0 && frame.remaining <= 5) {
        sparse.add(frame.remaining);
        await expect(
          host.locator(".breakout-brick[data-last=true]"),
        ).toHaveCount(frame.remaining);
        await expect(host.locator(".breakout-brick-count small")).toHaveText(
          frame.remaining === 1 ? "brick left" : "bricks left",
        );
      }
      if (level > 1 && !captured.has(level)) {
        captured.add(level);
        // The local core can change between 50ms broadcasts. With the host
        // clock frozen, wall-clock polling cannot deliver that next snapshot.
        await advance(100);
        await expect(client.locator(".breakout-level small")).toContainText(
          `0${level} / 03`,
        );
        // Core transitions retain the last live paddle input, which depends on
        // WebRTC timing. Establish a deliberate pose through the real sliders
        // and confirm the remote paddle before comparing the entire screen.
        for (const player of [host, client]) {
          await showHelp(player);
          await player.getByRole("slider", { name: "Your paddle" }).fill("50");
          await closePanels(player);
        }
        // Cover the 33ms input queue and the next 50ms snapshot broadcast.
        // A 50ms advance can end after local input but before remote delivery.
        await advance(100);
        await expect(host.getByTestId("arena-paddle-1")).toHaveAttribute(
          "y",
          "380",
        );
        await expect(client.getByTestId("arena-paddle-0")).toHaveAttribute(
          "x",
          "380",
        );
        await advance(300); // Let the last contact feedback expire.
        for (const player of [host, client]) {
          await expect(player.locator(".breakout-game-card")).toHaveAttribute(
            "data-phase",
            "serve",
          );
          await expect(player.getByTestId("arena-paddle-0")).toHaveAttribute(
            "x",
            "380",
          );
          await expect(player.getByTestId("arena-paddle-1")).toHaveAttribute(
            "y",
            "380",
          );
        }
        targets.fill(0.5);
        await measure("screenshots", () =>
          expectStableScreenshot(
            host,
            ".breakout-game-card",
            `breakout-core-${level}-phone-${process.platform}.png`,
            { maxDiffPixels: 160 },
          ),
        );
      }
      if (frame.phase === "finished") break;
      if (frame.phase === "serve") {
        await advance(1150);
        continue;
      }
      const ball = frame.ball;
      const finalApproach =
        frame.finalCore &&
        frame.remaining === 1 &&
        ball.x > 0.2 &&
        ball.x < 0.8 &&
        ball.y > 0.2 &&
        ball.y < 0.8 &&
        (ball.vy <= 0 || ball.y < 0.69) &&
        (ball.vx <= 0 || ball.x < 0.69);
      if (finalApproach && targets.some((target) => target !== 0.5)) {
        // The ball is clear of both occupied paddles. Center them through normal
        // controls before the last brick can end play and disable those controls.
        for (const player of [host, client]) {
          await showHelp(player);
          await player.getByRole("slider", { name: "Your paddle" }).fill("50");
          await closePanels(player);
        }
        await advance(100);
        await expect(host.getByTestId("arena-paddle-1")).toHaveAttribute(
          "y",
          "380",
        );
        await advance(100);
        await expect(client.getByTestId("arena-paddle-0")).toHaveAttribute(
          "x",
          "380",
        );
        targets.fill(0.5);
        continue;
      }
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
        if (i === 0) await measure("inputs", () => host.mouse.click(x, y));
        else await measure("inputs", () => client.touchscreen.tap(x, y));
      }
      await advance(200);
    }
    await expect(host.locator(".breakout-overlay")).toHaveAttribute(
      "data-result",
      "win",
    );
    expect([...sparse]).toEqual(expect.arrayContaining([5, 3, 1]));
    await expect(client.locator(".breakout-overlay")).toHaveAttribute(
      "data-result",
      "win",
    );
    await expect(client.locator(".breakout-message")).toContainText(
      "75 / 75 bricks cleared",
    );
    await expectScreenFits(host);
    for (const player of [host, client]) {
      await expect(player.getByTestId("arena-paddle-0")).toHaveAttribute(
        "x",
        "380",
      );
      await expect(player.getByTestId("arena-paddle-1")).toHaveAttribute(
        "y",
        "380",
      );
    }
    await expectStableScreenshot(
      host,
      ".breakout-game-card",
      `breakout-victory-phone-${process.platform}.png`,
      { maxDiffPixels: 160 },
    );
    await advance(5000);
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
    await testInfo.attach("breakout-profile", {
      body: JSON.stringify(profile),
      contentType: "application/json",
    });
    await context.close();
  }
});
