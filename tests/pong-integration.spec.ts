import { join, chooseGame, closePanels, returnHome, showHelp } from "./ui";
import { expect, test } from "@playwright/test";
import { expectStableScreenshot } from "./screenshot";
import { monitorAudio, audioStarts } from "./audio";

test("host picks games, assigns two Pong players, spectators watch, and switching preserves connections", async ({
  browser,
  page: host,
}) => {
  await monitorAudio(host);
  const contexts = await Promise.all(
    [0, 1].map(() =>
      browser.newContext({ viewport: { width: 390, height: 844 } }),
    ),
  );
  try {
    const [emma, sam] = await Promise.all(contexts.map((c) => c.newPage()));
    await host.goto("./");
    await host.getByLabel("Your name").fill("Alex");
    await host
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    await expect(
      host.getByRole("region", { name: "Game picker" }),
    ).toBeVisible();
    await host.screenshot({ path: "test-results/game-picker-desktop.png" });
    await join(host, emma, "Emma");
    await join(host, sam, "Sam");
    await host.getByRole("button", { name: "Sound", exact: true }).click();
    await expect.poll(() => audioStarts(host)).toBeGreaterThan(0);
    const beforePong = await audioStarts(host);
    await emma.getByRole("button", { name: "More games", exact: true }).click();
    await expect(
      emma.getByRole("button", { name: "Pong", exact: true }),
    ).toBeDisabled();
    await chooseGame(host, "Pong");
    await expect(emma.getByRole("region", { name: "Pong game" })).toBeVisible();
    await expectStableScreenshot(
      host,
      ".pong-court",
      `pong-court-${process.platform}.png`,
    );
    // Text above the court must not change the shared baseline's geometry.
    const alternateFont = await host.addStyleTag({
      content: ":root { font-family: serif; line-height: 1.6; }",
    });
    await expectStableScreenshot(
      host,
      ".pong-court",
      `pong-court-${process.platform}.png`,
    );
    await alternateFont.evaluate((element) => element.remove());
    await host.getByLabel("Player 1").selectOption({ label: "Emma" });
    await host.getByLabel("Player 2").selectOption({ label: "Emma" });
    await expect(
      host.getByRole("button", { name: "Start Pong", exact: true }),
    ).toBeDisabled();
    await host.getByLabel("Player 2").selectOption({ label: "Sam" });
    await host.getByRole("button", { name: "Start Pong", exact: true }).click();
    await showHelp(host);
    await expect(
      host.getByText("You’re watching this match.", { exact: false }),
    ).toBeVisible();
    await closePanels(host);
    await expect(host.getByLabel("Your paddle")).toHaveCount(0);
    await expect(emma.getByLabel("Your paddle")).toBeEnabled();
    await expect(
      host.getByText("First to seven", { exact: true }),
    ).toBeVisible();
    await expect.poll(() => audioStarts(host)).toBeGreaterThan(beforePong);
    await showHelp(emma);
    await emma.getByLabel("Your paddle").press("End");
    await closePanels(emma);
    await expect
      .poll(async () =>
        Math.round(
          Number(await host.getByTestId("paddle-0").getAttribute("y")),
        ),
      )
      .toBe(494);
    await sam.getByRole("group", { name: "Pong court" }).press("ArrowRight");
    await expect
      .poll(async () =>
        Number(await host.getByTestId("paddle-1").getAttribute("y")),
      )
      .toBeLessThan(247);
    await host.getByRole("button", { name: "Pause Pong", exact: true }).click();
    await expect(emma.getByText("Match paused", { exact: true })).toBeVisible();
    await expect(emma.getByLabel("Your paddle")).toBeDisabled();
    const pausedPaddle = Math.round(
      (Number(await host.getByTestId("paddle-0").getAttribute("y")) / 650 +
        0.12) *
        100,
    );
    await expect(emma.getByLabel("Your paddle")).toHaveValue(
      String(pausedPaddle),
    );
    await emma.screenshot({ path: "test-results/pong-mobile.png" });
    await host
      .getByRole("button", { name: "Resume Pong", exact: true })
      .click();
    await expect(emma.getByLabel("Your paddle")).toBeEnabled();
    await returnHome(sam);
    await expect(
      host.getByText("A player left.", { exact: false }),
    ).toBeVisible();
    await expect(
      host.getByRole("button", { name: "Start Pong", exact: true }),
    ).toBeVisible();
    await host
      .getByRole("button", { name: "Choose Game", exact: true })
      .click();
    await chooseGame(host, "Reaction Race");
    await expect(
      emma.getByRole("region", { name: "Reaction Race game" }),
    ).toBeVisible();
    await host
      .getByRole("button", { name: "Choose Game", exact: true })
      .click();
    await chooseGame(host, "Shared Lights");
    await emma.getByRole("button", { name: "Cell 1", exact: true }).click();
    await expect(
      host.getByRole("button", { name: "Cell 1", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(emma.getByRole("status")).toHaveText("Connected to host");
    await expect(host.getByText("2/8", { exact: true })).toBeVisible();
  } finally {
    for (const context of contexts) await context.close();
  }
});
