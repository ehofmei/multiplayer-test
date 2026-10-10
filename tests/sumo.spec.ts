import { expect, test } from "@playwright/test";
import { chooseGame, expectScreenFits, join, showHelp } from "./ui";
import { expectStableScreenshot } from "./screenshot";

// QA inventory: ready preview; two-player countdown/play; thumb deck and local
// marker; pause/resume; help/roster focus return; reduced motion; short phone,
// portrait tablet, landscape and desktop fit. The existing game.spec covers
// physical-style two-thumb input, eight players, spectators and disconnects.
test("Sumo artwork and arcade composition fit phones, tablets and desktop", async ({
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
    await chooseGame(host, "Sumo Bumpers");
    await expect(
      host.getByRole("button", { name: "Start Bumpers", exact: true }),
    ).toBeDisabled();
    await expectScreenFits(host);
    await join(host, client, "Emma with a very long name");
    await expect(host.locator('[data-preview="true"]')).toHaveCount(2);
    await expect(host.locator('.sumo-bot-art[data-local="true"]')).toHaveCount(
      1,
    );
    await expect(host.locator(".sumo-controls")).toBeHidden();
    await expectScreenFits(host);
    await expectStableScreenshot(
      host,
      ".sumo-game-card",
      `sumo-ready-phone-${process.platform}.png`,
      { maxDiffPixels: 160 },
    );

    await host.clock.install();
    await host.clock.pauseAt(new Date(Date.now() + 1000));
    await host
      .getByRole("button", { name: "Start Bumpers", exact: true })
      .click();
    await expect(client.locator(".sumo-arena-message strong")).toHaveText("3");
    await expect(
      client.locator('.sumo-bot-art[data-local="true"]'),
    ).toHaveCount(1);
    await host.clock.runFor(3050);
    await expect(client.locator(".sumo-status")).toContainText(
      "2 bumpers remain",
    );
    await expect(client.locator(".sumo-arena-message")).toHaveCount(0);
    await expect(client.locator(".sumo-feedback")).toHaveAttribute(
      "title",
      "You are bumper 2 · Emma with a very long name",
    );
    for (const [name, viewport] of [
      ["phone", { width: 390, height: 844 }],
      ["tablet", { width: 768, height: 1024 }],
      ["desktop", { width: 1280, height: 900 }],
      ["landscape", { width: 844, height: 390 }],
    ] as const) {
      await client.setViewportSize(viewport);
      await expectScreenFits(client);
      const ring = (await client.locator(".sumo-court").boundingBox())!;
      expect(ring.width).toBeGreaterThan(name === "landscape" ? 180 : 290);
      expect(ring.height).toBeCloseTo(ring.width, 0);
      const controls = (await client.locator(".sumo-controls").boundingBox())!;
      const footer = (await client.locator(".sumo-footer").boundingBox())!;
      expect(controls.y + controls.height).toBeLessThanOrEqual(footer.y);
      await expectStableScreenshot(
        client,
        ".sumo-game-card",
        `sumo-active-${name}-${process.platform}.png`,
        { maxDiffPixels: 160 },
      );
    }
    await client.setViewportSize({ width: 390, height: 844 });
    await host.clock.runFor(30_000);
    await expect(client.locator(".sumo-status")).toContainText(
      "2 bumpers remain",
    );
    await expectScreenFits(client);
    await expectStableScreenshot(
      host,
      ".sumo-game-card",
      `sumo-closing-phone-${process.platform}.png`,
      { maxDiffPixels: 160 },
    );
    await host
      .getByRole("button", { name: "Pause Bumpers", exact: true })
      .click();
    await expect(client.locator(".sumo-arena-message strong")).toHaveText(
      "Paused",
    );
    await client.setViewportSize({ width: 320, height: 700 });
    await client.emulateMedia({ reducedMotion: "reduce" });
    await client.addStyleTag({
      content:
        ":root { --safe-area-bottom: 20px; font-family: Arial, sans-serif; line-height: 1.3; }",
    });
    await expectScreenFits(client);
    const ring = (await client.locator(".sumo-court").boundingBox())!;
    expect(ring.width).toBeGreaterThan(240);
    await expectStableScreenshot(
      client,
      ".sumo-game-card",
      `sumo-paused-short-phone-${process.platform}.png`,
      { maxDiffPixels: 160 },
    );
    await showHelp(client);
    const panel = client.getByRole("dialog", {
      name: "Controls & help",
      exact: true,
    });
    await expect(
      panel.getByRole("list", { name: "Bumpers", exact: true }),
    ).toBeVisible();
    await expect(panel).toContainText("Emma with a very long name");
    await expectStableScreenshot(
      client,
      ".app-panel[open]",
      `sumo-help-phone-${process.platform}.png`,
      { maxDiffPixels: 160 },
    );
    await client.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(
      client.getByRole("button", { name: "Controls & help", exact: true }),
    ).toBeFocused();
    await host
      .getByRole("button", { name: "Resume Bumpers", exact: true })
      .click();
    await expect(client.locator(".sumo-arena-message strong")).toHaveText("3");
    // Include the next 50ms network broadcast after the resume countdown.
    await host.clock.runFor(3150);
    await expect(client.locator(".sumo-arena-message")).toHaveCount(0);
    await expectScreenFits(client);
  } finally {
    await context.close();
  }
});

test("Sumo dash confirms a burst, fills recharge and keeps playing past sixty seconds", async ({
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
    await chooseGame(host, "Sumo Bumpers");
    await join(host, client, "Emma");
    await host.clock.install();
    await host.clock.pauseAt(new Date(Date.now() + 1000));
    await host
      .getByRole("button", { name: "Start Bumpers", exact: true })
      .click();
    await host.clock.runFor(3050);
    await host.locator(".sumo-court").focus();
    // A stationary dash neither fires nor consumes charge.
    await host.keyboard.press("Space");
    await expect(host.getByTestId("sumo-bumper-0")).toHaveAttribute(
      "data-cooldown",
      "0",
    );
    await host.keyboard.down("ArrowRight");
    await host.keyboard.press("Space");
    await host.clock.runFor(100);
    await expect(host.getByTestId("sumo-bumper-0")).toHaveAttribute(
      "data-dashing",
      "true",
    );
    await expect(client.getByTestId("sumo-bumper-0")).toHaveAttribute(
      "data-dashing",
      "true",
    );
    await expect(
      host.getByRole("button", { name: "Dash", exact: true }),
    ).toBeDisabled();
    await expect(host.locator(".sumo-dash-control")).toContainText("recharge");
    const charging = await host
      .locator(".sumo-recharge circle")
      .last()
      .getAttribute("stroke-dasharray");
    expect(Number(charging!.split(" ")[0])).toBeLessThan(0.1);
    await expectStableScreenshot(
      host,
      ".sumo-game-card",
      `sumo-dash-phone-${process.platform}.png`,
      { maxDiffPixels: 160 },
    );
    await host.emulateMedia({ reducedMotion: "reduce" });
    await expect(host.locator(".sumo-dash-trail")).toBeHidden();
    await host.emulateMedia({ reducedMotion: "no-preference" });
    await host.keyboard.up("ArrowRight");
    await host.clock.runFor(2050);
    await expect(
      host.getByRole("button", { name: "Dash", exact: true }),
    ).toBeEnabled();
    await expect(host.locator(".sumo-recharge circle").last()).toHaveAttribute(
      "stroke-dasharray",
      "1 1",
    );
    // Bring the other bumper inward using actual paired keyboard input.
    await client.locator(".sumo-court").focus();
    await client.keyboard.down("ArrowLeft");
    await expect(host.getByTestId("sumo-bumper-1")).toHaveAttribute(
      "data-dx",
      "-1",
    );
    await client.keyboard.press("Space");
    await expect(host.getByTestId("sumo-bumper-1")).toHaveAttribute(
      "data-cooldown",
      "240",
    );
    await host.clock.runFor(100);
    await client.keyboard.up("ArrowLeft");
    await expect(host.getByTestId("sumo-bumper-1")).toHaveAttribute(
      "data-dx",
      "0",
    );
    await host.clock.runFor(60_000);
    await expect(host.locator(".sumo-game-card")).toHaveAttribute(
      "data-phase",
      "playing",
    );
    await expect(client.locator(".sumo-status")).toContainText("Final squeeze");
    await expectStableScreenshot(
      host,
      ".sumo-game-card",
      `sumo-final-squeeze-phone-${process.platform}.png`,
      { maxDiffPixels: 160 },
    );
    await host
      .getByRole("button", { name: "Pause Bumpers", exact: true })
      .click();
    const tick = await host.locator(".sumo-court").getAttribute("data-tick");
    await host.clock.runFor(3000);
    await expect(host.locator(".sumo-court")).toHaveAttribute(
      "data-tick",
      tick!,
    );
    await host
      .getByRole("button", { name: "Resume Bumpers", exact: true })
      .click();
    await host.clock.runFor(3150);
    await expect(client.locator(".sumo-game-card")).toHaveAttribute(
      "data-phase",
      "playing",
    );
    await host.clock.runFor(30_000);
    await expect(client.locator(".sumo-game-card")).toHaveAttribute(
      "data-phase",
      "finished",
    );
    await expect(client.locator(".sumo-status")).not.toContainText("Time’s up");
    await expectScreenFits(host);
  } finally {
    await context.close();
  }
});
