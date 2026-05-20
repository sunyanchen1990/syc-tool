#!/usr/bin/env bash
# Homebrew 安装（需已安装 brew）
set -euo pipefail

if ! command -v brew >/dev/null 2>&1; then
  echo "请先安装 Homebrew: https://brew.sh" >&2
  exit 1
fi

TAP="${SYC_TOOL_TAP:-sunyanchen1990/syc-tool}"

echo "→ brew tap ${TAP}"
brew tap "${TAP}"

echo "→ brew install --cask syc-tool"
brew install --cask syc-tool

echo ""
echo "✓ 安装完成，可在启动台打开 SYC-TOOL。"
