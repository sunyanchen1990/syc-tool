#!/usr/bin/env bash
# 一键安装 SYC-TOOL：无需管理员密码，安装到 ~/Applications，并清除 Gatekeeper 隔离
set -euo pipefail

REPO="${SYC_TOOL_REPO:-sunyanchen1990/syc-tool}"
DEFAULT_VERSION="${SYC_TOOL_VERSION:-1.0.1}"
APP_NAME="SYC-TOOL.app"
APP_DIR="${SYC_TOOL_APP_DIR:-$HOME/Applications}"
OPEN_APP="${SYC_TOOL_OPEN:-1}"
UA="SYC-TOOL-Installer/1.0.2"

echo "→ 查询 ${REPO} 最新版本…"

read -r VERSION ASSET_URL MODE < <(
  REPO="$REPO" DEFAULT_VERSION="$DEFAULT_VERSION" UA="$UA" python3 <<'PY'
import json, os, re, urllib.error, urllib.request

repo = os.environ["REPO"]
default_ver = os.environ["DEFAULT_VERSION"].lstrip("v")
arch = os.uname().machine
ua = os.environ["UA"]

def fetch(url):
    req = urllib.request.Request(
        url,
        headers={"Accept": "application/vnd.github+json", "User-Agent": ua},
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            return json.load(r)
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError, TimeoutError):
        return None

data = fetch(f"https://api.github.com/repos/{repo}/releases/latest")
if not data or "tag_name" not in data:
    items = fetch(f"https://api.github.com/repos/{repo}/releases?per_page=8") or []
    data = next((x for x in items if isinstance(x, dict) and not x.get("draft")), None)

if data and data.get("tag_name"):
    ver = str(data["tag_name"]).lstrip("v")
    assets = data.get("assets") or []
else:
    ver = default_ver
    assets = []

zip_re = re.compile(r"arm64.*\.zip$", re.I) if arch == "arm64" else re.compile(r"\.zip$", re.I)
dmg_re = re.compile(r"arm64\.dmg$", re.I) if arch == "arm64" else re.compile(r"\.dmg$", re.I)

url, mode = None, "zip"
for a in assets:
    n = a.get("name") or ""
    if zip_re.search(n):
        url, mode = a.get("browser_download_url"), "zip"
        break
if not url:
    for a in assets:
        n = a.get("name") or ""
        if dmg_re.search(n):
            url, mode = a.get("browser_download_url"), "dmg"
            break

if not url:
    base = f"https://github.com/{repo}/releases/download/v{ver}"
    suffix = "arm64" if arch == "arm64" else "x64"
    url = f"{base}/SYC-TOOL-{ver}-{suffix}.zip"
    mode = "zip"

print(ver, url, mode)
PY
)

if [[ -z "$VERSION" || -z "$ASSET_URL" ]]; then
  echo "错误: 无法解析下载地址。" >&2
  exit 1
fi

echo "→ 将安装 v${VERSION}（${MODE}）"

mkdir -p "$APP_DIR"
TMP="$(mktemp -d)"
VOLUME=""
cleanup() {
  [[ -n "$VOLUME" ]] && hdiutil detach "$VOLUME" -quiet 2>/dev/null || true
  rm -rf "$TMP"
}
trap cleanup EXIT

APP_SRC=""
if [[ "$MODE" == "zip" ]]; then
  echo "→ 下载安装包…"
  curl -fL --retry 3 --retry-delay 2 -o "$TMP/pkg.zip" "$ASSET_URL"
  unzip -q "$TMP/pkg.zip" -d "$TMP"
  APP_SRC="$(find "$TMP" -name "$APP_NAME" -type d | head -1)"
else
  echo "→ 下载 DMG…"
  curl -fL --retry 3 --retry-delay 2 -o "$TMP/pkg.dmg" "$ASSET_URL"
  MOUNT_OUT="$(hdiutil attach "$TMP/pkg.dmg" -nobrowse -quiet)"
  VOLUME="$(echo "$MOUNT_OUT" | tail -1 | awk -F'\t' '{print $NF}')"
  APP_SRC="$VOLUME/$APP_NAME"
fi

if [[ ! -d "$APP_SRC" ]]; then
  echo "错误: 安装包内未找到 $APP_NAME" >&2
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
# 解除「已损坏」：对主程序与 Frameworks 再签一次 ad-hoc
if [[ -d "$APP_DST/Contents/MacOS" ]]; then
  codesign --force --deep --sign - "$APP_DST" 2>/dev/null || true
fi

echo ""
echo "✓ 已安装 SYC-TOOL v${VERSION}"
echo "  位置: $APP_DST"
echo "  （用户目录，无需系统密码）"

if [[ "$OPEN_APP" == "1" ]]; then
  open "$APP_DST" 2>/dev/null || true
fi
