#!/bin/bash
# 在 DMG 中双击运行：安装到 ~/Applications 并解除「已损坏」提示
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
APP_SRC="$DIR/SYC-TOOL.app"
APP_DST="$HOME/Applications/SYC-TOOL.app"

if [[ ! -d "$APP_SRC" ]]; then
  osascript -e 'display alert "未找到 SYC-TOOL.app" message "请使用官网的一键安装命令，或重新下载 DMG。" as critical'
  exit 1
fi

mkdir -p "$HOME/Applications"
osascript -e 'quit app "SYC-TOOL"' 2>/dev/null || true
sleep 1
rm -rf "$APP_DST"
ditto "$APP_SRC" "$APP_DST"
xattr -dr com.apple.quarantine "$APP_DST" 2>/dev/null || true
xattr -cr "$APP_DST" 2>/dev/null || true

osascript -e "display notification \"已安装到 用户/应用程序\" with title \"SYC-TOOL\""
open "$APP_DST"
