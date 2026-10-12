import { join, chooseGame, expectScreenFits, returnHome } from "./ui";
import { expect, test } from "@playwright/test";
import { expectStableScreenshot } from "./screenshot";

test("Light-cycle Arena pairs riders, steers by touch and keyboard, draws, rematches and handles departures", async ({
  browser,
  page: host,
}) => {
  test.setTimeout(120_000);
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
    await chooseGame(host, "Light-cycle Arena");
    await expect(
      host.getByRole("button", { name: "Start Arena", exact: true }),
    ).toBeDisabled();
    await join(host, client, "Emma");
    await expect(
      client.getByRole("region", { name: "Light-cycle Arena game" }),
    ).toBeVisible();
    await expect(
      client.getByRole("button", { name: "Start Arena", exact: true }),
    ).toHaveCount(0);
    await host.clock.install();
    await host.clock.pauseAt(new Date(Date.now() + 1000));
    await host
      .getByRole("button", { name: "Start Arena", exact: true })
      .click();
    await expect(client.locator(".cycle-status")).toHaveText("Get ready… 3");
    await expect(
      client.getByRole("button", { name: "Steer up", exact: true }),
    ).toBeDisabled();
    await expect(host.locator(".cycle-court")).toBeFocused();
    const startBounds = await host.locator(".cycle-court").boundingBox();
    expect(startBounds!.y).toBeGreaterThanOrEqual(0);
    expect(startBounds!.y + startBounds!.height).toBeLessThanOrEqual(720);
    expect(startBounds!.width).toBeGreaterThanOrEqual(500);
    await expectStableScreenshot(host, ".cycle-court", "cycle-court.png");
    await host.clock.runFor(3000);
    await expect(
      client.getByRole("button", { name: "Steer up", exact: true }),
    ).toBeEnabled();
    // Between authoritative grid steps, head and trail advance continuously.
    await host.clock.runFor(150);
    await expect(host.getByTestId("cycle-rider-0")).toHaveAttribute(
      "data-x",
      "5",
    );
    await host.clock.runFor(25);
    const headX = await host
      .getByTestId("cycle-rider-0")
      .evaluate(
        (element) =>
          (element as unknown as SVGGElement).transform.baseVal.consolidate()!
            .matrix.e,
      );
    expect(headX).toBeGreaterThan(45);
    expect(headX).toBeLessThan(55);
    const trailX = await host
      .getByTestId("cycle-extension-0")
      .getAttribute("x2");
    expect(Number(trailX)).toBeCloseTo(headX);
    await client.getByRole("button", { name: "Steer up", exact: true }).tap();
    // Touch arrives over the actual DataChannel before the next grid step.
    await expect
      .poll(() => host.locator(".people-card").textContent())
      .toContain("Emma");
    await host.clock.runFor(300);
    await expect(host.getByTestId("cycle-rider-1")).toHaveAttribute(
      "data-direction",
      "up",
    );
    const downButton = host.getByRole("button", {
      name: "Steer down",
      exact: true,
    });
    const downBounds = (await downButton.boundingBox())!;
    await host.mouse.move(
      downBounds.x + downBounds.width / 2 - 10,
      downBounds.y + downBounds.height / 2,
    );
    await host.mouse.down();
    await host.mouse.move(
      downBounds.x + downBounds.width / 2 + 10,
      downBounds.y + downBounds.height / 2,
      { steps: 6 },
    );
    await host.mouse.up();
    expect(await host.evaluate(() => window.getSelection()?.toString())).toBe(
      "",
    );
    await host.clock.runFor(150);
    await expect(client.getByTestId("cycle-rider-0")).toHaveAttribute(
      "data-direction",
      "down",
    );
    await client.getByRole("button", { name: "Steer down", exact: true }).tap();
    await host.clock.runFor(300);
    await expect(host.getByTestId("cycle-rider-1")).toHaveAttribute(
      "data-direction",
      "up",
    );
    await host.locator(".cycle-court").press("ArrowLeft");
    await host.clock.runFor(150);
    await expect(client.getByTestId("cycle-rider-0")).toHaveAttribute(
      "data-direction",
      "left",
    );
    await host
      .getByRole("button", { name: "Pause Arena", exact: true })
      .click();
    await expect(client.locator(".cycle-status")).toHaveText("Arena paused");
    const pausedHead = host.getByTestId("cycle-rider-0");
    const pausedMatrix = await pausedHead.evaluate(
      (element) =>
        (element as unknown as SVGGElement).transform.baseVal.consolidate()!
          .matrix.e,
    );
    expect(pausedMatrix).toBe(
      Number(await pausedHead.getAttribute("data-x")) * 10 + 5,
    );
    const tick = await host.locator(".cycle-court").getAttribute("data-tick");
    await host.clock.runFor(3000);
    await expect(host.locator(".cycle-court")).toHaveAttribute(
      "data-tick",
      tick!,
    );
    for (const viewport of [
      { width: 320, height: 568 },
      { width: 320, height: 700 },
      { width: 360, height: 740 },
      { width: 390, height: 844 },
      { width: 844, height: 390 },
      { width: 768, height: 1024 },
      { width: 1280, height: 720 },
    ]) {
      await client.setViewportSize(viewport);
      for (const font of ["system", "Arial-tall"]) {
        const style =
          font === "system"
            ? null
            : await client.addStyleTag({
                content: ":root{font-family:Arial,sans-serif;line-height:1.6}",
              });
        await expectScreenFits(client);
        const surface = (await client.locator(".game-surface").boundingBox())!;
        const court = (await client.locator(".cycle-court").boundingBox())!;
        expect(Math.abs(court.width - court.height)).toBeLessThanOrEqual(1);
        expect(
          Math.abs(court.width - Math.min(surface.width, surface.height)),
        ).toBeLessThanOrEqual(2);
        expect(
          await client
            .locator(".cycle-court")
            .evaluate((e) => getComputedStyle(e).borderRadius),
        ).toBe("0px");
        if (viewport.width === 390)
          expect(court.width).toBeGreaterThanOrEqual(340);
        if (viewport.width === 1280)
          expect(court.width).toBeGreaterThanOrEqual(500);
        const controls = (await client
          .locator(".cycle-controls")
          .boundingBox())!;
        expect(controls.y + controls.height).toBeLessThan(viewport.height - 16);
        for (const button of await client
          .locator(".cycle-controls button")
          .all()) {
          const bounds = (await button.boundingBox())!;
          expect(bounds.width).toBeGreaterThanOrEqual(72);
          expect(bounds.height).toBeGreaterThanOrEqual(64);
          expect(
            bounds.x >= court.x + court.width + 4 ||
              bounds.y >= court.y + court.height + 4,
          ).toBe(true);
        }
        await client.screenshot({
          path: `test-results/cycle-${viewport.width}x${viewport.height}-${font}.png`,
        });
        await style?.evaluate((e) => e.remove());
      }
    }
    await host.screenshot({
      path: "test-results/cycle-desktop.png",
      fullPage: true,
    });
    await host
      .locator(".cycle-game-card")
      .screenshot({ path: "test-results/cycle-game.png" });
    await host
      .getByRole("button", { name: "Resume Arena", exact: true })
      .click();
    await expect(client.locator(".cycle-status")).toHaveText("Get ready… 3");
    // Reduced-motion users get exact grid positions without interpolation.
    await host.emulateMedia({ reducedMotion: "reduce" });
    await host.clock.runFor(3000);
    await expect(host.locator(".cycle-status")).toContainText("riders remain");
    await host.clock.runFor(150);
    const reducedHead = host.getByTestId("cycle-rider-0");
    const reducedPosition = await reducedHead.evaluate((element) => ({
      x: (element as unknown as SVGGElement).transform.baseVal.consolidate()!
        .matrix.e,
      y: (element as unknown as SVGGElement).transform.baseVal.consolidate()!
        .matrix.f,
      targetX: Number(element.getAttribute("data-x")) * 10 + 5,
      targetY: Number(element.getAttribute("data-y")) * 10 + 5,
    }));
    expect(reducedPosition.x).toBe(reducedPosition.targetX);
    expect(reducedPosition.y).toBe(reducedPosition.targetY);
    await host.emulateMedia({ reducedMotion: "no-preference" });
    // Re-select for a deterministic untouched round; equal wall distances draw.
    await host
      .getByRole("button", { name: "Choose Game", exact: true })
      .click();
    await chooseGame(host, "Light-cycle Arena");
    await host
      .getByRole("button", { name: "Start Arena", exact: true })
      .click();
    await host.clock.runFor(7500);
    await expect(client.locator(".cycle-status")).toHaveText(
      "Draw! Everyone crashed.",
    );
    await host.getByRole("button", { name: "Ride Again", exact: true }).click();
    await expect(client.getByTestId("cycle-rider-1")).toHaveAttribute(
      "data-alive",
      "true",
    );
    await host.clock.runFor(3000);
    await host.clock.resume();
    await join(host, late, "Sam with a long family name");
    await expect(host.locator(".cycle-status")).toHaveText("Arena paused");
    await expect(late.locator(".cycle-feedback")).toContainText(
      "You’re watching",
    );
    await expect(
      late.getByRole("button", { name: "Steer up", exact: true }),
    ).toBeDisabled();
    await host
      .getByRole("button", { name: "Resume Arena", exact: true })
      .click();
    await returnHome(late);
    await expect(
      host.getByRole("button", { name: "Pause Arena", exact: true }),
    ).toBeVisible();
    await returnHome(client);
    await expect(
      host.getByText("A player left. Choose players and start a new round.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      host.getByRole("button", { name: "Start Arena", exact: true }),
    ).toBeDisabled();
  } finally {
    await context.close();
    await lateContext.close();
  }
});

test("eight Light-cycle riders fit a narrow phone and support swipe, background pause and host loss", async ({
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
    await host.getByLabel("Your name").fill("Alex with a very long rider name");
    await host
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    const clients: Page[] = [];
    for (const [i, context] of contexts.entries()) {
      const client = await context.newPage();
      clients.push(client);
      await join(host, client, `Rider ${i + 2} with a long family name`);
    }
    await chooseGame(host, "Light-cycle Arena");
    await host.clock.install();
    await host.clock.pauseAt(new Date(Date.now() + 1000));
    await host
      .getByRole("button", { name: "Start Arena", exact: true })
      .click();
    const client = clients[0];
    await expect(client.locator(".cycle-riders li")).toHaveCount(8);
    await client.addStyleTag({
      content: ":root{font-family:Arial,sans-serif;line-height:1.3}",
    });
    await client.keyboard.press("Control+Home");
    const bounds = await client.locator(".cycle-controls").boundingBox();
    expect(bounds!.y + bounds!.height).toBeLessThan(684);
    expect(
      await client.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(320);
    await client.screenshot({
      path: "test-results/cycle-eight-phone.png",
      fullPage: true,
    });
    await host.clock.runFor(3000);
    // A physical-style touch swipe on the play surface must turn without scrolling.
    const court = await client.locator(".cycle-court").boundingBox();
    const x = court!.x + court!.width / 2,
      y = court!.y + court!.height / 2;
    const cdp = await client.context().newCDPSession(client);
    const beforeScroll = await client.evaluate(() => scrollY);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y: y - 45 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await host.clock.runFor(300);
    await expect(host.getByTestId("cycle-rider-1")).toHaveAttribute(
      "data-direction",
      "up",
    );
    expect(await client.evaluate(() => scrollY)).toBe(beforeScroll);
    // Walk the host through all four directions using normal keyboard input.
    for (const [key, direction] of [
      ["s", "down"],
      ["a", "left"],
      ["w", "up"],
      ["d", "right"],
    ]) {
      await host.locator(".cycle-court").press(key);
      await host.clock.runFor(450);
      await expect(client.getByTestId("cycle-rider-0")).toHaveAttribute(
        "data-direction",
        direction,
      );
    }
    await host.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        value: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(client.locator(".cycle-status")).toHaveText("Arena paused");
    await host.clock.runFor(2000);
    await host.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        value: false,
      });
    });
    await host
      .getByRole("button", { name: "Resume Arena", exact: true })
      .click();
    await expect(client.locator(".cycle-status")).toHaveText("Get ready… 3");
    await returnHome(host);
    await expect(client.locator(".cycle-status")).toHaveText(
      "Host disconnected",
    );
    await expect(
      client.getByRole("button", { name: "Steer up", exact: true }),
    ).toBeDisabled();
    await client.screenshot({
      path: "test-results/cycle-host-disconnected.png",
      fullPage: true,
    });
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
