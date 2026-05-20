#!/usr/bin/env bash
# 无需 brew tap（避免克隆整仓卡住），直接安装 Cask
set -euo pipefail

if ! command -v brew >/dev/null 2>&1; then
  echo "未检测到 Homebrew，请使用一键安装：" >&2
  echo "  curl -fsSL https://raw.githubusercontent.com/sunyanchen1990/syc-tool/main/scripts/install.sh | bash" >&2
  exit 1
fi

CASK_URL="https://raw.githubusercontent.com/sunyanchen1990/syc-tool/main/Casks/syc-tool.rb"
APP_DIR="${HOME}/Applications"
mkdir -p "$APP_DIR"

echo "→ 从 GitHub 安装 Cask（跳过 brew tap）…"
brew install --cask --no-quarantine --appdir="$APP_DIR" "$CASK_URL"

APP="$APP_DIR/SYC-TOOL.app"
xattr -dr com.apple.quarantine "$APP" 2>/dev/null || true
xattr -cr "$APP" 2>/dev/null || true
codesign --force --deep --sign - "$APP" 2>/dev/null || true

echo ""
echo "✓ 安装完成: $APP"
