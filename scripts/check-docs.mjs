import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const failures = [];
const documentPairs = [
  ["README.md", "README.zh-CN.md"],
  ["CHANGELOG.md", "CHANGELOG.zh-CN.md"],
  ["docs/CODE_OF_CONDUCT.md", "docs/CODE_OF_CONDUCT.zh-CN.md"],
  ["docs/CONTRIBUTING.md", "docs/CONTRIBUTING.zh-CN.md"],
  ["docs/SECURITY.md", "docs/SECURITY.zh-CN.md"],
  ["THIRD_PARTY_NOTICES.md", "THIRD_PARTY_NOTICES.zh-CN.md"],
  ["docs/connection-guide.md", "docs/connection-guide.zh-CN.md"],
  ["docs/release-checklist.md", "docs/release-checklist.zh-CN.md"],
];

for (const [englishPath, chinesePath] of documentPairs) {
  const englishFile = path.join(root, englishPath);
  const chineseFile = path.join(root, chinesePath);
  if (!fs.existsSync(englishFile)) failures.push(`Missing English document: ${englishPath}`);
  if (!fs.existsSync(chineseFile)) failures.push(`Missing Chinese document: ${chinesePath}`);
  if (!fs.existsSync(englishFile) || !fs.existsSync(chineseFile)) continue;

  const english = fs.readFileSync(englishFile, "utf8");
  const chinese = fs.readFileSync(chineseFile, "utf8");
  const chineseLink = path.basename(chinesePath);
  const englishLink = path.basename(englishPath);
  if (!english.includes(`[简体中文](${chineseLink})`)) {
    failures.push(`${englishPath} does not link to ${chineseLink}`);
  }
  if (!chinese.includes(`[English](${englishLink})`)) {
    failures.push(`${chinesePath} does not link to ${englishLink}`);
  }
}

const markdownFiles = walk(root)
  .filter((file) => file.endsWith(".md"))
  .filter((file) => !isGeneratedDirectory(file));
for (const file of markdownFiles) {
  const source = fs.readFileSync(file, "utf8");
  const targets = [
    ...[...source.matchAll(/!?\[[^\]]*]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g)].map(
      (match) => match[1],
    ),
    ...[...source.matchAll(/(?:href|src)=["']([^"']+)["']/g)].map(
      (match) => match[1],
    ),
  ];
  for (const target of targets) {
    if (/^(?:[a-z]+:|#)/i.test(target)) continue;
    const pathname = target.replace(/^<|>$/g, "").split("#", 1)[0];
    if (!pathname) continue;
    const resolved = path.resolve(path.dirname(file), decodeURIComponent(pathname));
    if (!fs.existsSync(resolved)) {
      failures.push(
        `${path.relative(root, file)} links to missing local target: ${target}`,
      );
    }
  }
}

const githubPairs = [
  [".github/ISSUE_TEMPLATE/bug_report.yml", ".github/ISSUE_TEMPLATE/bug_report_zh-CN.yml"],
  [".github/ISSUE_TEMPLATE/feature_request.yml", ".github/ISSUE_TEMPLATE/feature_request_zh-CN.yml"],
  [".github/pull_request_template.md", ".github/PULL_REQUEST_TEMPLATE/pull_request_zh-CN.md"],
];
for (const pair of githubPairs) {
  for (const file of pair) {
    if (!fs.existsSync(path.join(root, file))) {
      failures.push(`Missing GitHub template: ${file}`);
    }
  }
}

const defaultReadme = fs.readFileSync(path.join(root, "README.md"), "utf8");
if (!defaultReadme.startsWith("# MirroDeck\n\n**English**")) {
  failures.push("README.md must remain the English-default GitHub entry point");
}

if (failures.length) {
  process.stderr.write(`Documentation check failed:\n- ${failures.join("\n- ")}\n`);
  process.exit(1);
}

process.stdout.write(
  `Documentation check passed: ${documentPairs.length} bilingual pairs, ${markdownFiles.length} Markdown files, and GitHub template pairs verified.\n`,
);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory() && [".git", "dist", "node_modules", "target"].includes(entry.name)) {
      return [];
    }
    return entry.isDirectory() ? walk(target) : [target];
  });
}

function isGeneratedDirectory(file) {
  const relative = path.relative(root, file);
  return relative.startsWith(`src-tauri${path.sep}target${path.sep}`);
}
