#!/usr/bin/env bash
# 在 ZIP 内加入安装器（DMG 由 electron-builder dmg.contents 配置）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

bash scripts/build-installer-app.sh
chmod +x "build/双击安装 SYC-TOOL.command" 2>/dev/null || true

INSTALLER_APP="build/SYC-TOOL 安装器.app"
INSTALLER_CMD="build/双击安装 SYC-TOOL.command"
README="build/请先阅读-安装说明.txt"

cat > "$README" <<'TXT'
SYC-TOOL 安装说明
================

【重要】请勿直接双击「SYC-TOOL.app」，否则会提示「已损坏」。

请双击「SYC-TOOL 安装器」完成安装（推荐）。

若系统提示「无法验证开发者」：
  对「SYC-TOOL 安装器」按住 Control 键再点鼠标 → 选择「打开」→ 再点「打开」。

安装完成后，在启动台打开 SYC-TOOL 即可。
TXT

shopt -s nullglob
for ZIP in release/SYC-TOOL-*-arm64*.zip release/SYC-TOOL-*-mac.zip; do
  echo "→ ZIP: $ZIP"
  TMP="$(mktemp -d)"
  unzip -q -o "$ZIP" -d "$TMP"
  cp -R "$INSTALLER_APP" "$TMP/"
  cp "$INSTALLER_CMD" "$README" "$TMP/"
  chmod +x "$TMP/双击安装 SYC-TOOL.command"
  rm -f "$ZIP"
  (cd "$TMP" && zip -qr "$ROOT/$ZIP" .)
  rm -rf "$TMP"
done

echo "✓ ZIP 已包含安装器"
