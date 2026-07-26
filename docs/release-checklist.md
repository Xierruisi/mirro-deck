# Release checklist

**English** | [简体中文](release-checklist.zh-CN.md)

Use this checklist for the first open-source publication and every production release. GitHub Actions performs the builds, but it does not replace signing-certificate setup, testing on physical devices, or license review.

## Before making the repository public

- Confirm that the repository is named `xierruisi/mirro-deck`. If it is different, update the URLs in `package.json`, `Cargo.toml`, `README.md`, `src/config.ts`, and `src-tauri/tauri.conf.json`.
- Confirm the Apache-2.0 license and verify the copyright name and year in `LICENSE`.
- In GitHub **Settings → Code security and analysis**, enable Private vulnerability reporting so the private reporting path described in `SECURITY.md` is available.
- Configure a ruleset or branch protection for `main` that requires the Ubuntu, Windows, and macOS CI checks to pass.
- Require the dependency-security checks, enable the dependency graph, and keep GitHub Actions restricted to full-length commit SHA references.
- Confirm that the Actions `GITHUB_TOKEN` allows the Release job to request `contents: write`.
- Enable Dependabot alerts and secret scanning, and enable push protection when it is available for the public repository.
- Remove test logs, device serial numbers, IP addresses, certificates, keys, local environment files, and internal design materials.

## Release secrets

### Application updates

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (may be empty if the private key is unencrypted)

The private key must match the updater public key in `src-tauri/tauri.conf.json`. Without it, the workflow skips updater artifacts and `latest.json` but still builds ordinary installers.

### macOS

- `APPLE_CERTIFICATE`
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY`
- `APPLE_ID`
- `APPLE_PASSWORD`
- `APPLE_TEAM_ID`

The first three values configure Developer ID signing. The last three configure notarization. A production release should configure all six.

### Windows (optional but recommended)

- `WINDOWS_CERTIFICATE`
- `WINDOWS_CERTIFICATE_PASSWORD`

`WINDOWS_CERTIFICATE` contains the Base64-encoded Authenticode `.pfx` file. The NSIS installer still builds without it, but unsigned packages are more likely to trigger SmartScreen.

## Every release

1. Set the same semantic version in all three files:
   - `package.json`
   - `src-tauri/Cargo.toml`
   - `src-tauri/tauri.conf.json`
2. Move the entries under Unreleased in both changelogs into the new version and add the same `YYYY-MM-DD` release date.
3. Run:

   ```bash
   npm ci
   npm run check
   npm run release:check-version -- vX.Y.Z
   ```

4. Build an installer and test its installation and launch at least once on the current operating system.
5. Create and push a `vX.Y.Z` tag, or manually run the Release workflow with the same tag.
6. Wait for all five build jobs to pass:
   - macOS ARM64
   - macOS x86_64
   - Windows x86_64
   - Windows ARM64
   - Linux x86_64
7. The Release remains a Draft by default. Download its artifacts and, on the corresponding physical hardware, test installation, launch, USB and Wi-Fi connections, mirroring, recording, exit cleanup, and application updates.
8. Confirm that the packages contain MirroDeck's `LICENSE`, `NOTICE`, `THIRD_PARTY_NOTICES.md`, and the bundled scrcpy license.
9. Generate and retain SHA-256 checksums, npm/Cargo license reports, and an SBOM for the final artifacts.
10. Complete signature verification, notarization verification, and malware scanning before manually publishing the Draft Release.

## Current architecture limitations

- The Windows ARM64 app is native ARM64, but its bundled scrcpy and ADB binaries remain the upstream x86_64 builds and run through the Windows on ARM compatibility layer.
- Linux ARM64 is not published because scrcpy 4.1 has no official portable ARM64 archive. Do not present a package that depends on components preinstalled on the target system as a self-contained AppImage.
