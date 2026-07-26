# Third-party notices

**English** | [简体中文](THIRD_PARTY_NOTICES.zh-CN.md)

MirroDeck contains open-source dependencies and redistributes an unmodified official portable build of [Genymobile/scrcpy](https://github.com/Genymobile/scrcpy). Every component remains subject to its own license; the MirroDeck Apache-2.0 license does not replace those terms.

## Copied source components

### shadcn/ui

Files under `src/components/ui/` and `src/hooks/use-mobile.ts` include code generated from [shadcn/ui](https://github.com/shadcn-ui/ui), used under the MIT License. The required copyright and complete MIT License text are retained in [`NOTICE`](NOTICE) and included in application packages.

## Bundled scrcpy toolchain

The exact release archives, download URLs and SHA-256 digests are recorded in [`vendor/scrcpy.json`](vendor/scrcpy.json).

### scrcpy

- Copyright (C) 2018 Genymobile
- Copyright (C) 2018-2026 Romain Vimont
- License: Apache License 2.0
- Source: <https://github.com/Genymobile/scrcpy>

The complete Apache-2.0 text supplied by scrcpy is retained in every prepared toolchain directory as `LICENSE` or `LICENSE.txt` and is included in application packages.

### Components used by official portable builds

The contents vary by target. They may include or statically link:

| Component | Project | Common upstream license |
|---|---|---|
| Android Debug Bridge (`adb`) | [Android Open Source Project](https://android.googlesource.com/platform/packages/modules/adb/) | Apache-2.0 |
| SDL | [libsdl-org/SDL](https://github.com/libsdl-org/SDL) | Zlib |
| FFmpeg libraries | [FFmpeg](https://ffmpeg.org/) | LGPL-2.1-or-later; optional configurations may be GPL |
| libusb | [libusb/libusb](https://github.com/libusb/libusb) | LGPL-2.1-or-later |

This table is an attribution index, not a substitute for the license texts or a legal determination of a particular binary's configuration. Before each binary release, maintainers must inspect the exact pinned archives and preserve any notices, source offers or relinking materials required by those binaries.

The Windows ARM64 MirroDeck package currently carries the official Windows x64 scrcpy archive and runs it through Windows on ARM compatibility. It therefore has the same third-party contents as the Windows x64 package.

## Application dependencies

MirroDeck also includes code from the npm and Cargo dependency graphs recorded in `package-lock.json` and `src-tauri/Cargo.lock`. Notable projects include React, Radix UI, Tailwind CSS, Tauri and their transitive dependencies. Their license metadata is available in the installed package manifests and upstream repositories.

Release maintainers should generate and archive a dependency license report and a software bill of materials from both lockfiles. Any dependency whose license is missing, unknown or incompatible must block the release until reviewed.

## Release compliance checklist

- Verify all toolchain archive SHA-256 values against `vendor/scrcpy.json`.
- Confirm the archive contains the expected upstream `LICENSE`/`LICENSE.txt`.
- Confirm the package contains MirroDeck's `NOTICE`, including the shadcn/ui MIT License.
- Inventory native executables and dynamic libraries for every target.
- Generate npm and Cargo license reports from the committed lockfiles.
- Generate an SBOM for the final release artifacts.
- Attach notices, source offers and relinking materials where the applicable license requires them.
- Keep the resulting reports with the corresponding GitHub Release.

This notice is provided for compliance tracking and is not legal advice.
