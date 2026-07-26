import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const root = process.cwd();
const localeDirectory = path.join(root, "src", "i18n", "locales");
const expectedLocales = ["en", "zh-CN", "ru", "ko", "es", "fr", "de", "ja"];
const placeholderPattern = /\{\{\s*([\w.-]+)\s*\}\}/g;
const failures = [];

const catalogs = Object.fromEntries(
  expectedLocales.map((locale) => {
    const file = path.join(localeDirectory, `${locale}.json`);
    if (!fs.existsSync(file)) {
      failures.push(`Missing locale catalog: ${path.relative(root, file)}`);
      return [locale, {}];
    }
    try {
      return [locale, JSON.parse(fs.readFileSync(file, "utf8"))];
    } catch (error) {
      failures.push(`Invalid JSON in ${path.relative(root, file)}: ${error.message}`);
      return [locale, {}];
    }
  }),
);

const actualLocaleFiles = fs
  .readdirSync(localeDirectory)
  .filter((file) => file.endsWith(".json"))
  .map((file) => file.replace(/\.json$/, ""))
  .sort();
const expectedLocaleFiles = [...expectedLocales].sort();
if (actualLocaleFiles.join("\0") !== expectedLocaleFiles.join("\0")) {
  failures.push(
    `Locale set differs. Expected ${expectedLocaleFiles.join(", ")}; found ${actualLocaleFiles.join(", ")}`,
  );
}

const canonicalKeys = Object.keys(catalogs.en);
const canonicalKeySet = new Set(canonicalKeys);
for (const locale of expectedLocales) {
  const catalog = catalogs[locale];
  const keys = Object.keys(catalog);
  const missing = canonicalKeys.filter((key) => !(key in catalog));
  const extra = keys.filter((key) => !canonicalKeySet.has(key));
  if (missing.length) failures.push(`${locale}: missing keys: ${missing.join(", ")}`);
  if (extra.length) failures.push(`${locale}: extra keys: ${extra.join(", ")}`);

  for (const key of canonicalKeys) {
    const value = catalog[key];
    if (typeof value !== "string" || value.trim() === "") {
      failures.push(`${locale}: ${key} must be a non-empty string`);
      continue;
    }
    const expectedPlaceholders = placeholders(catalogs.en[key]);
    const actualPlaceholders = placeholders(value);
    if (expectedPlaceholders.join("\0") !== actualPlaceholders.join("\0")) {
      failures.push(
        `${locale}: ${key} placeholders differ; expected ${expectedPlaceholders.join(", ") || "(none)"}, found ${actualPlaceholders.join(", ") || "(none)"}`,
      );
    }
  }
}

const sourceFiles = walk(path.join(root, "src")).filter((file) =>
  /\.(?:ts|tsx)$/.test(file),
);
for (const file of sourceFiles) {
  const source = fs.readFileSync(file, "utf8");
  if (/[\p{Script=Han}]/u.test(source)) {
    failures.push(
      `${path.relative(root, file)} contains a Han-script literal outside locale catalogs`,
    );
  }

  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  scanNode(sourceFile, sourceFile, file);
}

const rustDirectory = path.join(root, "src-tauri", "src");
const rustFiles = walk(rustDirectory).filter((file) => file.endsWith(".rs"));
const backendKeys = new Set();
for (const file of rustFiles) {
  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(/"(backend\.[^"]+)"/g)) {
    backendKeys.add(match[1]);
    if (!canonicalKeySet.has(match[1])) {
      failures.push(`${path.relative(root, file)}: unknown backend translation key "${match[1]}"`);
    }
  }
  if (
    ["adb.rs", "commands.rs", "error.rs", "session.rs", "toolchain.rs"].includes(
      path.basename(file),
    ) &&
    /[\p{Script=Han}]/u.test(source)
  ) {
    failures.push(
      `${path.relative(root, file)} contains a Han-script literal outside the Rust locale table`,
    );
  }
}
for (const key of canonicalKeys.filter((key) => key.startsWith("backend."))) {
  if (!backendKeys.has(key)) {
    failures.push(`Backend translation key is not referenced by Rust: ${key}`);
  }
}

if (failures.length) {
  process.stderr.write(`i18n check failed:\n- ${failures.join("\n- ")}\n`);
  process.exit(1);
}

process.stdout.write(
  `i18n check passed: ${expectedLocales.length} locales, ${canonicalKeys.length} keys, placeholders and source literals verified.\n`,
);

function placeholders(value) {
  if (typeof value !== "string") return [];
  return [...value.matchAll(placeholderPattern)]
    .map((match) => match[1])
    .sort();
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

function scanNode(node, sourceFile, file) {
  if (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === "t" &&
    node.arguments.length > 0 &&
    ts.isStringLiteralLike(node.arguments[0])
  ) {
    const key = node.arguments[0].text;
    if (!canonicalKeySet.has(key)) {
      failures.push(`${location(sourceFile, file, node.arguments[0])}: unknown translation key "${key}"`);
    }
  }

  if (ts.isJsxText(node)) {
    const value = node.text.trim().replace(/\s+/g, " ");
    if (/[A-Za-z]/.test(value) && !isAllowedJsxLiteral(value)) {
      failures.push(`${location(sourceFile, file, node)}: hard-coded JSX text "${value}"`);
    }
  }

  if (
    ts.isJsxAttribute(node) &&
    node.initializer &&
    ts.isStringLiteral(node.initializer) &&
    ["aria-label", "description", "eyebrow", "hint", "label", "term", "title", "tooltip"].includes(
      node.name.getText(sourceFile),
    )
  ) {
    const value = node.initializer.text.trim();
    if (/[A-Za-z\p{L}]/u.test(value) && !isAllowedAttributeLiteral(value)) {
      failures.push(`${location(sourceFile, file, node)}: hard-coded visible attribute "${value}"`);
    }
  }

  ts.forEachChild(node, (child) => scanNode(child, sourceFile, file));
}

function isAllowedJsxLiteral(value) {
  return (
    /^(?:MirroDeck|Tauri 2|scrcpy 4\.1|v|Mbps)$/.test(value) ||
    /^(?:H\.26[45]|VP[89]|AV1)\s*·$/.test(value) ||
    /^\d+\s*(?:px|FPS)$/.test(value)
  );
}

function isAllowedAttributeLiteral(value) {
  return /^(?:MirroDeck|Tauri|Genymobile \/ scrcpy)$/.test(value);
}

function location(sourceFile, file, node) {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return `${path.relative(root, file)}:${line + 1}:${character + 1}`;
}
