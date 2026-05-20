#!/bin/bash
# 可选：下载微软雅黑用于图标渲染（失败则用系统苹方）
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)/build/fonts"
mkdir -p "$DIR"
OUT="$DIR/msyh.ttf"
[ -f "$OUT" ] && [ "$(wc -c <"$OUT")" -gt 1000000 ] && exit 0

for URL in \
  "https://raw.githubusercontent.com/owent-utils/font/master/msyh.ttf" \
  "https://gitee.com/owent-utils/font/raw/master/msyh.ttf"
do
  curl -fsSL --max-time 60 "$URL" -o "$OUT" && [ "$(wc -c <"$OUT")" -gt 1000000 ] && exit 0
done

echo "未下载到微软雅黑，图标将使用 PingFang SC 回退"
