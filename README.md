# MirroDeck

**English** | [简体中文](README.zh-CN.md)

<div align="center">
  <img src="src/assets/brand/mirrodeck-logo.svg" alt="MirroDeck" width="560" />

  <p><strong>Use scrcpy without memorizing terminal commands.</strong></p>
  <p>A cross-platform desktop client for discovering, connecting, and mirroring Android devices.</p>

  <p>
    <a href="https://github.com/xierruisi/mirro-deck/actions/workflows/ci.yml"><img src="https://github.com/xierruisi/mirro-deck/actions/workflows/ci.yml/badge.svg" alt="CI status" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="Apache-2.0 license" /></a>
    <img src="https://img.shields.io/badge/status-public%20preview-orange.svg" alt="Public preview" />
    <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-6b7280.svg" alt="macOS, Windows, and Linux" />
  </p>

  <p>
    <a href="#features">Features</a> ·
    <a href="#getting-started">Getting started</a> ·
    <a href="#development">Development</a> ·
    <a href="docs/CONTRIBUTING.md">Contributing</a>
  </p>
</div>

MirroDeck is a [scrcpy](https://github.com/Genymobile/scrcpy) desktop client built with Tauri 2 and React. It puts device discovery, Android 11+ wireless pairing, video tuning, recording, and multi-device session management into one graphical interface. Release packages bundle a pinned scrcpy toolchain and verify every downloaded archive with SHA-256.

> [!IMPORTANT]
> MirroDeck is currently a working public-preview MVP. Mirrored content opens in scrcpy's separate native window; embedding the display inside the MirroDeck window is not supported yet.

## Features

- **Connect easily** — discover USB, Wi-Fi, and emulator devices, pair wirelessly on Android 11+, and get actionable guidance for authorization or ADB errors.
- **Tune the stream** — choose resolution, frame rate, bit rate, codec, audio, control, fullscreen, borderless, always-on-top, and other scrcpy options.
- **Record sessions** — save MP4 or MKV recordings to a location you choose.
- **Manage multiple devices** — start independent sessions, inspect runtime logs, and clean up child processes automatically when the app exits.
- **Feel at home** — use the system tray, light or dark theme, in-app updates, and eight interface languages.
- **Ship reproducibly** — build with pinned tool versions, checksum verification, cross-platform CI, and automated draft releases.

For the full USB, Wi-Fi, and emulator setup, read the [device connection guide](docs/connection-guide.md).

## Getting started

### Download

Published builds are available on the [GitHub Releases](https://github.com/xierruisi/mirro-deck/releases) page. If no release is listed yet, follow [Development](#development) to run the current source tree.

| Operating system | Architecture | Package | Bundled scrcpy |
|---|---|---|---|
| macOS | Apple Silicon / ARM64 | `.dmg` | Native ARM64 |
| macOS | Intel / x86_64 | `.dmg` | Native x86_64 |
| Windows | x86_64 | NSIS `.exe` | Native x86_64 |
| Windows 11 on ARM | ARM64 (experimental) | NSIS `.exe` | x86_64 via the compatibility layer |
| Linux | x86_64 | AppImage | Native x86_64 |

<details>
<summary>Platform notes</summary>

- Unsigned or unnotarized macOS builds may trigger a Gatekeeper warning.
- Unsigned Windows builds may trigger SmartScreen. The installer uses a per-user installation and may download the WebView2 bootstrapper when needed.
- Make an AppImage executable before launching it: `chmod +x MirroDeck_*.AppImage`.
- Windows ARM64 support is experimental and should be validated on real hardware before production use.
- Linux ARM64 is not published because the pinned scrcpy toolchain does not provide an official portable archive for that target.

</details>

### Connect a device

1. Enable **Developer options** and **USB debugging** on the Android device.
2. Open MirroDeck.
3. Connect over USB, or choose **Add device** to pair and connect over Wi-Fi.
4. Select the device, adjust the mirroring options, and choose **Start mirroring**.

USB is the simplest option for first-time authorization. For wireless debugging, pairing and connecting normally use different ports; the [connection guide](docs/connection-guide.md) walks through both steps.

## Development

### Prerequisites

- [Node.js 24](https://nodejs.org/)
- Rust 1.97.0, selected by [`rust-toolchain.toml`](rust-toolchain.toml)
- The [Tauri 2 prerequisites](https://v2.tauri.app/start/prerequisites/) for your operating system

### Run locally

```bash
npm ci
npm run tauri dev
```

The Tauri development command prepares the bundled toolchain automatically. Under the hood, `npm run tools:prepare` reads [`vendor/scrcpy.json`](vendor/scrcpy.json), downloads the archive for the target platform, verifies its SHA-256 digest, and extracts it into the Git-ignored resources directory.

### Validate and build

```bash
# Run documentation, localization, license, frontend, Rust, and test checks
npm run check

# Build an installer for the current platform
npm run tauri build
```

<details>
<summary>Prepare a toolchain for another target</summary>

```bash
SCRCPY_TARGET=macos-x86_64 npm run tools:prepare
```

Supported values are `macos-aarch64`, `macos-x86_64`, `windows-x86_64`, `windows-aarch64`, and `linux-x86_64`. The Windows ARM64 target uses the upstream x86_64 scrcpy toolchain.

</details>

### Project layout

```text
src/                         React interface and type-safe frontend APIs
src/i18n/                    Locale detection, catalogs, and translation runtime
src-tauri/src/adb.rs         Device discovery, pairing, connection, and timeouts
src-tauri/src/session.rs     scrcpy arguments and process lifecycle
src-tauri/src/toolchain.rs   Bundled toolchain lookup and platform detection
scripts/                     Documentation, i18n, release, and toolchain checks
vendor/scrcpy.json           Pinned scrcpy archives and SHA-256 digests
.github/workflows/           Cross-platform CI and release automation
```

The frontend has no general-purpose shell permission. System operations go through allow-listed Rust commands, and scrcpy arguments are passed as an argument array instead of being concatenated into a shell command.

## Contributing

Bug reports, platform testing, translations, documentation, and code contributions are welcome. Please read [CONTRIBUTING.md](docs/CONTRIBUTING.md) before opening an Issue or Pull Request.

- Report bugs or request features through [GitHub Issues](https://github.com/xierruisi/mirro-deck/issues).
- Report vulnerabilities privately by following [SECURITY.md](docs/SECURITY.md).
- Follow the project [Code of Conduct](docs/CODE_OF_CONDUCT.md).
- See [CHANGELOG.md](CHANGELOG.md) for release history.
- Maintainers can follow the [release checklist](docs/release-checklist.md).

## Acknowledgements

MirroDeck is built on [scrcpy](https://github.com/Genymobile/scrcpy) and [Tauri](https://github.com/tauri-apps/tauri). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for bundled components and their licenses.

## License

MirroDeck is licensed under the [Apache License 2.0](LICENSE). Required copied-code attributions are retained in [NOTICE](NOTICE), and scrcpy and other third-party components remain subject to the terms described in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
