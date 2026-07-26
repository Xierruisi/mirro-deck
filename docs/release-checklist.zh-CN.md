# 发布检查清单

**简体中文** | [English](release-checklist.md)

这份清单用于首次开源和后续正式版本发布。GitHub Actions 会完成构建，但不会替代签名证书配置、真机测试和许可证审查。

## 首次公开仓库前

- 确认仓库名称为 `xierruisi/mirro-deck`；若不同，修改 `package.json`、`Cargo.toml`、`README.md`、`src/config.ts` 和 `src-tauri/tauri.conf.json` 中的地址。
- 确认采用 Apache-2.0，并核对 `LICENSE` 中的版权名与年份。
- 在 GitHub **Settings → Code security and analysis** 中启用 Private vulnerability reporting，使 `SECURITY.md` 中的私下报告入口可用。
- 为 `main` 配置 ruleset 或分支保护，要求 CI 的 Ubuntu、Windows 和 macOS 检查通过。
- 将依赖安全检查设为必需，启用 dependency graph，并限制 GitHub Actions 仅引用完整提交 SHA。
- 检查 Actions 的 `GITHUB_TOKEN` 允许 Release job 申请 `contents: write`。
- 配置 Dependabot alerts 和 secret scanning；公开仓库可用时同时启用 push protection。
- 删除测试日志、设备序列号、IP、证书、密钥、本地环境文件和内部设计材料。

## 发布 Secrets

### 应用更新

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`（私钥无密码时可留空）

私钥必须与 `src-tauri/tauri.conf.json` 中的 updater 公钥匹配。没有该私钥时 workflow 会跳过 updater artifacts 和 `latest.json`，但仍构建普通安装包。

### macOS

- `APPLE_CERTIFICATE`
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY`
- `APPLE_ID`
- `APPLE_PASSWORD`
- `APPLE_TEAM_ID`

前三项用于 Developer ID 签名，后三项用于公证。正式对外发布应同时配置完整。

### Windows（可选但推荐）

- `WINDOWS_CERTIFICATE`
- `WINDOWS_CERTIFICATE_PASSWORD`

`WINDOWS_CERTIFICATE` 是 Authenticode `.pfx` 文件的 Base64 内容。未配置时 NSIS 安装包仍可构建，但更容易触发 SmartScreen。

## 每个版本

1. 更新以下三处为相同的语义化版本：
   - `package.json`
   - `src-tauri/Cargo.toml`
   - `src-tauri/tauri.conf.json`
2. 将中英文更新日志的 Unreleased 内容归档到新版本，并写入相同的 `YYYY-MM-DD` 发布日期。
3. 运行：

   ```bash
   npm ci
   npm run check
   npm run release:check-version -- vX.Y.Z
   ```

4. 至少在当前系统执行一次安装包构建和启动测试。
5. 创建并推送 `vX.Y.Z` tag，或手动运行 Release workflow 并输入同一 tag。
6. 等待五个构建任务全部通过：
   - macOS ARM64
   - macOS x86_64
   - Windows x86_64
   - Windows ARM64
   - Linux x86_64
7. Release 默认保持 Draft。下载产物后，在对应真实硬件上验证安装、启动、USB/Wi-Fi 连接、投屏、录屏、退出清理和应用更新。
8. 核对安装包中存在 MirroDeck 的 `LICENSE`、`NOTICE`、`THIRD_PARTY_NOTICES.md` 和内置 scrcpy 的许可证。
9. 为最终产物生成并保存 SHA-256 校验和、npm/Cargo 许可证报告与 SBOM。
10. 完成签名验证、公证验证和病毒扫描后，再手动发布 Draft Release。

## 当前架构限制

- Windows ARM64 应用为原生 ARM64，内置 scrcpy/ADB 仍是上游 x86_64 版本，通过 Windows on ARM 兼容层运行。
- Linux ARM64 暂不发布，因为 scrcpy 4.1 没有官方 ARM64 便携归档；不要用依赖目标系统预装组件的包冒充自包含 AppImage。
