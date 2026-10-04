import { expect, type Page } from "@playwright/test";

export async function closePanels(page: Page) {
  const panels = page.locator(".app-panel[open]");
  while (await panels.count())
    await panels
      .last()
      .getByRole("button", { name: "Close", exact: true })
      .click();
}
export async function openMenu(page: Page) {
  if (
    await page
      .getByRole("dialog", { name: "Room & settings", exact: true })
      .isVisible()
  )
    return;
  await closePanels(page);
  await page.getByRole("button", { name: /^Menu/ }).click();
}
export async function returnHome(page: Page) {
  await openMenu(page);
  await page.getByRole("button", { name: "Return Home", exact: true }).click();
}
export async function chooseGame(page: Page, name: string) {
  await closePanels(page);
  const choice = page.getByRole("button", { name, exact: true });
  if (!(await choice.count())) {
    const previous = page.getByRole("button", {
      name: "Previous games",
      exact: true,
    });
    while (await previous.isEnabled()) await previous.click();
    const more = page.getByRole("button", { name: "More games", exact: true });
    while (!(await choice.count()) && (await more.isEnabled()))
      await more.click();
  }
  await choice.click();
}
export async function transferText(page: Page, name: string) {
  const panel = page.getByRole("dialog", {
    name: "Connection text",
    exact: true,
  });
  if (!(await panel.isVisible()))
    await page
      .getByRole("button", { name: "Other ways to connect", exact: true })
      .click();
  const summary = panel.getByText(name, { exact: true });
  await summary.click();
}
export async function connectionDetails(page: Page) {
  await openMenu(page);
  await page.getByText("Connection details", { exact: false }).click();
}
export async function showHelp(page: Page) {
  if (
    await page
      .getByRole("dialog", { name: "Controls & help", exact: true })
      .isVisible()
  )
    return;
  await closePanels(page);
  await page
    .getByRole("button", { name: "Controls & help", exact: true })
    .click();
}
export async function expectScreenFits(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          Math.round(
            document.querySelector("main")!.getBoundingClientRect().height,
          ) - innerHeight,
      ),
    )
    .toBe(0);
  for (const fit of await page.locator(".surface-fit:visible").all()) {
    await expect
      .poll(async () => (await fit.boundingBox())?.width ?? 0)
      .toBeGreaterThan(100);
  }

  // Check the real content boxes, not just a body whose overflow is suppressed.
  const ship = page.locator(".ship-panels:visible");
  if (await ship.count()) {
    const order = (await page.locator(".ship-order").boundingBox())!;
    const legend = (await ship.locator("legend").first().boundingBox())!;
    expect(
      legend.y,
      "ship controls must not overlap the order",
    ).toBeGreaterThanOrEqual(order.y + order.height);
  }
  const metrics = await page.evaluate(() => {
    const selectors = [
      ".app-content",
      ".session-layout > section",
      ".pair-card",
      ".game-choices",
    ];
    return selectors.flatMap((selector) =>
      Array.from(document.querySelectorAll<HTMLElement>(selector)).map(
        (element) => ({
          selector,
          height: element.clientHeight,
          scrollHeight: element.scrollHeight,
          width: element.clientWidth,
          scrollWidth: element.scrollWidth,
          top: element.getBoundingClientRect().top,
          bottom: element.getBoundingClientRect().bottom,
          viewport: innerHeight,
        }),
      ),
    );
  });
  for (const metric of metrics) {
    expect(
      metric.scrollHeight,
      `${metric.selector} vertical overflow`,
    ).toBeLessThanOrEqual(metric.height + 1);
    expect(
      metric.scrollWidth,
      `${metric.selector} horizontal overflow`,
    ).toBeLessThanOrEqual(metric.width + 1);
    expect(metric.top).toBeGreaterThanOrEqual(0);
    expect(metric.bottom).toBeLessThanOrEqual(metric.viewport);
  }
}

export async function join(host: Page, client: Page, name: string) {
  await client.goto("./");
  await client.getByLabel("Your name").fill(name);
  await client.getByRole("button", { name: "Join Game", exact: true }).click();
  await addPlayer(host);
  await transferText(host, "Copy/paste instead");
  await transferText(host, "Paste connection text instead");
  await transferText(client, "Paste connection text instead");
  await expect(host.getByLabel("Invite text")).toBeVisible({ timeout: 20_000 });
  const offer = await host.getByLabel("Invite text").inputValue();
  const parsed = JSON.parse(offer);
  expect(parsed.description.sdp).toContain("a=candidate:");
  await client.getByLabel("Paste host invite code").fill(offer);
  await client
    .getByRole("button", { name: "Create Join Code", exact: true })
    .click();
  await expect(
    client.getByRole("img", { name: "Join QR code", exact: true }),
  ).toBeVisible({ timeout: 20_000 });
  await transferText(client, "Copy/paste instead");
  await expect(client.getByLabel("Join text")).toBeVisible({
    timeout: 20_000,
  });
  await host
    .getByLabel("Paste player join code")
    .fill(await client.getByLabel("Join text").inputValue());
  await host
    .getByRole("button", { name: "Connect Player", exact: true })
    .click();
  await expect(client.getByRole("status")).toHaveText("Connected to host", {
    timeout: 20_000,
  });
  await openMenu(host);
  await expect(
    host.locator(".people-card li").filter({ hasText: name }),
  ).toBeVisible();
  await closePanels(host);
  await closePanels(client);
}

export async function addPlayer(page: Page) {
  await closePanels(page);
  const primary = page.getByRole("button", { name: "Add Player", exact: true });
  if (await primary.count()) await primary.click();
  else {
    await openMenu(page);
    await page
      .getByRole("button", { name: "Invite Player", exact: true })
      .click();
  }
}
