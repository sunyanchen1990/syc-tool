#!/usr/bin/env bash
# 已安装但提示「已损坏」时运行（无需重装）
set -euo pipefail
APP="${1:-$HOME/Applications/SYC-TOOL.app}"
if [[ ! -d "$APP" ]]; then
  APP="/Applications/SYC-TOOL.app"
fi
if [[ ! -d "$APP" ]]; then
  echo "未找到 SYC-TOOL.app，请指定路径: $0 ~/Applications/SYC-TOOL.app" >&2
  exit 1
fi
xattr -dr com.apple.quarantine "$APP" 2>/dev/null || true
xattr -cr "$APP"
codesign --force --deep --sign - "$APP" 2>/dev/null || true
echo "✓ 已处理: $APP"
echo "  请再次打开应用。"
