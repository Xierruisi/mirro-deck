# 贡献指南

**简体中文** | [English](CONTRIBUTING.md)

感谢你帮助改进 MirroDeck。代码、文档、测试、问题复现和平台兼容性反馈都很有价值。

## 提交 Issue

- Bug 请先搜索现有 Issue，避免重复报告。
- 提供 MirroDeck 版本、系统、架构、安装包、内置 scrcpy 版本和可复现步骤。
- 日志中请移除设备序列号、IP 地址及其他敏感信息。
- 功能建议请说明要解决的问题和预期使用场景，而不只是实现方式。
- 安全漏洞不要公开提交，请按照 [安全政策](SECURITY.zh-CN.md) 私下报告。

## 本地开发

需要 Node.js 24、Rust 1.97.0（由 `rust-toolchain.toml` 固定），以及当前系统所需的 Tauri 2 开发依赖。

```bash
npm ci
npm run tools:prepare
npm run tauri dev
```

`npm run tools:prepare` 会下载并校验当前平台固定版本的 scrcpy 工具链。交叉构建时可通过 `SCRCPY_TARGET` 指定仓库已支持的目标。

## 提交代码

1. 从最新的 `main` 分支创建功能分支。
2. 保持改动聚焦；不要在同一个 Pull Request 中混入无关重构。
3. 为行为变化补充或更新测试，并同步必要的文档。
4. 不要提交生成目录、下载的工具链、签名证书、密钥或设备信息。
5. 提交 Pull Request 前运行：

```bash
npm run check
```

如改动影响桌面打包，请额外执行：

```bash
npm run tauri build
```

## 翻译

`src/i18n/locales/en.json` 是基准英语资源，其他语言必须拥有相同的键和
`{{占位符}}`。新增或修改用户可见文案时：

1. 先在英语资源中增加含义清晰的键。
2. 同步更新其余 7 份语言资源。
3. React 中使用 `t()`，不要直接写文案；无障碍标签和原生对话框标题也不例外。
4. Rust 命令错误和会话消息使用结构化的 `backend.*` 键。
5. 执行 `npm run check:i18n` 和 `npm test`。

i18n 检查会拦截语言文件缺失或多余、翻译键缺失、占位符不一致、语言资源外的中文、
未知翻译键，以及常见的 JSX 或无障碍文案硬编码。

## Pull Request

请清楚说明改动目的、实现范围和验证结果，并关联相关 Issue。涉及界面变化时请附前后截图；涉及平台差异时请列出实际验证过的系统和架构。维护者可能要求缩小改动范围、补充测试或调整实现后再合并。

GitHub 默认加载英文 Pull Request 模板。需要中文模板时，请使用
[中文 Pull Request 模板](.github/PULL_REQUEST_TEMPLATE/pull_request_zh-CN.md)
并将内容复制到 Pull Request 描述中。

## 依赖与复制代码

- 不要引入许可证缺失或尚未审查的依赖。只有在核对具体依赖及其分发义务后，才能更新已批准许可证集合。
- 从其他项目复制或生成源代码时，必须保留版权与许可证声明，并将所需文本加入 `NOTICE`，同时更新中英文第三方组件声明。
- 修改依赖时运行 `npm run check:licenses`。GitHub 还会执行 npm、RustSec 和 Pull Request 依赖审查。

提交贡献即表示你同意按本项目的 Apache License 2.0 授权该贡献。
