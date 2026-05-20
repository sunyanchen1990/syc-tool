#!/bin/bash
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"

# 解除整个文件夹的下载隔离（否则本脚本和 App 都会被拦）
xattr -dr com.apple.quarantine "$DIR" 2>/dev/null || true
xattr -cr "$DIR" 2>/dev/null || true

APP_SRC="$DIR/SYC-TOOL.app"
APP_DST="$HOME/Applications/SYC-TOOL.app"

if [[ ! -d "$APP_SRC" ]]; then
  osascript -e 'display alert "未找到 SYC-TOOL.app" message "请确认已解压完整，且不要单独移动 .app 文件。" as critical'
  exit 1
fi

mkdir -p "$HOME/Applications"
osascript -e 'quit app "SYC-TOOL"' 2>/dev/null || true
sleep 1
rm -rf "$APP_DST"
ditto "$APP_SRC" "$APP_DST"
xattr -dr com.apple.quarantine "$APP_DST" 2>/dev/null || true
xattr -cr "$APP_DST" 2>/dev/null || true
codesign --force --deep --sign - "$APP_DST" 2>/dev/null || true

osascript -e 'display notification "安装完成" with title "SYC-TOOL"'
open "$APP_DST"
