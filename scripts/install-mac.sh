#!/bin/bash
# 打包、安装到应用程序，并刷新 macOS 图标缓存
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

npm run pack

APP_SRC="$ROOT/release/mac-arm64/SYC-TOOL.app"
APP_DST="/Applications/SYC-TOOL.app"

if [ ! -d "$APP_SRC" ]; then
  echo "未找到 $APP_SRC"
  exit 1
fi

# 退出正在运行的实例
osascript -e 'quit app "SYC-TOOL"' 2>/dev/null || true
sleep 1

rm -rf "$APP_DST"
cp -R "$APP_SRC" "$APP_DST"
xattr -cr "$APP_DST"
touch "$APP_DST/Contents/Resources/icon.icns"
touch "$APP_DST"

# 刷新图标缓存
rm -rf "$HOME/Library/Caches/com.apple.iconservices.store" 2>/dev/null || true
if [ -w /Library/Caches/com.apple.iconservices.store ] 2>/dev/null; then
  rm -rf /Library/Caches/com.apple.iconservices.store 2>/dev/null || true
fi
killall Dock 2>/dev/null || true
killall Finder 2>/dev/null || true

echo ""
echo "已安装: $APP_DST"
echo "图标文件: $APP_DST/Contents/Resources/icon.icns"
echo "若启动台仍未更新，请注销并重新登录一次。"
