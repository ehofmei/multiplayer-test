import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export async function missingScreenshotBaselines(testsDirectory) {
  const missing = [];
  const directories = await readdir(testsDirectory, { withFileTypes: true });
  for (const directory of directories) {
    if (!directory.isDirectory() || !directory.name.endsWith("-snapshots")) {
      continue;
    }
    const path = join(testsDirectory, directory.name);
    const files = new Set(await readdir(path));
    for (const file of files) {
      const match = file.match(/^(.*)-(darwin|linux)\.png$/);
      if (!match) continue;
      const otherPlatform = match[2] === "darwin" ? "linux" : "darwin";
      const counterpart = `${match[1]}-${otherPlatform}.png`;
      if (!files.has(counterpart)) missing.push(join(path, counterpart));
    }
  }
  return missing.sort();
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const missing = await missingScreenshotBaselines("tests");
  if (missing.length) {
    console.error(
      "Missing platform screenshot baselines:\n" + missing.join("\n"),
    );
    console.error(
      "Generate and review genuine renders on the corresponding OS. Follow QA.md; do not copy another platform's images.",
    );
    process.exitCode = 1;
  } else {
    console.log(
      "Every platform screenshot baseline has its Darwin/Linux pair.",
    );
  }
}
