import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyReleaseVersionFiles } from "./check-release-version-lib.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const rawTag = process.argv[2];

try {
  const { expectedVersion, releaseDate } = await verifyReleaseVersionFiles({
    projectRoot,
    rawTag,
  });
  console.log(
    `Release version ${expectedVersion} matches ${rawTag} in all manifests and both changelogs are dated ${releaseDate}.`,
  );
} catch (error) {
  fail(error.message);
}

function fail(message) {
  console.error(`Release version check failed: ${message}`);
  process.exit(1);
}
