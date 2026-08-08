#!/usr/bin/env bash
# build.sh -- 在示例目录内构建 PDF
# 用法（在 example/ 目录下）：
#   bash build.sh             # 生成中间文件并编译
#   bash build.sh --emit-only # 仅生成 _papex_*.tex 与 references.bib
set -euo pipefail

# 定位 papex-latex 工具目录（本脚本位于 example/ 下）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

exec python3 "$TOOL_DIR/papex-build.py" "$SCRIPT_DIR" "$@"
