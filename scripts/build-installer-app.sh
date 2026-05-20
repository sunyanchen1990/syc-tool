#!/usr/bin/env bash
# 生成「SYC-TOOL 安装器.app」— 比 .command 更容易被用户打开
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/build/SYC-TOOL 安装器.app"
MACOS="$APP/Contents/MacOS"
RES="$APP/Contents/Resources"

rm -rf "$APP"
mkdir -p "$MACOS" "$RES"

cat > "$MACOS/installer" <<'SH'
#!/bin/bash
set -e
# 安装器.app 与 SYC-TOOL.app 在同一文件夹（ZIP 解压后或 DMG 内）
BUNDLE="$(cd "$(dirname "$0")/../.." && pwd)"
PARENT="$(cd "$BUNDLE/.." && pwd)"

xattr -dr com.apple.quarantine "$PARENT" 2>/dev/null || true
xattr -cr "$PARENT" 2>/dev/null || true

APP_SRC="$PARENT/SYC-TOOL.app"
APP_DST="$HOME/Applications/SYC-TOOL.app"

if [[ ! -d "$APP_SRC" ]]; then
  osascript -e 'display alert "未找到 SYC-TOOL.app" message "请把本安装器与 SYC-TOOL.app 放在同一文件夹内。" as critical'
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
SH
chmod +x "$MACOS/installer"

cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>installer</string>
  <key>CFBundleIdentifier</key>
  <string>com.syc.tool.installer</string>
  <key>CFBundleName</key>
  <string>SYC-TOOL 安装器</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0.0</string>
  <key>LSMinimumSystemVersion</key>
  <string>11.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
PLIST

codesign --force --deep --sign - "$APP" 2>/dev/null || true
echo "✓ $APP"
