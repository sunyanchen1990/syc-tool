#!/bin/bash
# 从 build/icon.png 生成 macOS icon.icns（多尺寸 iconset）
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/build/icon.png"
ICONSET="$ROOT/build/icon.iconset"

if [ ! -f "$SRC" ]; then
  echo "缺少 $SRC，请先运行: npm run icons"
  exit 1
fi

# 确保为 1024×1024 方形（macOS 应用图标标准）
W=$(sips -g pixelWidth "$SRC" 2>/dev/null | awk '/pixelWidth/{print $2}')
H=$(sips -g pixelHeight "$SRC" 2>/dev/null | awk '/pixelHeight/{print $2}')
if [ "$W" != "1024" ] || [ "$H" != "1024" ]; then
  sips -z 1024 1024 "$SRC" --out "$SRC" >/dev/null
fi

rm -rf "$ICONSET"
mkdir -p "$ICONSET"

sips -z 16 16     "$SRC" --out "$ICONSET/icon_16x16.png"
sips -z 32 32     "$SRC" --out "$ICONSET/icon_16x16@2x.png"
sips -z 32 32     "$SRC" --out "$ICONSET/icon_32x32.png"
sips -z 64 64     "$SRC" --out "$ICONSET/icon_32x32@2x.png"
sips -z 128 128   "$SRC" --out "$ICONSET/icon_128x128.png"
sips -z 256 256   "$SRC" --out "$ICONSET/icon_128x128@2x.png"
sips -z 256 256   "$SRC" --out "$ICONSET/icon_256x256.png"
sips -z 512 512   "$SRC" --out "$ICONSET/icon_256x256@2x.png"
sips -z 512 512   "$SRC" --out "$ICONSET/icon_512x512.png"
sips -z 1024 1024 "$SRC" --out "$ICONSET/icon_512x512@2x.png" >/dev/null

xattr -cr "$ICONSET" 2>/dev/null || true
iconutil -c icns "$ICONSET" -o "$ROOT/build/icon.icns"
echo "已生成 $ROOT/build/icon.icns"
