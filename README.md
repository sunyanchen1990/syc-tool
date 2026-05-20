# SYC-TOOL — Mac 桌面效率工具箱

一款 macOS 桌面工具，集成天气、终端、计算器、便签、剪贴板历史、JSON 工具、翻译、系统监控、壁纸、幸运转盘、走四子儿与桌面悬浮球等能力。

官方网站：[github.com/sunyanchen1990/syc-tool-website](https://github.com/sunyanchen1990/syc-tool-website)

## 功能

| 模块 | 说明 |
|------|------|
| 天气 | 今天 + 未来三天，动态渐变与动画，支持城市搜索（Open-Meteo，免 API Key） |
| 计算器 | 四则运算、百分号、正负号 |
| 便签 | 多便签、自动保存到本地 |
| 剪贴板暂存 | 后台监听系统剪贴板，保留近 2 小时记录，可搜索、再次复制 |

## 环境要求

- macOS 11+
- [Node.js](https://nodejs.org/) 18 或更高

## 快速开始

```bash
git clone https://github.com/sunyanchen1990/syc-tool.git
cd syc-tool
npm install
npm run electron:dev
```

若报错 `Cannot read properties of undefined (reading 'whenReady')`，多半是环境变量 `ELECTRON_RUN_AS_NODE=1` 导致；本项目启动脚本已自动取消该变量。若在终端手动运行，请用：

```bash
env -u ELECTRON_RUN_AS_NODE npm run electron:dev
```

首次运行会打开 Vite 开发服务器和 Electron 窗口。天气功能需要联网。

## 安装方式

| 方式 | 说明 |
|------|------|
| **DMG** | 在 [Releases](https://github.com/sunyanchen1990/syc-tool/releases/latest) 下载 `SYC-TOOL-*-arm64.dmg`，拖入应用程序 |
| **Homebrew** | `brew tap sunyanchen1990/syc-tool && brew install --cask syc-tool` |

官网：https://sunyanchen1990.github.io/syc-tool-website/#download

开发者：`npm install && npm run electron:dev` · `npm run install:mac`（本地打包安装）

## 打包与发布

```bash
npm run pack
```

产物在 **`release/`**：`SYC-TOOL-{version}-arm64.dmg` / `.zip` / `mac-arm64/SYC-TOOL.app`。

推送版本标签后 GitHub Actions 会自动构建并上传到 Releases：

```bash
git tag v1.0.1 && git push origin v1.0.1
```

图标由 `npm run icons` 自动生成（1024×1024、毛玻璃低饱和风格、居中 SYC）。修改样式请编辑 `scripts/generate-icon.mjs` 后执行 `npm run install:mac`。

主界面默认背景为 `src/assets/background.jpg`（河谷风景）。内置壁纸在 `src/assets/wallpapers/`，首次启动会自动导入到本机壁纸库。

### 打包失败：`EOF` / 无法从 GitHub 下载 Electron

国内网络访问 GitHub 不稳定时会出现此错误。按顺序尝试：

1. **优先**（已配置，一般可直接成功）：
   ```bash
   npm run pack
   ```
   项目会使用 `npm install` 时已下载好的本机 Electron，不再访问 GitHub。

2. 若仍失败，使用国内镜像再打包：
   ```bash
   npm run pack:cn
   ```

3. 确保本机已有 Electron（若没有则先执行）：
   ```bash
   npm install
   ```

## 使用说明

1. **天气**：左侧点「天气」，可修改城市名后点「查询」，默认北京。
2. **计算器**：标准计算器操作，`AC` 清空。
3. **便签**：可新建多条，内容自动保存。
4. **剪贴板**：在系统任意处复制文字后，约 1 秒内会出现在「暂存」列表；仅保留 2 小时内记录。

## 技术栈

- Electron 33 + React 18 + TypeScript + Vite
- 天气： [Open-Meteo](https://open-meteo.com/)
- 数据：`~/Library/Application Support/desk-mini/desk-mini-data.json`

## 隐私说明

- 天气请求发往 Open-Meteo 公共 API。
- 便签与剪贴板记录仅保存在本机，不会上传。
