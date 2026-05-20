#!/usr/bin/env bash
# 从 GitHub Releases 安装（默认 ~/Applications，无需管理员密码）
set -euo pipefail
export SYC_TOOL_OPEN="${SYC_TOOL_OPEN:-0}"
exec "$(cd "$(dirname "$0")" && pwd)/install.sh"
