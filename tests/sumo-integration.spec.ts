import { join, chooseGame, expectScreenFits, returnHome } from "./ui";
import { expect, test } from "@playwright/test";
import { expectStableScreenshot } from "./screenshot";

test("Sumo Bumpers pairs, moves by thumb pad and keyboard, dashes, pauses, finishes and rematches", async ({
  browser,
  page: host,
}) => {
  test.setTimeout(90_000);
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  const lateContext = await browser.newContext();
  try {
    const client = await context.newPage(),
      late = await lateContext.newPage();
    await host.goto("./");
    await host.getByLabel("Your name").fill("Alex");
    await host
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    await chooseGame(host, "Sumo Bumpers");
    await expect(
      host.getByRole("button", { name: "Start Bumpers", exact: true }),
    ).toBeDisabled();
    await join(host, client, "Emma");
    await expect(
      client.getByRole("region", { name: "Sumo Bumpers game" }),
    ).toBeVisible();
    await expect(
      client.getByRole("button", { name: "Start Bumpers", exact: true }),
    ).toHaveCount(0);
    await host.clock.install();
    await host.clock.pauseAt(new Date(Date.now() + 1000));
    await host
      .getByRole("button", { name: "Start Bumpers", exact: true })
      .click();
    await expect(client.locator(".sumo-status")).toHaveText("Get ready… 3");
    await expect(
      client.getByRole("button", { name: "Dash", exact: true }),
    ).toBeDisabled();
    await expect(host.locator(".sumo-court")).toBeFocused();
    await expectStableScreenshot(
      host,
      ".sumo-court",
      `sumo-court-${process.platform}.png`,
    );
    await host.clock.runFor(3050);
    await expect(client.locator(".sumo-status")).toContainText(
      "2 bumpers remain",
    );
    const cdp = await context.newCDPSession(client);
    const pad = await client
      .getByRole("group", { name: "Movement thumb pad", exact: true })
      .boundingBox();
    const beforeScroll = await client.evaluate(() => scrollY);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ id: 1, x: pad!.x + 20, y: pad!.y + pad!.height / 2 }],
    });
    // Wait for the actual data-channel input before advancing the host clock.
    await expect
      .poll(() => host.getByTestId("sumo-bumper-1").getAttribute("data-dx"))
      .toBe("-1");
    const dashBounds = await client
      .getByRole("button", { name: "Dash", exact: true })
      .boundingBox();
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { id: 1, x: pad!.x + 20, y: pad!.y + pad!.height / 2 },
        {
          id: 2,
          x: dashBounds!.x + dashBounds!.width / 2,
          y: dashBounds!.y + dashBounds!.height / 2,
        },
      ],
    });
    await expect
      .poll(async () =>
        Number(
          await host.getByTestId("sumo-bumper-1").getAttribute("data-cooldown"),
        ),
      )
      .toBeGreaterThan(0);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [{ id: 1, x: pad!.x + 20, y: pad!.y + pad!.height / 2 }],
    });
    await host.clock.runFor(100);
    await expect
      .poll(async () =>
        Number(
          await client
            .getByTestId("sumo-bumper-1")
            .getAttribute("data-cooldown"),
        ),
      )
      .toBeGreaterThan(0);
    await expect
      .poll(async () =>
        Number(
          await client.getByTestId("sumo-bumper-1").getAttribute("data-x"),
        ),
      )
      .toBeLessThan(0.75);
    await host.clock.runFor(25);
    const smooth = await host
      .getByTestId("sumo-bumper-1")
      .evaluate((element) => ({
        drawn:
          (element as unknown as SVGGElement).transform.baseVal.consolidate()!
            .matrix.e / 1000,
        target: Number(element.getAttribute("data-x")),
      }));
    // The host draws its own confirmed simulation without client interpolation lag.
    expect(smooth.drawn).toBeCloseTo(smooth.target, 6);
    expect(smooth.drawn).toBeLessThan(0.75);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect
      .poll(() => host.getByTestId("sumo-bumper-1").getAttribute("data-dx"))
      .toBe("0");
    expect(await client.evaluate(() => scrollY)).toBe(beforeScroll);
    await host.locator(".sumo-court").focus();
    await host.keyboard.down("ArrowRight");
    await host.keyboard.press("Space");
    await host.clock.runFor(100);
    await expect
      .poll(async () =>
        Number(
          await client.getByTestId("sumo-bumper-0").getAttribute("data-x"),
        ),
      )
      .toBeGreaterThan(0.25);
    await host.keyboard.up("ArrowRight");
    await host
      .getByRole("button", { name: "Pause Bumpers", exact: true })
      .click();
    await expect(client.locator(".sumo-status")).toHaveText("Ring paused");
    const pausedPosition = await host
      .getByTestId("sumo-bumper-0")
      .evaluate((element) => ({
        drawn: (
          element as unknown as SVGGElement
        ).transform.baseVal.consolidate()!.matrix.e,
        target: Number(element.getAttribute("data-x")) * 1000,
      }));
    expect(pausedPosition.drawn).toBeCloseTo(pausedPosition.target);
    const tick = await host.locator(".sumo-court").getAttribute("data-tick");
    await host.clock.runFor(2000);
    await expect(host.locator(".sumo-court")).toHaveAttribute(
      "data-tick",
      tick!,
    );
    for (const viewport of [
      { width: 320, height: 700 },
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
    ]) {
      await client.setViewportSize(viewport);
      for (const font of ["system", "Arial-tall"]) {
        const style =
          font === "system"
            ? null
            : await client.addStyleTag({
                content: ":root{font-family:Arial,sans-serif;line-height:1.3}",
              });
        await client.keyboard.press("Control+Home");
        const controls = await client.locator(".sumo-controls").boundingBox();
        expect(controls!.y + controls!.height).toBeLessThan(
          viewport.height - 16,
        );
        expect(
          await client.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(viewport.width);
        const dash = await client
          .getByRole("button", { name: "Dash", exact: true })
          .boundingBox();
        expect(dash!.width).toBeGreaterThanOrEqual(90);
        expect(dash!.height).toBeGreaterThanOrEqual(72);
        await client.screenshot({
          path: `test-results/sumo-${viewport.width}-${font}.png`,
          fullPage: true,
        });
        await style?.evaluate((el) => el.remove());
      }
    }
    await host
      .locator(".sumo-game-card")
      .screenshot({ path: "test-results/sumo-game.png" });
    await host.screenshot({
      path: "test-results/sumo-desktop.png",
      fullPage: true,
    });
    await host
      .getByRole("button", { name: "Resume Bumpers", exact: true })
      .click();
    await expect(client.locator(".sumo-status")).toHaveText("Get ready… 3");
    await host.clock.runFor(3050);
    await host.emulateMedia({ reducedMotion: "reduce" });
    await host.locator(".sumo-court").focus();
    await host.keyboard.down("w");
    await host.clock.runFor(100);
    const reduced = await host
      .getByTestId("sumo-bumper-0")
      .evaluate((element) => ({
        drawn: (
          element as unknown as SVGGElement
        ).transform.baseVal.consolidate()!.matrix.f,
        target: Number(element.getAttribute("data-y")) * 1000,
      }));
    expect(reduced.drawn).toBeCloseTo(reduced.target);
    await host.keyboard.up("w");
    await host.emulateMedia({ reducedMotion: "no-preference" });
    // Pairing during live play pauses; a late arrival watches this round.
    await join(host, late, "Sam");
    await expect(late.locator(".sumo-feedback")).toContainText("watching");
    await expect(
      late.getByRole("button", { name: "Dash", exact: true }),
    ).toBeDisabled();
    await returnHome(late);
    await expect(host.locator(".people-card")).toContainText("2 connected");
    await host
      .getByRole("button", { name: "Resume Bumpers", exact: true })
      .click();
    await host.clock.runFor(3050);
    await expect(host.locator(".sumo-status")).toContainText(
      "2 bumpers remain",
    );
    await host.locator(".sumo-court").focus();
    await host.keyboard.down("ArrowLeft");
    await host.clock.runFor(2500);
    await host.keyboard.up("ArrowLeft");
    await expect(client.locator(".sumo-status")).toHaveText("Emma wins!");
    await expect(client.getByTestId("sumo-bumper-0")).toHaveAttribute(
      "data-alive",
      "false",
    );
    await host.getByRole("button", { name: "Bump Again", exact: true }).click();
    await expect(client.getByTestId("sumo-bumper-0")).toHaveAttribute(
      "data-alive",
      "true",
    );
    await expect(client.getByTestId("sumo-bumper-0")).toHaveAttribute(
      "data-x",
      "0.25",
    );
    await returnHome(client);
    await expect(
      host.getByText("A player left. Choose players and start a new round.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      host.getByRole("button", { name: "Start Bumpers", exact: true }),
    ).toBeDisabled();
    await host
      .getByRole("button", { name: "Choose Game", exact: true })
      .click();
    await expect(
      host.getByRole("region", { name: "Game picker" }),
    ).toBeVisible();
  } finally {
    await context.close();
    await lateContext.close();
  }
});

test("eight Sumo bumpers fit narrow phones, clear movement on background and handle host loss", async ({
  browser,
  page: host,
}) => {
  test.setTimeout(90_000);
  const contexts = await Promise.all(
    Array.from({ length: 7 }, () =>
      browser.newContext({
        viewport: { width: 320, height: 700 },
        hasTouch: true,
      }),
    ),
  );
  try {
    await host.goto("./");
    await host
      .getByLabel("Your name")
      .fill("Alex with a very long bumper name");
    await host
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    const clients: Page[] = [];
    for (const [i, context] of contexts.entries()) {
      const client = await context.newPage();
      clients.push(client);
      await join(host, client, `Bumper ${i + 2} with a long name`);
    }
    await chooseGame(host, "Sumo Bumpers");
    await host.clock.install();
    await host.clock.pauseAt(new Date(Date.now() + 1000));
    await host
      .getByRole("button", { name: "Start Bumpers", exact: true })
      .click();
    const client = clients[0];
    await expect(client.locator(".cycle-riders li")).toHaveCount(8);
    await expectScreenFits(client);
    await expectStableScreenshot(
      client,
      ".sumo-game-card",
      `sumo-eight-phone-${process.platform}.png`,
      { maxDiffPixels: 160 },
    );
    await client.addStyleTag({
      content: ":root{font-family:Arial,sans-serif;line-height:1.3}",
    });
    await client.keyboard.press("Control+Home");
    const controls = await client.locator(".sumo-controls").boundingBox();
    expect(controls!.y + controls!.height).toBeLessThan(684);
    expect(
      await client.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(320);
    await client.screenshot({
      path: "test-results/sumo-eight-phone.png",
      fullPage: true,
    });
    await host.clock.runFor(3050);
    await host.locator(".sumo-court").focus();
    await host.keyboard.down("w");
    await host.clock.runFor(100);
    await host.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        value: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await host.keyboard.up("w");
    await expect(client.locator(".sumo-status")).toHaveText("Ring paused");
    await expect(host.getByTestId("sumo-bumper-0")).toHaveAttribute(
      "data-dy",
      "0",
    );
    await host.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        value: false,
      });
    });
    await host
      .getByRole("button", { name: "Resume Bumpers", exact: true })
      .click();
    await expect(client.locator(".sumo-status")).toHaveText("Get ready… 3");
    await returnHome(host);
    await expect(client.locator(".sumo-status")).toHaveText(
      "Host disconnected",
    );
    await expect(
      client.getByRole("button", { name: "Dash", exact: true }),
    ).toBeDisabled();
    await expect(
      client.getByRole("group", { name: "Movement thumb pad", exact: true }),
    ).toHaveAttribute("aria-disabled", "true");
    await client.screenshot({
      path: "test-results/sumo-host-disconnected.png",
      fullPage: true,
    });
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
