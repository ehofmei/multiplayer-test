import { join, chooseGame, closePanels, returnHome, showHelp } from "./ui";
import { expect, test } from "@playwright/test";

test("Arena Pong synchronizes four players, rotated controls, colors, pause and disconnect", async ({
  browser,
  page: host,
}) => {
  const contexts = await Promise.all(
    [0, 1, 2].map(() =>
      browser.newContext({ viewport: { width: 390, height: 844 } }),
    ),
  );
  try {
    const [emma, sam, lee] = await Promise.all(
      contexts.map((c) => c.newPage()),
    );
    await host.goto("./");
    await host.getByLabel("Your name").fill("Alex");
    await host
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    await join(host, emma, "Emma");
    await join(host, sam, "Sam");
    await join(host, lee, "Lee");
    await chooseGame(host, "Arena Pong");
    await expect(
      emma.getByRole("region", { name: "Arena Pong game" }),
    ).toBeVisible();
    await showHelp(emma);
    await emma
      .getByRole("button", { name: "Coral paddle", exact: true })
      .click();
    await closePanels(emma);
    await expect(
      host.getByRole("button", { name: "Start Arena Pong", exact: true }),
    ).toBeEnabled();
    await host
      .getByRole("button", { name: "Start Arena Pong", exact: true })
      .click();
    for (const page of [host, emma, sam, lee]) {
      await showHelp(page);
      await expect(
        page.getByText("Your paddle is at the bottom.", { exact: false }),
      ).toBeVisible();
      await closePanels(page);
      await expect(page.getByTestId("arena-lives-0")).toContainText("5 lives");
      await expect(page.getByTestId("arena-paddle-1")).toHaveAttribute(
        "fill",
        "#fda4af",
      );
    }
    for (const [page, rotation] of [
      [host, 0],
      [emma, 90],
      [sam, 180],
      [lee, 270],
    ] as const)
      await expect(page.locator(".arena-court svg > g")).toHaveAttribute(
        "transform",
        `rotate(${rotation} 500 500)`,
      );
    await emma
      .getByRole("group", { name: "Arena court", exact: true })
      .press("ArrowRight");
    await expect
      .poll(async () =>
        Number(await host.getByTestId("arena-paddle-1").getAttribute("y")),
      )
      .toBeLessThan(380);
    await host
      .getByRole("button", { name: "Pause Arena", exact: true })
      .click();
    await expect(emma.getByText("Arena paused", { exact: true })).toBeVisible();
    await expect(
      emma.getByLabel("Your paddle", { exact: true }),
    ).toBeDisabled();
    await host
      .getByRole("region", { name: "Arena Pong game" })
      .screenshot({ path: "test-results/arena-desktop.png" });
    await emma.setViewportSize({ width: 320, height: 700 });
    for (const font of ["system", "Arial", "Arial-tall"]) {
      if (font !== "system")
        await emma.addStyleTag({
          content: `:root { font-family: Arial, sans-serif; ${font === "Arial-tall" ? "line-height: 1.3;" : ""} }`,
        });
      await emma.keyboard.press("Control+Home");
      const courtBounds = await emma
        .getByRole("group", { name: "Arena court" })
        .boundingBox();
      expect(courtBounds!.y + courtBounds!.height).toBeLessThanOrEqual(700);
      expect(
        await emma.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(320);
      await emma.screenshot({
        path: `test-results/arena-phone-${font}.png`,
        fullPage: true,
      });
    }
    await host
      .getByRole("button", { name: "Resume Arena", exact: true })
      .click();
    await expect(emma.getByLabel("Your paddle", { exact: true })).toBeEnabled();
    await host
      .getByRole("button", { name: "Choose Game", exact: true })
      .click();
    await chooseGame(host, "Arena Pong");
    await host
      .getByRole("button", { name: "Players & lives", exact: true })
      .click();
    await host.getByLabel("Left player", { exact: true }).selectOption("");
    await host
      .getByLabel("Lives per player", { exact: true })
      .selectOption("3");
    await closePanels(host);
    await host
      .getByRole("button", { name: "Start Arena Pong", exact: true })
      .click();
    await expect(emma.getByTestId("arena-lives-0")).toContainText("3 lives");
    await expect(
      lee.getByLabel("Lives per player", { exact: true }),
    ).toHaveCount(0);
    await expect(emma.getByTestId("arena-paddle-3")).toHaveAttribute(
      "data-active",
      "false",
    );
    await expect(
      lee.getByText("You’re watching. The host picks the players.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(lee.getByLabel("Your paddle", { exact: true })).toHaveCount(0);
    await expect(
      emma.getByRole("button", {
        name: "Coral paddle",
        exact: true,
        includeHidden: true,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    await returnHome(emma);
    await expect(
      host.getByText("A player left. Choose players and start a new round.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      sam.getByRole("button", { name: "Start Arena Pong", exact: true }),
    ).toHaveCount(0);
    await emma.reload();
    await emma
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    await chooseGame(emma, "Pong");
    await expect(
      emma.getByRole("button", {
        name: "Coral paddle",
        exact: true,
        includeHidden: true,
      }),
    ).toHaveAttribute("aria-pressed", "true");
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
