#!/usr/bin/env bash
# 本地打包并发布到 GitHub Releases（无需等待 CI）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERSION="${1:-$(node -p "require('./package.json').version")}"
TAG="v${VERSION}"
REPO="${GITHUB_REPO:-sunyanchen1990/syc-tool}"

export PATH="/opt/homebrew/bin:$PATH:${PATH}"

echo "→ 版本 ${TAG}"

if [[ -f build/icon.icns ]]; then
  echo "→ 使用已有图标，跳过 npm run icons"
else
  echo "→ 生成图标…"
  npm run icons
fi

PREPACK="release/mac-arm64/SYC-TOOL.app"
chmod +x "build/双击安装 SYC-TOOL.command" "build/安装 SYC-TOOL.command" scripts/codesign-adhoc.sh 2>/dev/null || true

if [[ -d "$PREPACK" ]]; then
  bash scripts/codesign-adhoc.sh "$PREPACK"
  echo "→ 已有 ${PREPACK}，仅生成 DMG/ZIP（跳过编译）…"
  npx electron-builder --mac --arm64 --publish never --prepackaged "$PREPACK"
else
  echo "→ 编译并打包 macOS（arm64）…"
  npm run build:electron
  npx electron-builder --mac --arm64 --publish never
  [[ -d "$PREPACK" ]] && bash scripts/codesign-adhoc.sh "$PREPACK"
fi

DMG=(release/SYC-TOOL-"${VERSION}"-arm64.dmg)
ZIP=(release/SYC-TOOL-"${VERSION}"-arm64-mac.zip)
[[ -f "${DMG[0]}" ]] || DMG=(release/*.dmg)
[[ -f "${ZIP[0]}" ]] || ZIP=(release/*-mac.zip release/*.zip)

bash scripts/prepare-release-assets.sh

if [[ ! -f "${DMG[0]}" ]]; then
  echo "错误: 未找到 DMG，见 release/" >&2
  ls -la release/ 2>/dev/null || true
  exit 1
fi

SHA=$(shasum -a 256 "${DMG[0]}" | awk '{print $1}')
echo "→ DMG: ${DMG[0]} (${SHA:0:16}…)"

if [[ -f Casks/syc-tool.rb ]]; then
  sed -i '' "s/version \".*\"/version \"${VERSION}\"/" Casks/syc-tool.rb
  sed -i '' "s/sha256 \".*\"/sha256 \"${SHA}\"/" Casks/syc-tool.rb
  echo "→ 已更新 Casks/syc-tool.rb"
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "请安装 gh 后执行:"
  echo "  gh release create ${TAG} ${DMG[0]} ${ZIP[0]} --repo ${REPO} --title \"SYC-TOOL ${TAG}\""
  exit 0
fi

if gh release view "$TAG" --repo "$REPO" >/dev/null 2>&1; then
  echo "→ 上传资产到已有 Release ${TAG}"
  gh release upload "$TAG" "${DMG[0]}" ${ZIP[0]:+${ZIP[0]}} --repo "$REPO" --clobber
else
  echo "→ 创建 Release ${TAG}"
  gh release create "$TAG" "${DMG[0]}" ${ZIP[0]:+${ZIP[0]}} \
    --repo "$REPO" \
    --title "SYC-TOOL ${TAG}" \
    --notes "macOS Apple Silicon 安装包。DMG 双击安装，或使用 Homebrew: brew tap sunyanchen1990/syc-tool && brew install --cask syc-tool"
fi

echo ""
echo "✓ https://github.com/${REPO}/releases/tag/${TAG}"
