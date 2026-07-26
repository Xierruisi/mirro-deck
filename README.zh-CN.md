# MirroDeck

**简体中文** | [English](README.md)

<div align="center">
  <img src="src/assets/brand/mirrodeck-logo.svg" alt="MirroDeck" width="560" />

  <p><strong>无需记忆命令，也能轻松使用 scrcpy。</strong></p>
  <p>用于发现、连接和投屏 Android 设备的跨平台桌面客户端。</p>

  <p>
    <a href="https://github.com/xierruisi/mirro-deck/actions/workflows/ci.yml"><img src="https://github.com/xierruisi/mirro-deck/actions/workflows/ci.yml/badge.svg" alt="CI 状态" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="Apache-2.0 许可证" /></a>
    <img src="https://img.shields.io/badge/status-public%20preview-orange.svg" alt="公开预览版" />
    <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-6b7280.svg" alt="支持 macOS、Windows 和 Linux" />
  </p>

  <p>
    <a href="#功能特性">功能特性</a> ·
    <a href="#快速开始">快速开始</a> ·
    <a href="#本地开发">本地开发</a> ·
    <a href="docs/CONTRIBUTING.zh-CN.md">参与贡献</a>
  </p>
</div>

MirroDeck 是一个基于 Tauri 2 和 React 构建的 [scrcpy](https://github.com/Genymobile/scrcpy) 桌面客户端。它将设备发现、Android 11+ 无线配对、画质调节、录屏和多设备会话管理整合进一个图形界面。发布包内置固定版本的 scrcpy 工具链，并使用 SHA-256 校验每个下载文件。

> [!IMPORTANT]
> MirroDeck 目前是可运行的公开预览版 MVP。投屏内容会在 scrcpy 的独立原生窗口中打开，暂不支持嵌入 MirroDeck 主窗口。

## 功能特性

- **轻松连接** — 自动发现 USB、Wi-Fi 和模拟器设备，支持 Android 11+ 无线配对，并针对授权或 ADB 异常提供明确引导。
- **灵活调节** — 配置分辨率、帧率、码率、编码器、音频、控制、全屏、无边框、窗口置顶等 scrcpy 选项。
- **会话录制** — 将画面录制为 MP4 或 MKV，并自由选择保存位置。
- **管理多台设备** — 独立启动多个会话、查看运行日志，并在应用退出时自动清理子进程。
- **原生桌面体验** — 支持系统托盘、深浅主题、应用内更新和 8 种界面语言。
- **可复现构建** — 固定工具版本、校验文件哈希，并通过跨平台 CI 和自动化草稿 Release 完成构建。

USB、Wi-Fi 和模拟器的完整配置方法见[设备连接教程](docs/connection-guide.zh-CN.md)。

## 快速开始

### 下载安装

已发布的安装包可从 [GitHub Releases](https://github.com/xierruisi/mirro-deck/releases) 获取。如果暂时没有可用 Release，请参考[本地开发](#本地开发)运行当前源码。

| 操作系统 | 架构 | 安装包 | 内置 scrcpy |
|---|---|---|---|
| macOS | Apple Silicon / ARM64 | `.dmg` | 原生 ARM64 |
| macOS | Intel / x86_64 | `.dmg` | 原生 x86_64 |
| Windows | x86_64 | NSIS `.exe` | 原生 x86_64 |
| Windows 11 on ARM | ARM64（实验性） | NSIS `.exe` | x86_64，通过兼容层运行 |
| Linux | x86_64 | AppImage | 原生 x86_64 |

<details>
<summary>平台说明</summary>

- 未签名或未经公证的 macOS 构建可能触发 Gatekeeper 警告。
- 未签名的 Windows 构建可能触发 SmartScreen。安装器采用当前用户安装模式，并会在需要时下载 WebView2 bootstrapper。
- AppImage 首次启动前需要添加执行权限：`chmod +x MirroDeck_*.AppImage`。
- Windows ARM64 支持仍处于实验阶段，生产使用前应在真实设备上验证。
- 固定版本的 scrcpy 工具链没有提供 Linux ARM64 官方便携包，因此暂不发布该架构。

</details>

### 连接设备

1. 在 Android 设备上启用**开发者选项**和 **USB 调试**。
2. 打开 MirroDeck。
3. 通过 USB 连接，或选择**添加设备**进行无线配对与连接。
4. 选择设备、调整投屏选项，然后点击**开始投屏**。

首次授权建议使用 USB。无线调试的配对端口与连接端口通常不同，[设备连接教程](docs/connection-guide.zh-CN.md)包含完整的分步说明。

## 本地开发

### 环境要求

- [Node.js 24](https://nodejs.org/)
- Rust 1.97.0，由 [`rust-toolchain.toml`](rust-toolchain.toml) 自动选择
- 当前操作系统对应的 [Tauri 2 开发依赖](https://v2.tauri.app/start/prerequisites/)

### 启动项目

```bash
npm ci
npm run tauri dev
```

Tauri 开发命令会自动准备内置工具链。其底层命令 `npm run tools:prepare` 会读取 [`vendor/scrcpy.json`](vendor/scrcpy.json)，下载目标平台的压缩包、校验 SHA-256，并解压到已被 Git 忽略的资源目录。

### 检查与构建

```bash
# 执行文档、国际化、许可证、前端、Rust 和测试检查
npm run check

# 为当前平台构建安装包
npm run tauri build
```

<details>
<summary>为其他目标准备工具链</summary>

```bash
SCRCPY_TARGET=macos-x86_64 npm run tools:prepare
```

支持的值包括 `macos-aarch64`、`macos-x86_64`、`windows-x86_64`、`windows-aarch64` 和 `linux-x86_64`。Windows ARM64 目标使用上游 x86_64 scrcpy 工具链。

</details>

### 项目结构

```text
src/                         React 界面与类型安全的前端 API
src/i18n/                    语言识别、翻译资源与 i18n 运行时
src-tauri/src/adb.rs         设备发现、配对、连接与超时控制
src-tauri/src/session.rs     scrcpy 参数与进程生命周期
src-tauri/src/toolchain.rs   内置工具链定位与平台识别
scripts/                     文档、国际化、发布与工具链检查
vendor/scrcpy.json           固定版本的 scrcpy 包与 SHA-256
.github/workflows/           跨平台 CI 与发布自动化
```

前端没有通用 shell 权限。系统操作均通过 Rust 白名单命令执行，scrcpy 参数以独立参数数组传递，不会拼接成 shell 命令。

## 参与贡献

欢迎提交 Bug、平台测试结果、翻译、文档和代码。创建 Issue 或 Pull Request 前，请先阅读[贡献指南](docs/CONTRIBUTING.zh-CN.md)。

- 通过 [GitHub Issues](https://github.com/xierruisi/mirro-deck/issues) 报告问题或提出功能建议。
- 根据[安全策略](docs/SECURITY.zh-CN.md)私下报告安全漏洞。
- 遵守项目的[社区行为准则](docs/CODE_OF_CONDUCT.zh-CN.md)。
- 在[更新日志](CHANGELOG.zh-CN.md)中查看版本记录。
- 维护者可参考[发布检查清单](docs/release-checklist.zh-CN.md)。

## 致谢

MirroDeck 基于 [scrcpy](https://github.com/Genymobile/scrcpy) 和 [Tauri](https://github.com/tauri-apps/tauri) 构建。内置组件及其许可证见[第三方组件声明](THIRD_PARTY_NOTICES.zh-CN.md)。

## 许可证

MirroDeck 使用 [Apache License 2.0](LICENSE)。复制到仓库的代码所需署名保留在 [NOTICE](NOTICE) 中，scrcpy 与其他第三方组件仍受[第三方组件声明](THIRD_PARTY_NOTICES.zh-CN.md)所述各自许可证约束。
