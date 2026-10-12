import type { Page } from "@playwright/test";

export async function monitorAudio(page: Page) {
  await page.addInitScript(() => {
    const create = AudioContext.prototype.createOscillator;
    (window as unknown as { audioStarts: number }).audioStarts = 0;
    AudioContext.prototype.createOscillator = function () {
      (window as unknown as { audioStarts: number }).audioStarts++;
      return create.call(this);
    };
  });
}
export const audioStarts = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { audioStarts: number }).audioStarts,
  );
