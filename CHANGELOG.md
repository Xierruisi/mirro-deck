# Changelog

**English** | [简体中文](CHANGELOG.zh-CN.md)

Notable changes to MirroDeck are documented in this file. Versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.2] - 2026-08-03

### Changed

- Paired wireless devices now reconnect automatically through persistent ADB mDNS discovery, while manual connection remains available as a fallback.
- Updated frontend and Rust dependencies together with the pinned GitHub Actions used by CI and release workflows.
- Security checks now explicitly track unavoidable upstream Tauri GTK/WebKit advisories and skip dependency review only when the repository dependency graph is unavailable.

### Fixed

- Corrected Windows test-process stderr redirection so cross-platform session checks behave consistently.

## [0.1.1] - 2026-07-27

### Added

- Guided USB connection instructions in the add-device dialog.

### Changed

- Streamlined device setup with separate USB and wireless paths, a guided Wi-Fi pairing flow, and clearer connection feedback.
- Moved community health documents into the documentation directory and updated all related links and checks.

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

[Unreleased]: https://github.com/xierruisi/mirro-deck/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/xierruisi/mirro-deck/releases/tag/v0.1.2
[0.1.1]: https://github.com/xierruisi/mirro-deck/releases/tag/v0.1.1
[0.1.0]: https://github.com/xierruisi/mirro-deck/releases/tag/v0.1.0
