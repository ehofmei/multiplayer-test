import { openMenu, closePanels, chooseGame, expectScreenFits } from "./ui";
import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

test("settings checks the current build and fails gracefully offline", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await page.evaluate(() =>
    navigator.serviceWorker.ready.then(() => undefined),
  );
  await openMenu(page);
  await expect(page.locator(".build-id")).toContainText(/Build \d{8}T\d{6}Z/);
  await page
    .getByRole("button", { name: "Check for updates", exact: true })
    .click();
  await expect(page.locator(".app-updates")).toContainText(
    "You’re up to date.",
  );
  await context.setOffline(true);
  await page
    .getByRole("button", { name: "Check for updates", exact: true })
    .click();
  await expect(page.locator(".app-updates")).toContainText(
    "Couldn’t check for updates.",
  );
  await closePanels(page);
  await page.getByRole("button", { name: "Create Game", exact: true }).click();
  await expect(page.getByRole("region", { name: "Game picker" })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 700 });
  await openMenu(page);
  await page.locator(".app-updates").scrollIntoViewIfNeeded();
  const bounds = await page
    .getByRole("button", { name: "Check for updates", exact: true })
    .boundingBox();
  expect(bounds!.height).toBeGreaterThanOrEqual(44);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  await page.screenshot({ path: "test-results/update-footer-phone.png" });
});

test("a cached new build waits for consent, cancel preserves play, updating reloads to the new build", async ({
  browser,
}) => {
  // Serve two versions on an isolated origin, with real SW install/cache/activation.
  let latest = false;
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url!, "http://localhost");
      const relative =
        url.pathname.replace(/^\/multiplayer-test\//, "") || "index.html";
      const path = resolve("dist", relative);
      if (!path.startsWith(resolve("dist") + "/"))
        throw new Error("Invalid path");
      let body = await readFile(path);
      if (
        latest &&
        /(?:index\.html|sw\.js|assets\/index-.*\.js)$/.test(relative)
      ) {
        let text = body.toString();
        if (relative === "index.html" || relative === "sw.js") {
          text = text.replace(/(assets\/index-[\w-]+\.js)/g, "$1?v=next");
          if (relative === "sw.js")
            text = text.replace(
              /("revision":")[a-f0-9]{32}/,
              "$1" + "f".repeat(32),
            );
        } else text = text.replace(/\d{8}T\d{6}Z/g, "20990101T000000Z");
        body = Buffer.from(text);
      }
      res.setHeader(
        "Content-Type",
        relative.endsWith(".js")
          ? "application/javascript"
          : relative.endsWith(".css")
            ? "text/css"
            : relative.endsWith(".html")
              ? "text/html"
              : "application/octet-stream",
      );
      res.setHeader("Cache-Control", "no-store");
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const port = (server.address() as { port: number }).port;
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${port}/multiplayer-test/`);
    await page.evaluate(() =>
      navigator.serviceWorker.ready.then(() => undefined),
    );
    await page.reload();
    const oldBuild = await page.locator(".build-id").textContent();
    await page
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    const other = await context.newPage();
    await other.goto(`http://127.0.0.1:${port}/multiplayer-test/`);
    await other
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    latest = true;
    await openMenu(page);
    await page
      .getByRole("button", { name: "Check for updates", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Update app", exact: true }),
    ).toBeVisible();
    await closePanels(page);
    await chooseGame(page, "Pong");
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.locator("aside.banner")).toBeHidden();
    await expect(page.getByRole("button", { name: /^Menu/ })).toContainText(
      "•",
    );
    await expectScreenFits(page);
    await openMenu(page);
    await expect(
      page.getByRole("button", { name: "Update app", exact: true }),
    ).toBeVisible();
    await closePanels(page);
    await page
      .getByRole("button", { name: "Choose Game", exact: true })
      .click();
    await page.setViewportSize({ width: 1280, height: 720 });
    await openMenu(page);
    await expect(
      page.getByRole("region", { name: "Game picker" }),
    ).toBeVisible();
    await expect(page.locator(".build-id")).toHaveText(oldBuild!);
    page.once("dialog", (dialog) => dialog.dismiss());
    await page.getByRole("button", { name: "Update app", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Game picker" }),
    ).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Update app", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Create Game", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".build-id")).toContainText("20990101T000000Z");
    await openMenu(page);
    await expect(
      page.getByRole("button", { name: "Check for updates", exact: true }),
    ).toBeVisible();
    // Activating in one tab must not force another active game to reload.
    await expect(
      other.getByRole("region", { name: "Game picker" }),
    ).toBeVisible();
    await expect(other.locator(".build-id")).toHaveText(oldBuild!);
    await openMenu(other);
    await expect(
      other.getByRole("button", { name: "Update app", exact: true }),
    ).toBeVisible();
    other.once("dialog", (dialog) => dialog.accept());
    await other
      .getByRole("button", { name: "Update app", exact: true })
      .click();
    await expect(other.locator(".build-id")).toContainText("20990101T000000Z");
  } finally {
    await context.close();
    await new Promise<void>((done, fail) =>
      server.close((error) => (error ? fail(error) : done())),
    );
  }
});
