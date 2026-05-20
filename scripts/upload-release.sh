#!/usr/bin/env bash
# 将本地 release/ 中的安装包上传到 GitHub（需先 gh auth login）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
VER="$(node -p "require('./package.json').version")"
TAG="v${VER}"
REPO="${GITHUB_REPO:-sunyanchen1990/syc-tool}"

if ! command -v gh >/dev/null 2>&1; then
  echo "请先安装: brew install gh && gh auth login" >&2
  exit 1
fi

ZIP=(release/SYC-TOOL-"${VER}"-arm64.zip)
DMG=(release/SYC-TOOL-"${VER}"-arm64.dmg)
[[ -f "${ZIP[0]}" ]] || { echo "缺少 ${ZIP[0]}，请先 npm run release:local" >&2; exit 1; }
[[ -f "${DMG[0]}" ]] || { echo "缺少 ${DMG[0]}" >&2; exit 1; }

NOTES="$(cat <<EOF
## 安装说明

1. 下载 **ZIP** 并解压（推荐）
2. **双击「SYC-TOOL 安装器」**（勿直接打开 SYC-TOOL.app）
3. 若提示无法验证：按住 Control 点安装器 → 打开 → 打开
4. 在启动台打开 SYC-TOOL
EOF
)"

if gh release view "$TAG" --repo "$REPO" >/dev/null 2>&1; then
  echo "→ 上传到已有 Release $TAG"
  gh release upload "$TAG" "${ZIP[0]}" "${DMG[0]}" --repo "$REPO" --clobber
else
  echo "→ 创建 Release $TAG"
  gh release create "$TAG" "${ZIP[0]}" "${DMG[0]}" --repo "$REPO" --title "SYC-TOOL $TAG" --notes "$NOTES"
fi

echo "✓ https://github.com/${REPO}/releases/tag/${TAG}"
