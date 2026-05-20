#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
APP_SRC="$DIR/SYC-TOOL.app"
APP_DST="$HOME/Applications/SYC-TOOL.app"

if [[ ! -d "$APP_SRC" ]]; then
  osascript -e 'display alert "未找到 SYC-TOOL.app" message "请确认已解压完整安装包。" as critical'
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
open "$APP_DST"
