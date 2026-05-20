#!/bin/bash
# 双击在「终端」运行（比 .app 更容易通过首次拦截）
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "→ 正在处理安全限制…"
xattr -dr com.apple.quarantine "$DIR" 2>/dev/null || true
xattr -cr "$DIR" 2>/dev/null || true

APP_SRC="$DIR/SYC-TOOL.app"
APP_DST="$HOME/Applications/SYC-TOOL.app"
INSTALLER_APP="$DIR/SYC-TOOL 安装器.app"

if [[ ! -d "$APP_SRC" ]]; then
  echo "错误: 本目录未找到 SYC-TOOL.app"
  echo "当前目录: $DIR"
  ls -la
  read -r -p "按回车退出…"
  exit 1
fi

bash "$(cd "$(dirname "$0")/../scripts" && pwd)/sign-app.sh" "$APP_SRC" 2>/dev/null || {
  xattr -cr "$APP_SRC" 2>/dev/null || true
  codesign --force --deep --sign - "$APP_SRC" 2>/dev/null || true
}

[[ -d "$INSTALLER_APP" ]] && xattr -cr "$INSTALLER_APP" 2>/dev/null || true

mkdir -p "$HOME/Applications"
osascript -e 'quit app "SYC-TOOL"' 2>/dev/null || true
sleep 1
rm -rf "$APP_DST"
ditto "$APP_SRC" "$APP_DST"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -f "$ROOT/scripts/sign-app.sh" ]]; then
  bash "$ROOT/scripts/sign-app.sh" "$APP_DST"
else
  xattr -cr "$APP_DST" 2>/dev/null || true
  codesign --force --deep --sign - "$APP_DST" 2>/dev/null || true
fi

echo ""
echo "✓ 已安装到: $APP_DST"
echo "→ 正在打开…"
open "$APP_DST" || true
echo ""
read -r -p "完成。按回车关闭窗口…"
