import { mkdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import type {
  FullConfig,
  FullResult,
  Reporter,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";

export default class TimingReporter implements Reporter {
  private started = 0;
  private output = "";
  private tests: object[] = [];
  onBegin(config: FullConfig) {
    this.started = Date.now();
    this.output = process.env.QA_OUTPUT_DIR ?? config.projects[0].outputDir;
  }
  onTestEnd(test: TestCase, result: TestResult) {
    this.tests.push({
      title: test.titlePath().join(" / "),
      file: relative(process.cwd(), test.location.file),
      durationMs: result.duration,
      status: result.status,
      retry: result.retry,
      profiles: result.attachments
        .filter(
          (attachment) =>
            attachment.name === "breakout-profile" && attachment.body,
        )
        .map((attachment) => JSON.parse(attachment.body!.toString())),
    });
  }
  onEnd(result: FullResult) {
    mkdirSync(this.output, { recursive: true });
    writeFileSync(
      join(this.output, "browser-timing.json"),
      JSON.stringify(
        {
          platform: process.platform,
          status: result.status,
          durationMs: Date.now() - this.started,
          tests: this.tests,
        },
        null,
        2,
      ),
    );
  }
}
