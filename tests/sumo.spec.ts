import { expect, test, type Page } from "@playwright/test";
import { chooseGame, expectScreenFits, join, showHelp } from "./ui";
import { expectStableScreenshot } from "./screenshot";

// QA inventory: ready preview; two-player countdown/play; thumb deck and local
// marker; pause/resume; help/roster focus return; reduced motion; short phone,
// portrait tablet, landscape and desktop fit. The existing game.spec covers
// physical-style two-thumb input, eight players, spectators and disconnects.
async function expectSumoComposition(page: Page, wide: boolean) {
  await expectScreenFits(page);
  const bounds = await page.evaluate(() => {
    const rect = (selector: string) =>
      document.querySelector(selector)!.getBoundingClientRect().toJSON();
    return {
      card: rect(".sumo-game-card"),
      stage: rect(".sumo-game-card > .game-surface"),
      ring: rect(".sumo-court"),
      controls: rect(".sumo-controls"),
      pad: rect(".sumo-stick"),
      dash: rect(".sumo-dash-control"),
      button: rect(".sumo-dash-control button"),
      footer: rect(".sumo-footer"),
    };
  });
  for (const [parent, children] of [
    [bounds.card, [bounds.stage, bounds.controls, bounds.footer]],
    [bounds.stage, [bounds.ring]],
    [bounds.controls, [bounds.pad, bounds.dash]],
    [bounds.dash, [bounds.button]],
  ] as const) {
    for (const child of children) {
      expect(child.x).toBeGreaterThanOrEqual(parent.x - 1);
      expect(child.y).toBeGreaterThanOrEqual(parent.y - 1);
      expect(child.right).toBeLessThanOrEqual(parent.right + 1);
      expect(child.bottom).toBeLessThanOrEqual(parent.bottom + 1);
    }
  }
  expect(bounds.controls.bottom).toBeLessThanOrEqual(bounds.footer.y);
  expect(bounds.button.width).toBeGreaterThanOrEqual(90);
  expect(bounds.button.height).toBeGreaterThanOrEqual(72);
  expect(bounds.pad.width).toBeGreaterThanOrEqual(96);
  expect(bounds.ring.width).toBeCloseTo(bounds.ring.height, 0);
  if (wide) {
    expect(bounds.pad.right).toBeLessThan(bounds.ring.x);
    expect(bounds.dash.x).toBeGreaterThan(bounds.ring.right);
    expect(bounds.ring.width).toBeGreaterThan(500);
  }
}

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
      ["iphone-pro", { width: 402, height: 874 }],
      ["iphone-max", { width: 440, height: 956 }],
      ["ipad-air", { width: 1180, height: 820 }],
      ["ipad-secondary", { width: 1080, height: 810 }],
    ] as const) {
      await client.setViewportSize(viewport);
      const wide = viewport.width >= 1000;
      await expectSumoComposition(client, wide);
      const tallerFont = await client.addStyleTag({
        content: ":root { font-family: Arial, sans-serif; line-height: 1.3; }",
      });
      await expectSumoComposition(client, wide);
      await tallerFont.evaluate((element) => element.remove());
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
    await expect(host.locator(".sumo-dash-control")).toHaveAttribute(
      "data-ready",
      "true",
    );
    await expect(host.locator(".sumo-dash-control > span").first()).toHaveText(
      "Dash ready",
    );
    await expect(host.locator(".sumo-aim")).toHaveCount(0);
    await host.locator(".sumo-court").focus();
    // A stationary dash neither fires nor consumes charge.
    await host.keyboard.press("Space");
    await expect(host.getByTestId("sumo-bumper-0")).toHaveAttribute(
      "data-cooldown",
      "0",
    );
    await host.keyboard.down("ArrowRight");
    await expect(host.locator(".sumo-aim")).toHaveAttribute(
      "transform",
      "rotate(0)",
    );
    await expect(client.locator(".sumo-aim")).toHaveCount(0);
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
    await expect(host.locator(".sumo-aim")).toHaveCount(0);
    await host.clock.runFor(2050);
    await expect(
      host.getByRole("button", { name: "Dash", exact: true }),
    ).toBeEnabled();
    await expect(host.locator(".sumo-recharge circle").last()).toHaveAttribute(
      "stroke-dasharray",
      "1 1",
    );
    await expect(host.locator(".sumo-dash-control")).toHaveAttribute(
      "data-ready",
      "true",
    );
    await expect(host.locator(".sumo-dash-control > span").first()).toHaveText(
      "Dash ready",
    );
    await expectStableScreenshot(
      host,
      ".sumo-game-card",
      `sumo-recharged-phone-${process.platform}.png`,
      { maxDiffPixels: 160 },
    );
    await host.setViewportSize({ width: 1180, height: 820 });
    await host.locator(".sumo-court").focus();
    await host.keyboard.down("ArrowUp");
    await expect(host.locator(".sumo-aim")).toHaveAttribute(
      "transform",
      "rotate(-90)",
    );
    await expect(
      host.locator('.sumo-bot-art[data-local="true"] .sumo-local-marker'),
    ).toBeHidden();
    await expectSumoComposition(host, true);
    await expectStableScreenshot(
      host,
      ".sumo-game-card",
      `sumo-aim-ipad-${process.platform}.png`,
      { maxDiffPixels: 160 },
    );
    await host.keyboard.up("ArrowUp");
    await expect(host.locator(".sumo-aim")).toHaveCount(0);
    await expect(
      host.locator('.sumo-bot-art[data-local="true"] .sumo-local-marker'),
    ).toBeVisible();
    await host.setViewportSize({ width: 390, height: 844 });
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
    const pad = (await host
      .getByRole("group", { name: "Movement thumb pad", exact: true })
      .boundingBox())!;
    await host.mouse.move(pad.x + pad.width / 2 + 1, pad.y + pad.height / 2);
    await host.mouse.down();
    await host.clock.runFor(17);
    await expect(host.getByTestId("sumo-bumper-0")).toHaveAttribute(
      "data-dx",
      "0",
    );
    // Captured off-pad travel stays normalized and keeps the knob inside its well.
    await host.mouse.move(pad.x + pad.width + 30, pad.y - 30);
    await host.clock.runFor(17);
    const dx = Number(
      await host.getByTestId("sumo-bumper-0").getAttribute("data-dx"),
    );
    const dy = Number(
      await host.getByTestId("sumo-bumper-0").getAttribute("data-dy"),
    );
    expect(Math.hypot(dx, dy)).toBeCloseTo(1);
    expect(dx).toBeGreaterThan(0);
    expect(dy).toBeLessThan(0);
    const knob = (await host.locator(".sumo-stick-knob").boundingBox())!;
    expect(knob.x).toBeGreaterThanOrEqual(pad.x);
    expect(knob.y).toBeGreaterThanOrEqual(pad.y);
    expect(knob.x + knob.width).toBeLessThanOrEqual(pad.x + pad.width);
    expect(knob.y + knob.height).toBeLessThanOrEqual(pad.y + pad.height);
    await host.mouse.up();
    await host.clock.runFor(17);
    await expect(host.getByTestId("sumo-bumper-0")).toHaveAttribute(
      "data-dx",
      "0",
    );
    await host.locator(".sumo-court").focus();
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

// Feedback QA: confirmed paired collision, no replay, elimination while others
// play, winner/draw, long names, rematch reset, reduced motion, result fit/focus.
test("Sumo feedback confirms collisions and celebrates a paired winner", async ({
  page: host,
  browser,
}) => {
  test.setTimeout(90_000);
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
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
    await join(host, client, "Emma with a very long name");
    await host.emulateMedia({ reducedMotion: "reduce" });
    await host.clock.install();
    await host.clock.pauseAt(new Date(Date.now() + 1000));
    await host
      .getByRole("button", { name: "Start Bumpers", exact: true })
      .click();
    await host.clock.runFor(3050);
    await client.locator(".sumo-court").focus();
    await client.keyboard.down("ArrowLeft");
    await client.keyboard.press("Space");
    await expect(host.getByTestId("sumo-bumper-1")).toHaveAttribute(
      "data-cooldown",
      "240",
    );
    await host.locator(".sumo-court").focus();
    await host.keyboard.down("ArrowRight");
    await host.keyboard.press("Space");
    // Advance to the first confirmed contact without expiring its short feedback.
    for (let i = 0; i < 30; i++) {
      await host.clock.runFor(10);
      if (await host.locator(".sumo-effect-impact").count()) break;
    }
    await expect(host.locator(".sumo-effect-impact")).toHaveCount(2);
    await host.clock.runFor(50); // Reach the next 20Hz paired snapshot.
    await expect(client.locator(".sumo-effect-impact").first()).toBeAttached();
    await expect(host.locator(".sumo-effect-burst").first()).toHaveCSS(
      "animation-name",
      "none",
    );
    await host.keyboard.up("ArrowRight");
    await client.keyboard.up("ArrowLeft");
    await expectStableScreenshot(
      host,
      ".sumo-game-card",
      `sumo-impact-phone-${process.platform}.png`,
      { maxDiffPixels: 160 },
    );
    await host.clock.runFor(300);
    await expect(host.locator(".sumo-effect-impact")).toHaveCount(0);
    await host.clock.runFor(2200);
    // A real outward dash ends the round; the surviving long name remains readable.
    await host.keyboard.down("ArrowLeft");
    await host.keyboard.press("Space");
    await host.clock.runFor(1200);
    await host.keyboard.up("ArrowLeft");
    await expect(host.locator(".sumo-result")).toHaveAttribute(
      "data-result",
      "winner",
    );
    await expect(host.locator(".sumo-result strong")).toHaveText(
      "Emma with a very long name",
    );
    await expect(client.locator(".sumo-result-verdict")).toHaveText("You win!");
    await expect(host.locator(".sumo-controls")).toBeHidden();
    // Feedback starts when React displays the confirmed ring-out, not at its
    // earlier simulation tick inside runFor. Advance its own lifetime explicitly.
    await host.clock.runFor(850);
    await expect(host.locator(".sumo-effect")).toHaveCount(0);
    for (const [name, viewport] of [
      ["phone", { width: 390, height: 844 }],
      ["tablet", { width: 768, height: 1024 }],
      ["desktop", { width: 1280, height: 900 }],
      ["landscape", { width: 844, height: 390 }],
      ["short-phone", { width: 320, height: 700 }],
    ] as const) {
      await host.setViewportSize(viewport);
      if (name === "short-phone")
        await host.addStyleTag({
          content:
            ":root { --safe-area-bottom:20px; font-family:Arial,sans-serif; line-height:1.3; }",
        });
      await expectScreenFits(host);
      const result = (await host.locator(".sumo-result").boundingBox())!;
      for (const selector of [
        ".sumo-result-kicker",
        ".sumo-result strong",
        ".sumo-result-verdict",
        ".sumo-result small",
      ]) {
        const text = (await host.locator(selector).boundingBox())!;
        expect(text.y).toBeGreaterThanOrEqual(result.y);
        expect(text.y + text.height).toBeLessThanOrEqual(
          result.y + result.height,
        );
      }
      await expectStableScreenshot(
        host,
        ".sumo-game-card",
        `sumo-winner-${name}-${process.platform}.png`,
        { maxDiffPixels: 160 },
      );
    }
    await showHelp(host);
    await expect(host.getByRole("dialog")).toContainText(
      "Emma with a very long name",
    );
    await host.keyboard.press("Escape");
    await expect(
      host.getByRole("button", { name: "Controls & help", exact: true }),
    ).toBeFocused();
    await host.getByRole("button", { name: "Bump Again", exact: true }).click();
    await expect(client.locator(".sumo-arena-message strong")).toHaveText("3");
    await expect(host.locator(".sumo-result")).toHaveCount(0);
    await expect(host.locator(".sumo-effect")).toHaveCount(0);
    await host.clock.runFor(3050);
    await expect(host.locator(".sumo-game-card")).toHaveAttribute(
      "data-phase",
      "playing",
    );
    await expect(host.locator(".sumo-effect")).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("Sumo feedback marks a ring-out while others play and distinguishes a draw", async ({
  page: host,
  browser,
}) => {
  test.setTimeout(90_000);
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
  ]);
  try {
    const clients = await Promise.all(contexts.map((c) => c.newPage()));
    await host.setViewportSize({ width: 390, height: 844 });
    await host.goto("./");
    await host.getByLabel("Your name").fill("Alex");
    await host
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    await chooseGame(host, "Sumo Bumpers");
    await join(host, clients[0], "Emma");
    await join(host, clients[1], "Sam");
    await host.emulateMedia({ reducedMotion: "reduce" });
    await host.clock.install();
    await host.clock.pauseAt(new Date(Date.now() + 1000));
    await host
      .getByRole("button", { name: "Start Bumpers", exact: true })
      .click();
    await host.clock.runFor(3050);
    await host.locator(".sumo-court").focus();
    await host.keyboard.down("ArrowLeft");
    await host.keyboard.press("Space");
    for (let i = 0; i < 40; i++) {
      await host.clock.runFor(10);
      if (await host.locator(".sumo-effect-out").count()) break;
    }
    await host.keyboard.up("ArrowLeft");
    await expect(host.locator(".sumo-effect-out")).toContainText("1 OUT!");
    await expect(host.locator(".sumo-effect-out .sumo-effect-burst")).toHaveCSS(
      "animation-name",
      "none",
    );
    await expect(host.locator(".sumo-status")).toContainText(
      "2 bumpers remain",
    );
    await expect(
      host.getByRole("button", { name: "Dash", exact: true }),
    ).toBeDisabled();
    await expectStableScreenshot(
      host,
      ".sumo-game-card",
      `sumo-ring-out-phone-${process.platform}.png`,
      { maxDiffPixels: 160 },
    );
    await host.clock.runFor(850);
    await expect(host.locator(".sumo-effect")).toHaveCount(0);
    await host
      .getByRole("button", { name: "Pause Bumpers", exact: true })
      .click();
    await host
      .getByRole("button", { name: "Resume Bumpers", exact: true })
      .click();
    await host.clock.runFor(3050);
    await expect(host.locator(".sumo-effect")).toHaveCount(0);
    // Reset for a symmetric, simultaneous ring-out using the actual pressure rule.
    await host
      .getByRole("button", { name: "Pause Bumpers", exact: true })
      .click();
    // The existing leave/reset flow provides a clean two-player rematch.
    await clients[1].close();
    await expect(
      host.getByRole("button", { name: "Start Bumpers", exact: true }),
    ).toBeVisible();
    await host
      .getByRole("button", { name: "Start Bumpers", exact: true })
      .click();
    await host.clock.runFor(3050);
    await host.clock.runFor(50_000);
    await expect(host.locator(".sumo-result")).toHaveAttribute(
      "data-result",
      "draw",
    );
    await expect(clients[0].locator(".sumo-result strong")).toHaveText(
      "It’s a draw!",
    );
    await host.clock.runFor(850);
    await expect(host.locator(".sumo-effect")).toHaveCount(0);
    await expectScreenFits(host);
    await expectStableScreenshot(
      host,
      ".sumo-game-card",
      `sumo-draw-phone-${process.platform}.png`,
      { maxDiffPixels: 160 },
    );
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
