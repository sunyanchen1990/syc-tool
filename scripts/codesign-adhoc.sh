#!/usr/bin/env bash
# 对未付费开发者账号的包做 ad-hoc 签名，减轻 Gatekeeper 拦截（仍需 install 脚本清除隔离）
set -euo pipefail
APP="${1:?用法: codesign-adhoc.sh path/to/App.app}"
if [[ ! -d "$APP" ]]; then
  exit 0
fi
echo "→ ad-hoc 签名 $(basename "$APP")"
find "$APP" -type f \( -perm +111 -o -name '*.dylib' -o -name '*.node' \) 2>/dev/null | while read -r f; do
  codesign --force --sign - "$f" 2>/dev/null || true
done
find "$APP" -depth \( -name '*.app' -o -name '*.framework' \) 2>/dev/null | while read -r f; do
  codesign --force --sign - "$f" 2>/dev/null || true
done
codesign --force --deep --sign - "$APP" 2>/dev/null || true
