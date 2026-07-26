import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  findUnreviewedCargoSources,
  reviewNpmLicenses,
  verifyRequiredNotices,
} from "./check-third-party-lib.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");

try {
  const [
    packageLockSource,
    cargoLockSource,
    noticeSource,
    englishNoticesSource,
    chineseNoticesSource,
  ] = await Promise.all([
    readFile(join(projectRoot, "package-lock.json"), "utf8"),
    readFile(join(projectRoot, "src-tauri", "Cargo.lock"), "utf8"),
    readFile(join(projectRoot, "NOTICE"), "utf8"),
    readFile(join(projectRoot, "THIRD_PARTY_NOTICES.md"), "utf8"),
    readFile(join(projectRoot, "THIRD_PARTY_NOTICES.zh-CN.md"), "utf8"),
  ]);

  const npmReview = reviewNpmLicenses(JSON.parse(packageLockSource));
  const cargoSources = findUnreviewedCargoSources(cargoLockSource);
  if (cargoSources.length > 0) {
    throw new Error(
      `Cargo dependencies from sources requiring review:\n- ${cargoSources.join("\n- ")}`,
    );
  }
  verifyRequiredNotices({
    noticeSource,
    englishNoticesSource,
    chineseNoticesSource,
  });

  const summary = Object.entries(npmReview.licenses)
    .map(([license, count]) => `${license}=${count}`)
    .join(", ");
  console.log(
    `Third-party check passed: ${npmReview.packageCount} npm packages (${summary}), Cargo registry sources, and copied-code notices reviewed.`,
  );
} catch (error) {
  console.error(`Third-party check failed: ${error.message}`);
  process.exit(1);
}
