#!/usr/bin/env bash
# 在 ZIP 根目录加入「双击安装」助手，便于普通用户安装
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

INSTALLER="build/双击安装 SYC-TOOL.command"
chmod +x "$INSTALLER" "build/安装 SYC-TOOL.command" 2>/dev/null || true

shopt -s nullglob
ZIPS=(release/SYC-TOOL-*-arm64*.zip release/SYC-TOOL-*-mac.zip)
[[ ${#ZIPS[@]} -gt 0 ]] || { echo "无 ZIP 可处理"; exit 0; }

for ZIP in "${ZIPS[@]}"; do
  echo "→ 处理 $ZIP"
  TMP="$(mktemp -d)"
  unzip -q -o "$ZIP" -d "$TMP"
  cp "$INSTALLER" "$TMP/"
  chmod +x "$TMP/双击安装 SYC-TOOL.command"
  (cd "$TMP" && zip -q -r "$ROOT/$ZIP" .)
  rm -rf "$TMP"
done
echo "✓ ZIP 已包含「双击安装 SYC-TOOL.command」"
