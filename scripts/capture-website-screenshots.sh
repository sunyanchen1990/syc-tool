#!/usr/bin/env bash
# 自动截取 SYC-TOOL 各模块真实界面，输出到 website/public/screenshots/
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

WEBSITE_ROOT="${WEBSITE_ROOT:-$ROOT/../syc-tool-website}"
if [[ ! -d "$WEBSITE_ROOT" ]]; then
  echo "错误: 未找到官网目录: $WEBSITE_ROOT"
  echo "请确保 t5/syc-tool-website 存在，或设置环境变量 WEBSITE_ROOT"
  exit 1
fi

OUT_DIR="$WEBSITE_ROOT/public/screenshots"
mkdir -p "$OUT_DIR"

echo "→ 编译 Electron 主进程…"
npm run electron:compile

echo "→ 启动 Vite（若 5173 已被占用则复用）…"
if ! curl -sf "http://localhost:5173" >/dev/null 2>&1; then
  npx vite &
  VITE_PID=$!
  npx wait-on "http://localhost:5173" -t 60000
else
  VITE_PID=""
  echo "  已检测到 Vite 在运行"
fi

cleanup() {
  if [[ -n "${VITE_PID:-}" ]] && kill -0 "$VITE_PID" 2>/dev/null; then
    kill "$VITE_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo "→ 导出截图到 $OUT_DIR …"
SYC_EXPORT_SCREENSHOTS=1 \
SYC_SCREENSHOTS_DIR="$OUT_DIR" \
  env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron .

echo "→ 重新打包单页官网 HTML…"
node "$WEBSITE_ROOT/scripts/build-standalone.mjs"

echo "✓ 完成。截图：$OUT_DIR"
ls -la "$OUT_DIR"
