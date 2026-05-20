#!/usr/bin/env bash
# 将安装脚本同步到官网 public（发版前执行）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="${ROOT}/../syc-tool-website/public"
cp "$ROOT/scripts/install.sh" "$WEB/install.sh"
cp "$ROOT/scripts/fix-gatekeeper.sh" "$WEB/fix-app.sh"
echo "✓ 已同步到 $WEB"
