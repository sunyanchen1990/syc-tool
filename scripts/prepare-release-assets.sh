#!/usr/bin/env bash
# 在 ZIP 内加入安装器（体积尽量小）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

bash scripts/build-installer-app.sh
chmod +x "build/双击安装 SYC-TOOL.command" 2>/dev/null || true

INSTALLER_APP="build/SYC-TOOL 安装器.app"
INSTALLER_CMD="build/双击安装 SYC-TOOL.command"
README="build/请先阅读-安装说明.txt"

cat > "$README" <<'TXT'
【重要】请勿直接双击 SYC-TOOL.app。

请双击「SYC-TOOL 安装器」完成安装。
若提示无法验证：按住 Control 再点安装器 → 打开 → 打开。
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
  ditto -c -k --sequesterRsrc --keepParent "$TMP" "$ZIP"
  rm -rf "$TMP"
  echo "  大小: $(du -h "$ZIP" | awk '{print $1}')"
done

echo "✓ ZIP 已包含安装器"
