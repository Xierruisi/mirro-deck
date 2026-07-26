# Changelog

**English** | [简体中文](CHANGELOG.zh-CN.md)

Notable changes to MirroDeck are documented in this file. Versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-07-26

### Added

- Native Windows ARM64 app builds; the bundled x64 scrcpy runs through the Windows on ARM compatibility layer.
- Pre-release version consistency checks and more comprehensive CI quality gates.
- Apache-2.0 licensing, contribution guidelines, a security policy, and GitHub Issue/PR templates.
- Copied-code attribution and automated third-party license metadata checks.
- VP8 and VP9 video codec options.

### Changed

- macOS releases now produce both DMG installers and updater artifacts.
- Device scanning now uses sequential polling and pauses while the app is hidden.
- Tightened Tauri frontend capability permissions.
- The release process now supports optional Windows Authenticode code signing.
- Local builds no longer require the private updater signing key.
- GitHub Actions are pinned to immutable commits and release validation runs the full quality and dependency-security gates.

[Unreleased]: https://github.com/xierruisi/mirro-deck/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/xierruisi/mirro-deck/releases/tag/v0.1.0
