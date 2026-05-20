#!/usr/bin/env bash
# 一键安装 SYC-TOOL：无需管理员密码，安装到 ~/Applications，并清除 Gatekeeper 隔离
set -euo pipefail

REPO="${SYC_TOOL_REPO:-sunyanchen1990/syc-tool}"
API="https://api.github.com/repos/${REPO}/releases/latest"
APP_NAME="SYC-TOOL.app"
APP_DIR="${SYC_TOOL_APP_DIR:-$HOME/Applications}"
OPEN_APP="${SYC_TOOL_OPEN:-1}"

arch="$(uname -m)"
if [[ "$arch" == "arm64" ]]; then
  ZIP_PATTERN='arm64.*\.zip$'
  DMG_PATTERN='arm64\.dmg$'
else
  ZIP_PATTERN='\.zip$'
  DMG_PATTERN='\.dmg$'
fi

echo "→ 查询 ${REPO} 最新版本…"
JSON="$(curl -fsSL "$API")"

VERSION="$(printf '%s' "$JSON" | sed -n 's/.*"tag_name": *"v\?\([^"]*\)".*/\1/p' | head -1)"
if [[ -z "$VERSION" ]]; then
  echo "错误: 未找到 GitHub Release。" >&2
  echo "  https://github.com/${REPO}/releases" >&2
  exit 1
fi

pick_url() {
  local pat="$1"
  printf '%s' "$JSON" | tr ',' '\n' | sed -n 's/.*"browser_download_url": *"\([^"]*\)".*/\1/p' | grep -E "$pat" | head -1
}

ASSET_URL="$(pick_url "$ZIP_PATTERN")"
MODE="zip"
if [[ -z "$ASSET_URL" ]]; then
  ASSET_URL="$(pick_url "$DMG_PATTERN")"
  MODE="dmg"
fi

if [[ -z "$ASSET_URL" ]]; then
  echo "错误: Release 中未找到 zip/dmg 安装包。" >&2
  exit 1
fi

mkdir -p "$APP_DIR"
TMP="$(mktemp -d)"
VOLUME=""
cleanup() {
  [[ -n "$VOLUME" ]] && hdiutil detach "$VOLUME" -quiet 2>/dev/null || true
  rm -rf "$TMP"
}
trap cleanup EXIT

APP_SRC=""
if [[ "$MODE" == "zip" ]]; then
  echo "→ 下载 v${VERSION} (ZIP)…"
  curl -fsSL "$ASSET_URL" -o "$TMP/pkg.zip"
  unzip -q "$TMP/pkg.zip" -d "$TMP"
  APP_SRC="$(find "$TMP" -name "$APP_NAME" -type d | head -1)"
else
  echo "→ 下载 v${VERSION} (DMG)…"
  curl -fsSL "$ASSET_URL" -o "$TMP/pkg.dmg"
  MOUNT_OUT="$(hdiutil attach "$TMP/pkg.dmg" -nobrowse -quiet)"
  VOLUME="$(echo "$MOUNT_OUT" | tail -1 | awk -F'\t' '{print $NF}')"
  APP_SRC="$VOLUME/$APP_NAME"
fi

if [[ ! -d "$APP_SRC" ]]; then
  echo "错误: 安装包内未找到 $APP_NAME" >&2
  exit 1
fi

APP_DST="$APP_DIR/$APP_NAME"
echo "→ 安装到 $APP_DST …"
osascript -e 'quit app "SYC-TOOL"' 2>/dev/null || true
sleep 1
rm -rf "$APP_DST"
ditto "$APP_SRC" "$APP_DST"
xattr -dr com.apple.quarantine "$APP_DST" 2>/dev/null || true
xattr -cr "$APP_DST" 2>/dev/null || true

echo ""
echo "✓ 已安装 SYC-TOOL v${VERSION}"
echo "  位置: $APP_DST"
echo "  （用户目录安装，无需输入系统密码）"

if [[ "$OPEN_APP" == "1" ]]; then
  open "$APP_DST" 2>/dev/null || open -a "$APP_DST" 2>/dev/null || true
fi
