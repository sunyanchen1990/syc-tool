#!/usr/bin/env bash
# 从 GitHub Releases 下载最新 DMG 并安装到「应用程序」
set -euo pipefail

REPO="${SYC_TOOL_REPO:-sunyanchen1990/syc-tool}"
API="https://api.github.com/repos/${REPO}/releases/latest"

arch="$(uname -m)"
if [[ "$arch" == "arm64" ]]; then
  PATTERN='arm64\.dmg$'
else
  PATTERN='\.dmg$'
fi

echo "→ 查询 ${REPO} 最新版本…"
JSON="$(curl -fsSL "$API")"

VERSION="$(printf '%s' "$JSON" | sed -n 's/.*"tag_name": *"v\?\([^"]*\)".*/\1/p' | head -1)"
if [[ -z "$VERSION" ]]; then
  echo "错误: 未找到 Release，请先在 GitHub 发布版本。" >&2
  echo "  https://github.com/${REPO}/releases" >&2
  exit 1
fi

ASSET_URL="$(printf '%s' "$JSON" | tr ',' '\n' | sed -n 's/.*"browser_download_url": *"\([^"]*\)".*/\1/p' | grep -E "$PATTERN" | head -1)"

if [[ -z "$ASSET_URL" ]]; then
  echo "错误: 未找到匹配的 DMG（${PATTERN}）" >&2
  exit 1
fi

TMP="$(mktemp -d)"
DMG="$TMP/SYC-TOOL.dmg"
trap 'rm -rf "$TMP"' EXIT

echo "→ 下载 v${VERSION} …"
curl -fsSL "$ASSET_URL" -o "$DMG"

echo "→ 挂载并安装…"
MOUNT_OUT="$(hdiutil attach "$DMG" -nobrowse -quiet)"
VOLUME="$(echo "$MOUNT_OUT" | tail -1 | awk -F'\t' '{print $NF}')"
APP_SRC="$VOLUME/SYC-TOOL.app"
APP_DST="/Applications/SYC-TOOL.app"

if [[ ! -d "$APP_SRC" ]]; then
  echo "错误: 未在 DMG 中找到 SYC-TOOL.app" >&2
  hdiutil detach "$VOLUME" -quiet 2>/dev/null || true
  exit 1
fi

osascript -e 'quit app "SYC-TOOL"' 2>/dev/null || true
sleep 1
rm -rf "$APP_DST"
cp -R "$APP_SRC" "$APP_DST"
xattr -cr "$APP_DST"
hdiutil detach "$VOLUME" -quiet

echo ""
echo "✓ 已安装 SYC-TOOL v${VERSION} → $APP_DST"
echo "  可在启动台或「应用程序」中打开。"
