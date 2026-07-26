# Security Policy

**English** | [简体中文](SECURITY.zh-CN.md)

## Supported versions

MirroDeck currently provides security fixes only for the latest stable release and the `main` branch. Users of older releases should upgrade first and verify whether the problem still exists.

## Reporting a vulnerability privately

Do not disclose an unpatched security issue through a public Issue, Discussion, or Pull Request. In the repository, open **Security → Advisories → Report a vulnerability** to create a GitHub Security Advisory and report the issue privately to the maintainers.

Include as much of the following as possible:

- Affected MirroDeck versions, operating systems, architectures, and package types
- Impact, reproduction steps, and minimal proof-of-concept code
- Relevant logs, screenshots, or crash information
- Possible mitigations or fixes, if known

Before submitting, remove device serial numbers, IP addresses, access tokens, signing keys, and other sensitive information. Maintainers will acknowledge the report and use the Advisory to coordinate validation, remediation, and disclosure. Keep the issue private until coordinated disclosure is complete.

If the issue originates in scrcpy, ADB, or another upstream component, reports describing its specific impact on MirroDeck are still welcome. Vulnerabilities in an upstream component itself should also be reported through that project's security process.

## Good-faith research

Test only devices and data that you own or are authorized to access. Do not perform destructive testing, invade privacy, or disrupt services. The project will make a reasonable effort to work with researchers who follow this policy and report issues in good faith.
