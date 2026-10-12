import { existsSync, mkdirSync, readdirSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const specs = (process.env.QA_BASELINE_SPECS ?? "").trim().split(/\s+/);
if (
  !specs.length ||
  specs.some(
    (spec) => !/^tests\/[a-z0-9-]+\.spec\.ts$/.test(spec) || !existsSync(spec),
  )
) {
  console.error(
    "Select explicit existing tests/*.spec.ts files; patterns and extra flags are not accepted.",
  );
  process.exit(1);
}
const result = spawnSync(
  process.execPath,
  [
    "scripts/run-checks.mjs",
    "browser",
    ...specs,
    process.env.QA_BASELINE_REFRESH === "true"
      ? "--update-snapshots=all"
      : "--update-snapshots=missing",
  ],
  { stdio: "inherit" },
);
if (result.status === 0) {
  for (const spec of specs) {
    const source = `${spec}-snapshots`;
    if (!existsSync(source)) continue;
    const target = `test-results/linux-baseline-evidence/${source}`;
    mkdirSync(target, { recursive: true });
    for (const file of readdirSync(source).filter((file) =>
      file.endsWith("-linux.png"),
    ))
      copyFileSync(`${source}/${file}`, `${target}/${file}`);
  }
}
process.exit(result.status ?? 1);
