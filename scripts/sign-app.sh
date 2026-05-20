#!/usr/bin/env bash
# 解除隔离并 ad-hoc 签名（未公证包必做）
APP="${1:?}"
[[ -d "$APP" ]] || exit 0
xattr -dr com.apple.quarantine "$APP" 2>/dev/null || true
xattr -cr "$APP" 2>/dev/null || true
find "$APP" -type f \( -perm +111 -o -name '*.dylib' -o -name '*.node' \) 2>/dev/null | while read -r f; do
  codesign --force --sign - "$f" 2>/dev/null || true
done
find "$APP" -depth \( -name '*.app' -o -name '*.framework' \) 2>/dev/null | while read -r f; do
  codesign --force --sign - "$f" 2>/dev/null || true
done
codesign --force --deep --sign - "$APP" 2>/dev/null || true
