#!/usr/bin/env bash
# Homebrew 安装到用户目录，避免 sudo（仍建议优先用 scripts/install.sh）
set -euo pipefail

if ! command -v brew >/dev/null 2>&1; then
  echo "未检测到 Homebrew。请使用官网一键安装命令（无需 brew）：" >&2
  echo "  curl -fsSL https://raw.githubusercontent.com/sunyanchen1990/syc-tool/main/scripts/install.sh | bash" >&2
  exit 1
fi

TAP="${SYC_TOOL_TAP:-sunyanchen1990/syc-tool}"
APP_DIR="${HOME}/Applications"
mkdir -p "$APP_DIR"

echo "→ brew tap ${TAP}"
brew tap "${TAP}"

echo "→ 安装到 ${APP_DIR}（无需管理员密码）"
brew install --cask --no-quarantine --appdir="$APP_DIR" syc-tool

APP="$APP_DIR/SYC-TOOL.app"
xattr -dr com.apple.quarantine "$APP" 2>/dev/null || true
xattr -cr "$APP" 2>/dev/null || true

echo ""
echo "✓ 安装完成: $APP"
