import { expect, test, type Page } from "@playwright/test";

async function join(host: Page, client: Page, name: string) {
  await client.goto("./");
  await client.getByLabel("Your name").fill(name);
  await client.getByRole("button", { name: "Join Game", exact: true }).click();
  await host.getByRole("button", { name: "Add Player", exact: true }).click();
  await expect(host.getByLabel("Offer text")).toBeVisible({ timeout: 20_000 });
  const offer = await host.getByLabel("Offer text").inputValue();
  const parsed = JSON.parse(offer);
  expect(parsed.description.sdp).toContain("a=candidate:");
  await client.getByLabel("Paste host offer").fill(offer);
  await client
    .getByRole("button", { name: "Create Answer", exact: true })
    .click();
  await expect(client.getByLabel("Answer text")).toBeVisible({
    timeout: 20_000,
  });
  await host
    .getByLabel("Paste client answer")
    .fill(await client.getByLabel("Answer text").inputValue());
  await host
    .getByRole("button", { name: "Connect Player", exact: true })
    .click();
  await expect(client.getByRole("status")).toHaveText("Connected to host", {
    timeout: 20_000,
  });
  await expect(
    host.locator(".people-card li").filter({ hasText: name }),
  ).toBeVisible();
}

test("host and three clients pair, synchronize concurrent taps, and disconnect cleanly", async ({
  browser,
  page: host,
}) => {
  test.setTimeout(120_000);
  await host.goto("./");
  await host.getByLabel("Your name").fill("Alex");
  await host.getByRole("button", { name: "Create Game", exact: true }).click();
  const contexts = await Promise.all([0, 1, 2].map(() => browser.newContext()));
  const clients = await Promise.all(contexts.map((c) => c.newPage()));
  for (const [i, client] of clients.entries())
    await join(host, client, ["Emma", "Chris", "Sam"][i]);
  await expect(host.getByText("4/8", { exact: true })).toBeVisible();
  await host.screenshot({ path: "test-results/connected-host.png" });
  await Promise.all([
    host.getByRole("button", { name: "Cell 1", exact: true }).click(),
    clients[0].getByRole("button", { name: "Cell 2", exact: true }).click(),
    clients[1].getByRole("button", { name: "Cell 3", exact: true }).click(),
    clients[2].getByRole("button", { name: "Cell 4", exact: true }).click(),
  ]);
  for (const p of [host, ...clients]) {
    await expect(p.getByText("Revision 4", { exact: true })).toBeVisible();
    for (let i = 1; i <= 4; i++)
      await expect(
        p.getByRole("button", { name: "Cell " + i, exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
  }
  for (let i = 0; i < 20; i++)
    await clients[0]
      .getByRole("button", { name: "Cell 7", exact: true })
      .click();
  for (const p of [host, ...clients]) {
    await expect(p.getByText("Revision 24", { exact: true })).toBeVisible();
    await expect(
      p.getByRole("button", { name: "Cell 7", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
  }
  await host.getByText("Connection details", { exact: false }).click();
  await expect(host.getByText("open", { exact: true })).toHaveCount(3);
  await host
    .locator(".debug")
    .screenshot({ path: "test-results/connected-details.png" });
  await expect(
    host.getByRole("region", { name: "Shared grid" }).locator(".grid"),
  ).toHaveScreenshot("shared-grid.png", { maxDiffPixelRatio: 0.03 });
  await clients[2]
    .getByRole("button", { name: "Return Home", exact: true })
    .click();
  await expect(host.getByText("3/8", { exact: true })).toBeVisible();
  await host.getByRole("button", { name: "Cell 16", exact: true }).click();
  await expect(
    clients[0].getByRole("button", { name: "Cell 16", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await join(host, clients[2], "Sam");
  await expect(
    clients[2].getByText("Revision 25", { exact: true }),
  ).toBeVisible();
  await host.getByRole("button", { name: "Return Home", exact: true }).click();
  for (const p of clients) {
    await expect(p.getByRole("status")).toHaveText("Host disconnected");
    await expect(
      p.getByRole("button", { name: "Cell 1", exact: true }),
    ).toBeDisabled();
  }
  await clients[0].screenshot({ path: "test-results/disconnected-client.png" });
  for (const c of contexts) await c.close();
});

test("mobile controls, keyboard, invalid input, cancellation and persistent identity", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await page.getByLabel("Your name").fill("Family Player");
  await page.reload();
  await expect(page.getByLabel("Your name")).toHaveValue("Family Player");
  await page.getByRole("button", { name: "Join Game", exact: true }).click();
  await page.getByLabel("Paste host offer").fill("not an offer");
  await page
    .getByRole("button", { name: "Create Answer", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Invalid connection text",
  );
  await page.getByRole("button", { name: "Return Home", exact: true }).click();
  await page.getByRole("button", { name: "Create Game", exact: true }).click();
  await page.getByRole("button", { name: "Cell 1", exact: true }).focus();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", { name: "Cell 1", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const metrics = await page.evaluate(() => ({
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    gridBottom: document.querySelector(".grid")!.getBoundingClientRect().bottom,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width);
  expect(metrics.gridBottom).toBeLessThan(844);
  await page.screenshot({ path: "test-results/mobile-host.png" });
  await page.getByRole("button", { name: "Add Player", exact: true }).click();
  await expect(page.getByLabel("Offer text")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Paste client answer").fill("{}");
  await page
    .getByRole("button", { name: "Connect Player", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("valid version 1 answer");
  await page
    .getByRole("button", { name: "Cancel Invite", exact: true })
    .click();
  await expect(page.getByLabel("Offer text")).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("production subpath manifest, cache, offline startup and identity survive reload", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await page.getByLabel("Your name").fill("Offline Alex");
  const manifestURL = await page
    .locator("link[rel=manifest]")
    .getAttribute("href");
  expect(manifestURL).toContain("/multiplayer-test/");
  const response = await page.request.get(manifestURL!);
  const manifest = await response.json();
  expect(manifest.display).toBe("standalone");
  for (const icon of manifest.icons)
    expect(
      (await page.request.get(new URL(icon.src, response.url()).href)).ok(),
    ).toBe(true);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByLabel("Your name")).toHaveValue("Offline Alex");
  await page.getByRole("button", { name: "Create Game", exact: true }).click();
  await page.getByRole("button", { name: "Cell 5", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Cell 5", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await context.setOffline(false);
});

test("the complete board fits desktop, tablet and narrow phone viewports", async ({
  page,
}) => {
  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 1280, height: 720 },
    { width: 768, height: 1024 },
    { width: 320, height: 700 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("./");
    await page
      .getByRole("button", { name: "Create Game", exact: true })
      .click();
    const bounds = await page.locator(".board-card").boundingBox();
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(viewport.width);
    await page.getByRole("button", { name: "Cell 1", exact: true }).click();
    await page.screenshot({
      path: `test-results/host-${viewport.width}x${viewport.height}.png`,
    });
  }
});
