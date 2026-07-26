# Contributing

**English** | [简体中文](CONTRIBUTING.zh-CN.md)

Thank you for helping improve MirroDeck. Code, documentation, tests, reproducible bug reports, and platform compatibility feedback are all valuable contributions.

## Filing an Issue

- Search existing Issues before reporting a bug to avoid duplicates.
- Include the MirroDeck version, operating system, architecture, package type, bundled scrcpy version, and reproducible steps.
- Remove device serial numbers, IP addresses, and other sensitive information from logs.
- For a feature request, describe the problem and expected use case rather than only an implementation.
- Do not file a public Issue for a security vulnerability. Follow the [security policy](SECURITY.md) to report it privately.

## Local development

You need Node.js 24, Rust 1.97.0 (pinned by `rust-toolchain.toml`), and the Tauri 2 development dependencies required by your operating system.

```bash
npm ci
npm run tools:prepare
npm run tauri dev
```

`npm run tools:prepare` downloads and verifies the pinned scrcpy toolchain for the current platform. Set `SCRCPY_TARGET` to one of the repository's supported targets when cross-building.

## Submitting code

Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/):

```text
<type>(<optional-scope>): <description>
```

Use one of `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`,
`revert`, `style`, or `test`. For example: `feat(device): add wireless pairing`.
After `npm ci`, the Git `commit-msg` hook checks new commits automatically.
To check the latest commit manually, run `npm run commitlint -- --last`.
Pull Request CI checks every commit in the branch.

1. Create a feature branch from the latest `main`.
2. Keep changes focused; do not include unrelated refactoring in the same Pull Request.
3. Add or update tests for behavior changes, and update the relevant documentation.
4. Do not commit generated directories, downloaded toolchains, signing certificates, keys, or device information.
5. Before opening a Pull Request, run:

```bash
npm run check
```

If the change affects desktop packaging, also run:

```bash
npm run tauri build
```

## Translations

English is the canonical catalog in `src/i18n/locales/en.json`. Every other
catalog must contain the same keys and `{{placeholders}}`. When adding or
changing user-visible text:

1. Add a descriptive key to the English catalog.
2. Update all seven other catalogs.
3. Use the `t()` helper instead of a literal in React, including accessibility
   labels and native-dialog titles.
4. Use structured `backend.*` keys for Rust command and session messages.
5. Run `npm run check:i18n` and `npm test`.

The i18n check rejects missing or extra catalogs, missing keys, mismatched
placeholders, Chinese text outside locale files, unknown translation keys, and
common hard-coded JSX or accessibility strings.

## Pull Requests

Clearly explain the goal, implementation scope, and validation results, and link the relevant Issue. Include before-and-after screenshots for interface changes. For platform-specific changes, list the operating systems and architectures you tested. Maintainers may ask you to narrow the scope, add tests, or revise the implementation before merging.

GitHub loads the English Pull Request template by default. A
[Chinese Pull Request template](../.github/PULL_REQUEST_TEMPLATE/pull_request_zh-CN.md)
is also available.

## Dependencies and copied code

- Do not add a dependency with a missing or unreviewed license. Update the approved license set only after reviewing the exact dependency and its distribution obligations.
- Preserve copyright and license notices when copying or generating source from another project. Add required text to `NOTICE` and document the component in both third-party notice files.
- For dependency changes, run `npm run check:licenses`. GitHub also performs npm, RustSec, and Pull Request dependency reviews.

By contributing, you agree to license your contribution under this project's Apache License 2.0.
