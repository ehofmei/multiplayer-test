import { test, expect, type Page } from "@playwright/test";
import {
  chooseGame,
  join,
  expectScreenFits,
  showHelp,
  closePanels,
} from "./ui";
import { expectStableScreenshot } from "./screenshot";

const card = (page: Page) => page.locator(".pong-game-card");
test("Pong confirms contacts, labels points and both match points, finishes and replays for a watching host", async ({
  page: host,
  browser,
}) => {
  test.setTimeout(180000);
  const contexts = await Promise.all(
    [0, 1].map(() =>
      browser.newContext({
        viewport: { width: 402, height: 874 },
        reducedMotion: "reduce",
      }),
    ),
  );
  try {
    const [one, two] = await Promise.all(contexts.map((c) => c.newPage()));
    await host.setViewportSize({ width: 1180, height: 820 });
    await host.emulateMedia({ reducedMotion: "reduce" });
    await host.goto("./");
    await host.getByLabel("Your name").fill("Watching host");
    await host
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    await join(host, one, "Alexandra the Champion");
    await join(host, two, "Emmanuel the Challenger");
    await chooseGame(host, "Pong");
    await host
      .getByLabel("Player 1")
      .selectOption({ label: "Alexandra the Champion" });
    await host
      .getByLabel("Player 2")
      .selectOption({ label: "Emmanuel the Challenger" });
    await host.clock.install({ time: new Date("2026-10-13T12:00:00Z") });
    await host.clock.pauseAt(new Date("2026-10-13T12:00:01Z"));
    await host.getByRole("button", { name: "Start Pong", exact: true }).click();
    for (const page of [one, two]) {
      await expect(page.getByTestId("pong-local-mark")).toHaveCount(1);
      await expect(
        page.getByText("You · bottom", { exact: true }),
      ).toBeVisible();
    }
    await expect(host.getByTestId("pong-local-mark")).toHaveCount(0);
    await expect(
      host.getByRole("slider", { name: "Paddle steering" }),
    ).toHaveCount(0);
    await host.clock.runFor(1100);
    // Defend both paddles at a deliberate offset to obtain an ordinary contact.
    const setPaddle = async (
      page: Page,
      position: number,
      reversed: boolean,
    ) => {
      const court = (await page.locator(".pong-court").boundingBox())!;
      await page.mouse.click(
        court.x + court.width * (reversed ? 1 - position : position),
        court.y + court.height * 0.85,
      );
    };
    const synced = async () => {
      for (const [seat, page] of [one, two].entries())
        await expect
          .poll(
            async () =>
              (await host.getByTestId(`paddle-${seat}`).getAttribute("y")) ===
              (await page.getByTestId(`paddle-${seat}`).getAttribute("y")),
          )
          .toBe(true);
    };
    let contact = false;
    for (let tick = 0; tick < 80; tick++) {
      const y = Number(
        await host.getByTestId("pong-ball").getAttribute("data-y"),
      );
      await setPaddle(one, y - 0.07, false);
      await setPaddle(two, y - 0.07, true);
      await synced();
      await host.clock.runFor(50);
      if (await host.getByTestId("pong-contact").count()) {
        contact = true;
        break;
      }
    }
    expect(contact).toBe(true);
    await expect(host.getByTestId("pong-contact")).toHaveAttribute(
      "data-kind",
      "paddle",
    );
    await host.clock.runFor(50);
    await expect(one.locator(".pong-court")).toHaveAttribute(
      "data-contact-sequence",
      (await host
        .locator(".pong-court")
        .getAttribute("data-contact-sequence"))!,
    );
    await expectStableScreenshot(
      host,
      ".pong-game-card",
      `pong-contact-spectator-${process.platform}.png`,
      { maxDiffPixels: 180 },
    );
    // Start a fresh rally after the contact demonstration, using normal controls.
    await host
      .getByRole("button", { name: "Choose Game", exact: true })
      .click();
    await chooseGame(host, "Pong");
    await host
      .getByLabel("Player 1")
      .selectOption({ label: "Alexandra the Champion" });
    await host
      .getByLabel("Player 2")
      .selectOption({ label: "Emmanuel the Challenger" });
    await host.getByRole("button", { name: "Start Pong", exact: true }).click();
    // Choose who concedes using ordinary pointer controls, never injected scores.
    const earnPoint = async (scorer: number) => {
      const old = Number(
        await host.getByTestId(`pong-score-${scorer}`).textContent(),
      );
      for (
        let tick = 0;
        tick < 300 &&
        Number(await host.getByTestId(`pong-score-${scorer}`).textContent()) ===
          old;
        tick++
      ) {
        const y = Number(
          await host.getByTestId("pong-ball").getAttribute("data-y"),
        );
        for (const [seat, page] of [one, two].entries())
          await setPaddle(
            page,
            seat === scorer ? y : y > 0.5 ? 0.12 : 0.88,
            seat === 1,
          );
        await synced();
        await host.clock.runFor(50);
      }
      await expect(host.getByTestId(`pong-score-${scorer}`)).toHaveText(
        String(old + 1),
      );
      // A scored fixed step can precede the next 20 Hz broadcast.
      await host.clock.runFor(50);
      for (const page of [one, two])
        await expect(page.getByTestId(`pong-score-${scorer}`)).toHaveText(
          String(old + 1),
        );
    };
    await earnPoint(0);
    await expect(card(host)).toHaveAttribute("data-phase", "serve");
    await expect(host.locator(".game-status")).toContainText(
      "Alexandra the Champion +1",
    );
    await expectStableScreenshot(
      one,
      ".pong-game-card",
      `pong-point-serve-${process.platform}.png`,
      { maxDiffPixels: 180 },
    );
    await host.clock.runFor(1050);
    await expect(card(host)).toHaveAttribute("data-phase", "playing");
    await expect(host.locator(".game-status")).toContainText(
      "Alexandra the Champion +1",
    );
    await host.clock.runFor(200);
    await expect(host.locator(".game-status")).toHaveText("First to seven");
    for (let point = 1; point < 12; point++) await earnPoint(point % 2);
    await expect(host.getByTestId("pong-score-0")).toHaveText("6");
    await expect(host.getByTestId("pong-score-1")).toHaveText("6");
    await expect(host.getByText(/Match point/)).toHaveCount(2);
    await host.getByRole("button", { name: "Pause Pong", exact: true }).click();
    for (const page of [one, two])
      await expect(card(page)).toHaveAttribute("data-phase", "paused");
    await expectStableScreenshot(
      two,
      ".pong-game-card",
      `pong-match-point-client-${process.platform}.png`,
      { maxDiffPixels: 180 },
    );
    // Late arrivals watch the paused 6–6 match without replaying old rewards.
    for (let i = 0; i < 5; i++) {
      const context = await browser.newContext({
        viewport: { width: 440, height: 956 },
        reducedMotion: "reduce",
      });
      contexts.push(context);
      const watcher = await context.newPage();
      await join(host, watcher, `Watcher ${i + 1}`);
      await expect(card(watcher)).toHaveAttribute("data-phase", "paused");
      await expect(watcher.getByTestId("pong-score-0")).toHaveText("6");
      await expect(watcher.locator(".pong-point")).toHaveCount(0);
      await expect(watcher.getByTestId("pong-contact")).toHaveCount(0);
      await expect(watcher.getByTestId("pong-local-mark")).toHaveCount(0);
    }
    await host
      .getByRole("button", { name: "Resume Pong", exact: true })
      .click();
    await earnPoint(1);
    for (const page of [host, one, two]) {
      await expect(card(page)).toHaveAttribute("data-phase", "finished");
      await expect(
        page.getByRole("status", { name: "Match result" }),
      ).toContainText("Emmanuel the Challenger");
      await expect(
        page.getByRole("status", { name: "Match result" }),
      ).toContainText("6 – 7");
      await expectScreenFits(page);
    }
    await expect(two.getByText("You won!", { exact: false })).toBeVisible();
    await expect(one.getByText("Good match!", { exact: false })).toBeVisible();
    await expect(
      host.getByText("Thanks for watching", { exact: false }),
    ).toBeVisible();
    await expectStableScreenshot(
      two,
      ".pong-game-card",
      `pong-finale-phone-${process.platform}.png`,
      { maxDiffPixels: 180 },
    );
    await expectStableScreenshot(
      host,
      ".pong-game-card",
      `pong-finale-ipad-${process.platform}.png`,
      { maxDiffPixels: 180 },
    );
    for (const size of [
      { width: 320, height: 568 },
      { width: 844, height: 390 },
      { width: 440, height: 956 },
      { width: 1080, height: 810 },
      { width: 1280, height: 720 },
    ]) {
      await host.setViewportSize(size);
      const style = await host.addStyleTag({
        content: ":root{font-family:serif;line-height:1.6}",
      });
      await expectScreenFits(host);
      const picker = (await host.locator(".seat-picker").boundingBox())!;
      for (const name of ["Play Again", "Controls & help"]) {
        const button = (await host
          .getByRole("button", { name, exact: true })
          .boundingBox())!;
        expect(button.y - picker.y - picker.height).toBeGreaterThanOrEqual(12);
      }
      await host.screenshot({
        path: `test-results/pong-finale-${size.width}x${size.height}.png`,
      });
      await style.evaluate((el) => el.remove());
      if (size.width === 844) {
        await expectStableScreenshot(
          host,
          ".pong-game-card",
          `pong-finale-landscape-${process.platform}.png`,
          { maxDiffPixels: 180 },
        );
      }
    }
    await host.setViewportSize({ width: 844, height: 390 });
    await host
      .getByLabel("Player 2", { exact: true })
      .selectOption({ label: "Alexandra the Champion" });
    await expect(
      host.getByRole("button", { name: "Play Again", exact: true }),
    ).toBeDisabled();
    await expect(host.locator("#pong-rematch-guidance")).toHaveText(
      "Choose different players for each seat.",
    );
    await expect(host.locator(".spectator-status")).toHaveCount(0);
    await expectScreenFits(host);
    await expectStableScreenshot(
      host,
      ".pong-game-card",
      `pong-invalid-rematch-landscape-${process.platform}.png`,
      { maxDiffPixels: 180 },
    );
    await host
      .getByLabel("Player 2", { exact: true })
      .selectOption({ label: "Emmanuel the Challenger" });
    await showHelp(two);
    await closePanels(two);
    await expect(
      host.getByLabel("Player 1", { exact: true }).locator("option:checked"),
    ).toHaveText("Alexandra the Champion");
    await expect(
      host.getByLabel("Player 2", { exact: true }).locator("option:checked"),
    ).toHaveText("Emmanuel the Challenger");
    await host.getByRole("button", { name: "Play Again", exact: true }).click();
    for (const page of [host, one, two]) {
      await expect(card(page)).toHaveAttribute("data-phase", "serve");
      await expect(page.getByTestId("pong-score-0")).toHaveText("0");
      await expect(
        page.getByRole("status", { name: "Match result" }),
      ).toHaveCount(0);
      await expect(page.getByTestId("pong-contact")).toHaveCount(0);
    }
  } finally {
    for (const context of contexts) await context.close();
  }
});
