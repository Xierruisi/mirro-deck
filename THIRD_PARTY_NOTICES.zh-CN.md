# 第三方组件声明

**简体中文** | [English](THIRD_PARTY_NOTICES.md)

MirroDeck 包含开源依赖，并重新分发 [Genymobile/scrcpy](https://github.com/Genymobile/scrcpy) 未经修改的官方便携构建。每个组件仍受其各自许可证约束；MirroDeck 的 Apache-2.0 许可证不会取代这些条款。

## 复制到仓库的源代码组件

### shadcn/ui

`src/components/ui/` 与 `src/hooks/use-mobile.ts` 中的部分代码由 [shadcn/ui](https://github.com/shadcn-ui/ui) 生成，并按 MIT License 使用。所需版权声明和完整 MIT License 文本保留在 [`NOTICE`](NOTICE) 中，并会包含在应用安装包内。

## 内置 scrcpy 工具链

各发布归档、下载地址和 SHA-256 摘要完整记录在 [`vendor/scrcpy.json`](vendor/scrcpy.json) 中。

### scrcpy

- Copyright (C) 2018 Genymobile
- Copyright (C) 2018-2026 Romain Vimont
- 许可证：Apache License 2.0
- 源代码：<https://github.com/Genymobile/scrcpy>

scrcpy 随附的完整 Apache-2.0 许可证文本会以 `LICENSE` 或 `LICENSE.txt` 的形式保留在每个已准备的工具链目录中，并包含在应用安装包内。

### 官方便携构建使用的组件

具体内容因目标平台而异，可能包含或静态链接以下组件：

| 组件 | 项目 | 常见上游许可证 |
|---|---|---|
| Android Debug Bridge (`adb`) | [Android Open Source Project](https://android.googlesource.com/platform/packages/modules/adb/) | Apache-2.0 |
| SDL | [libsdl-org/SDL](https://github.com/libsdl-org/SDL) | Zlib |
| FFmpeg 库 | [FFmpeg](https://ffmpeg.org/) | LGPL-2.1-or-later；部分可选配置可能使用 GPL |
| libusb | [libusb/libusb](https://github.com/libusb/libusb) | LGPL-2.1-or-later |

本表仅作为署名索引，不能替代许可证全文，也不构成对某个特定二进制配置的法律判断。每次发布二进制文件前，维护者必须检查实际固定版本的归档，并保留这些二进制文件许可证要求的任何声明、源代码提供方式或重新链接材料。

Windows ARM64 版 MirroDeck 当前携带官方 Windows x64 scrcpy 归档，并通过 Windows on ARM 兼容层运行。因此，它与 Windows x64 安装包包含相同的第三方组件。

## 应用依赖

MirroDeck 还包含 `package-lock.json` 和 `src-tauri/Cargo.lock` 所记录的 npm 与 Cargo 依赖图中的代码。主要项目包括 React、Radix UI、Tailwind CSS、Tauri 及其传递依赖。它们的许可证元数据可在已安装的包清单和上游仓库中查看。

发布维护者应从两个锁文件生成并归档依赖许可证报告和软件物料清单（SBOM）。任何许可证缺失、未知或不兼容的依赖，都必须阻止发布，直到完成审查。

## 发布合规检查清单

- 根据 `vendor/scrcpy.json` 验证所有工具链归档的 SHA-256 值。
- 确认归档包含预期的上游 `LICENSE`/`LICENSE.txt`。
- 确认安装包包含 MirroDeck 的 `NOTICE`，其中保留 shadcn/ui 的 MIT License。
- 清点每个目标平台的原生可执行文件和动态库。
- 从已提交的锁文件生成 npm 和 Cargo 许可证报告。
- 为最终发布产物生成 SBOM。
- 在适用许可证要求时，附带声明、源代码提供方式和重新链接材料。
- 将生成的报告与对应 GitHub Release 一同保存。

本声明仅用于合规跟踪，不构成法律建议。
