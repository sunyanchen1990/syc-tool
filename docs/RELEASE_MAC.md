# macOS 发布说明（让普通用户双击即用）

未**签名 + 公证**的安装包，macOS 会提示「已损坏」。要真正做到用户**下载 → 拖入应用程序 → 打开**，必须在 GitHub Actions 配置 Apple 开发者证书。

## 一次性配置（Apple Developer Program）

1. 在 [Apple Developer](https://developer.apple.com) 创建 **Developer ID Application** 证书，导出 `.p12`
2. 在 GitHub 仓库 **Settings → Secrets** 添加：

| Secret | 说明 |
|--------|------|
| `MAC_CERT_P12_BASE64` | `base64 -i cert.p12 \| pbcopy` |
| `MAC_CERT_PASSWORD` | 导出 p12 时的密码 |
| `APPLE_ID` | Apple ID 邮箱 |
| `APPLE_APP_PASSWORD` | [App 专用密码](https://appleid.apple.com) |
| `APPLE_TEAM_ID` | 开发者团队 ID |

3. 打 tag 发布：`git tag v1.0.3 && git push origin v1.0.3`

CI 会自动签名、公证并上传 DMG/ZIP。公证通过后，用户**无需**终端或修复命令。

## 本地快速发版（无公证）

```bash
npm run release:local
```

适用于内测；普通用户请使用已公证的 GitHub Release。
