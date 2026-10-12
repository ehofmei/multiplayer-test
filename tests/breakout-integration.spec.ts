import { join, chooseGame, returnHome } from "./ui";
import { expect, test } from "@playwright/test";
import { expectStableScreenshot } from "./screenshot";

test("Co-op Breakout pairs teammates, rotates controls, pauses and handles spectators and disconnects", async ({
  browser,
  page: host,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  try {
    const client = await context.newPage();
    await host.goto("./");
    await host.getByLabel("Your name").fill("Alex");
    await host
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    await join(host, client, "Emma");
    await chooseGame(host, "Co-op Breakout");
    await expect(
      client.getByRole("region", { name: "Co-op Breakout game" }),
    ).toBeVisible();
    await expect(
      client.getByRole("button", { name: "Start Co-op Breakout", exact: true }),
    ).toHaveCount(0);
    await expectStableScreenshot(
      host,
      ".arena-court",
      `breakout-court-${process.platform}.png`,
    );
    // Reject duplicate assignments, and allow solo practice with spectators.
    await host
      .getByLabel("Right player", { exact: true })
      .selectOption(
        await host.getByLabel("Bottom player", { exact: true }).inputValue(),
      );
    await expect(
      host.getByRole("button", { name: "Start Co-op Breakout", exact: true }),
    ).toBeDisabled();
    await host.getByLabel("Right player", { exact: true }).selectOption("");
    await host
      .getByRole("button", { name: "Start Co-op Breakout", exact: true })
      .click();
    await expect(
      client.getByText("You’re watching. The host picks the players.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(client.getByLabel("Your paddle", { exact: true })).toHaveCount(
      0,
    );
    await host
      .getByRole("button", { name: "Choose Game", exact: true })
      .click();
    await chooseGame(host, "Co-op Breakout");
    await host
      .getByRole("button", { name: "Start Co-op Breakout", exact: true })
      .click();
    await expect(client.locator(".arena-court svg > g")).toHaveAttribute(
      "transform",
      "rotate(90 500 500)",
    );
    await expect(client.getByLabel("Team progress")).toContainText(
      "5 shared lives",
    );
    await expect(client.getByTestId("arena-paddle-2")).toHaveAttribute(
      "data-active",
      "false",
    );
    await client
      .getByRole("group", { name: "Breakout court", exact: true })
      .press("ArrowRight");
    await expect
      .poll(async () =>
        Number(await host.getByTestId("arena-paddle-1").getAttribute("y")),
      )
      .toBeLessThan(380);
    await host
      .getByRole("button", { name: "Pause Breakout", exact: true })
      .click();
    await expect(
      client.getByText("Co-op Breakout paused", { exact: true }),
    ).toBeVisible();
    await expect(
      client.getByLabel("Your paddle", { exact: true }),
    ).toBeDisabled();
    await host.screenshot({
      path: "test-results/breakout-desktop.png",
      fullPage: true,
    });
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
                content: ":root {font-family:Arial,sans-serif;line-height:1.3}",
              });
        await client.keyboard.press("Control+Home");
        const bounds = await client
          .getByRole("group", { name: "Breakout court" })
          .boundingBox();
        expect(bounds!.y + bounds!.height).toBeLessThan(viewport.height - 16);
        expect(
          await client.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(viewport.width);
        await client.screenshot({
          path: `test-results/breakout-${viewport.width}-${font}.png`,
          fullPage: true,
        });
        await style?.evaluate((el) => el.remove());
      }
    }
    await host
      .getByRole("button", { name: "Resume Breakout", exact: true })
      .click();
    await expect(
      client.getByLabel("Your paddle", { exact: true }),
    ).toBeEnabled();
    // A real touch drag sends the canonical (rotated) position to the host.
    await client.setViewportSize({ width: 390, height: 844 });
    await client
      .getByRole("group", { name: "Breakout court" })
      .tap({ position: { x: 40, y: 80 } });
    await expect
      .poll(async () =>
        Number(await host.getByTestId("arena-paddle-1").getAttribute("y")),
      )
      .toBeGreaterThan(550);
    await returnHome(client);
    await expect(
      host.getByText("A player left. Choose players and start a new round.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      host.getByRole("button", { name: "Start Co-op Breakout", exact: true }),
    ).toBeEnabled();
    await host
      .getByRole("button", { name: "Start Co-op Breakout", exact: true })
      .click();
    await expect(host.getByLabel("Team progress")).toContainText(
      "5 shared lives",
    );
  } finally {
    await context.close();
  }
});

test("four Breakout teammates fit narrow phones with long names and taller fonts", async ({
  browser,
  page: host,
}) => {
  const contexts = await Promise.all([0, 1, 2].map(() => browser.newContext()));
  try {
    const clients = await Promise.all(contexts.map((c) => c.newPage()));
    await host.goto("./");
    await host
      .getByLabel("Your name")
      .fill("Alex with a very long family name");
    await host
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    for (const [i, client] of clients.entries())
      await join(host, client, ["Emma", "Sam", "Lee"][i]);
    await chooseGame(host, "Co-op Breakout");
    await host
      .getByRole("button", { name: "Start Co-op Breakout", exact: true })
      .click();
    for (const [i, client] of clients.entries()) {
      await expect(client.locator(".arena-court svg > g")).toHaveAttribute(
        "transform",
        `rotate(${(i + 1) * 90} 500 500)`,
      );
      await expect(
        client.getByLabel("Your paddle", { exact: true }),
      ).toBeEnabled();
    }
    await host
      .getByRole("button", { name: "Pause Breakout", exact: true })
      .click();
    await host.setViewportSize({ width: 320, height: 700 });
    await host.addStyleTag({
      content: ":root {font-family:Arial,sans-serif;line-height:1.3}",
    });
    await host.keyboard.press("Control+Home");
    const court = await host
      .getByRole("group", { name: "Breakout court" })
      .boundingBox();
    expect(court!.y + court!.height).toBeLessThan(684);
    expect(
      await host.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(320);
    await host.screenshot({
      path: "test-results/breakout-four-phone.png",
      fullPage: true,
    });
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
