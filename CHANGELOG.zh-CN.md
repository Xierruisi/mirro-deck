# Changelog

**简体中文** | [English](CHANGELOG.md)

MirroDeck 的重要变更会记录在此文件中。版本号遵循
[Semantic Versioning](https://semver.org/)。

## [Unreleased]

## [0.1.2] - 2026-08-03

### 变更

- 已配对的无线设备现在会通过 ADB 的持续 mDNS 发现自动重连，同时保留手动连接作为兜底。
- 更新前端与 Rust 依赖，以及 CI 和发布工作流使用的固定版本 GitHub Actions。
- 安全检查现在会显式跟踪 Tauri GTK/WebKit 上游暂时无法避免的 RustSec 公告；仅在仓库依赖图不可用时跳过依赖审查。

### 修复

- 修正 Windows 测试进程的标准错误重定向，使跨平台会话测试行为保持一致。

## [0.1.1] - 2026-07-27

### 新增

- 在添加设备对话框中加入 USB 连接引导。

### 变更

- 将设备设置简化为独立的 USB 与无线连接路径，并加入分步 Wi-Fi 配对流程和更清晰的连接反馈。
- 将社区健康文档整理至文档目录，并同步更新相关链接和检查。

## [0.1.0] - 2026-07-26

### Added

- Windows ARM64 原生应用构建；内置 x64 scrcpy 通过 Windows on ARM 兼容层运行。
- 发布前版本一致性检查和更完整的 CI 质量门禁。
- Apache-2.0 许可证、贡献指南、安全策略和 GitHub Issue/PR 模板。
- 复制代码署名与自动化第三方许可证元数据检查。
- VP8 与 VP9 视频编码选项。

### Changed

- macOS 发布同时生成 DMG 和应用更新包。
- 设备扫描改为串行轮询，并在应用隐藏时暂停。
- 收紧 Tauri 前端能力权限。
- 发布流程支持可选的 Windows Authenticode 代码签名。
- 本地构建不再需要私有的 updater 签名密钥。
- GitHub Actions 固定到不可变提交，发布校验会运行完整质量门和依赖安全检查。

[Unreleased]: https://github.com/xierruisi/mirro-deck/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/xierruisi/mirro-deck/releases/tag/v0.1.2
[0.1.1]: https://github.com/xierruisi/mirro-deck/releases/tag/v0.1.1
[0.1.0]: https://github.com/xierruisi/mirro-deck/releases/tag/v0.1.0
