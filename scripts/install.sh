#!/usr/bin/env bash
# 一键安装 SYC-TOOL → ~/Applications（无需管理员密码）
set -euo pipefail

REPO="${SYC_TOOL_REPO:-sunyanchen1990/syc-tool}"
DEFAULT_VERSION="${SYC_TOOL_VERSION:-1.0.2}"
DEFAULT_VERSION="${DEFAULT_VERSION#v}"
APP_NAME="SYC-TOOL.app"
APP_DIR="${SYC_TOOL_APP_DIR:-$HOME/Applications}"
OPEN_APP="${SYC_TOOL_OPEN:-1}"

arch="$(uname -m)"
suffix="arm64"
[[ "$arch" == "arm64" ]] || suffix="x64"

# 带镜像的下载（国内网络友好）
download_file() {
  local dest="$1"
  shift
  for url in "$@"; do
    echo "→ 下载: ${url#https://}"
    if curl -fL --connect-timeout 25 --max-time 1200 --retry 2 --retry-delay 3 -o "$dest" "$url"; then
      return 0
    fi
    echo "  跳过（超时或不可用）"
  done
  return 1
}

mirror_urls() {
  local direct="$1"
  echo "$direct"
  echo "https://ghfast.top/${direct}"
  echo "https://mirror.ghproxy.com/${direct}"
  echo "https://gh-proxy.com/${direct}"
}

resolve_version() {
  local ver="$DEFAULT_VERSION"
  local json
  json="$(curl -fsSL --connect-timeout 8 --max-time 15 \
    -H "Accept: application/vnd.github+json" \
    -H "User-Agent: SYC-TOOL-Installer/1.0.3" \
    "https://api.github.com/repos/${REPO}/releases/latest" 2>/dev/null || true)"
  if [[ -n "$json" ]]; then
    local t
    t="$(printf '%s' "$json" | sed -n 's/.*"tag_name"[[:space:]]*:[[:space:]]*"v\?\([^"]*\)".*/\1/p' | head -1)"
    [[ -n "$t" ]] && ver="${t#v}"
  fi
  echo "$ver"
}

VERSION="$(resolve_version)"
BASE="https://github.com/${REPO}/releases/download/v${VERSION}"
ZIP_DIRECT="${BASE}/SYC-TOOL-${VERSION}-${suffix}.zip"
DMG_DIRECT="${BASE}/SYC-TOOL-${VERSION}-${suffix}.dmg"

echo "→ 准备安装 SYC-TOOL v${VERSION}"

mkdir -p "$APP_DIR"
TMP="$(mktemp -d)"
VOLUME=""
cleanup() {
  [[ -n "$VOLUME" ]] && hdiutil detach "$VOLUME" -quiet 2>/dev/null || true
  rm -rf "$TMP"
}
trap cleanup EXIT

APP_SRC=""
ZIP_URLS=()
while read -r u; do ZIP_URLS+=("$u"); done < <(mirror_urls "$ZIP_DIRECT")

if download_file "$TMP/pkg.zip" "${ZIP_URLS[@]}"; then
  echo "→ 解压…"
  unzip -q "$TMP/pkg.zip" -d "$TMP"
  APP_SRC="$(find "$TMP" -name "$APP_NAME" -type d | head -1)"
else
  echo "→ ZIP 不可用，尝试 DMG…"
  DMG_URLS=()
  while read -r u; do DMG_URLS+=("$u"); done < <(mirror_urls "$DMG_DIRECT")
  download_file "$TMP/pkg.dmg" "${DMG_URLS[@]}"
  MOUNT_OUT="$(hdiutil attach "$TMP/pkg.dmg" -nobrowse -quiet)"
  VOLUME="$(echo "$MOUNT_OUT" | tail -1 | awk -F'\t' '{print $NF}')"
  APP_SRC="$VOLUME/$APP_NAME"
  # DMG 内若有安装助手，优先使用
  HELPER="$VOLUME/安装 SYC-TOOL.command"
  if [[ -f "$HELPER" ]]; then
    echo "→ 使用 DMG 内安装助手…"
    bash "$HELPER"
    exit 0
  fi
fi

if [[ ! -d "$APP_SRC" ]]; then
  echo "错误: 下载或解压失败，请检查网络后重试。" >&2
  echo "  也可在浏览器打开: https://github.com/${REPO}/releases/tag/v${VERSION}" >&2
  exit 1
fi

APP_DST="$APP_DIR/$APP_NAME"
echo "→ 安装到 $APP_DST …"
osascript -e 'quit app "SYC-TOOL"' 2>/dev/null || true
sleep 1
rm -rf "$APP_DST"
ditto "$APP_SRC" "$APP_DST"
xattr -dr com.apple.quarantine "$APP_DST" 2>/dev/null || true
xattr -cr "$APP_DST" 2>/dev/null || true
codesign --force --deep --sign - "$APP_DST" 2>/dev/null || true

echo ""
echo "✓ 已安装 SYC-TOOL v${VERSION}"
echo "  位置: $APP_DST"

if [[ "$OPEN_APP" == "1" ]]; then
  open "$APP_DST" 2>/dev/null || true
fi
