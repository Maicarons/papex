#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
papex-build.py -- Papex 论文源码构建器 (XeLaTeX)

功能：
  1. 读取归档中的 papex.json（提交清单）；
  2. 校验结构（优先用 jsonschema，否则内置基础校验）；
  3. 将纯文本字段安全转义为 LaTeX，生成中间片段：
       _papex_meta.tex        标题 / 作者 / 机构 / 文献编号 / 关键词 / 许可 ...
       _papex_abstract.tex    摘要正文
       _papex_sections.tex    各章节 \\input 列表（按 papex.json 顺序）
       _papex_backmatter.tex  致谢 / 基金
       _papex_appendices.tex  附录
       references.bib         参考文献（若 papex.json 提供 references 数组）
  4. 调用 latexmk -xelatex 编译出 PDF（除非 --emit-only）。

用法：
  python papex-build.py <path> [options]
    <path>  可以是：目录（含 papex.json）| papex.json 文件 | .tar.gz 归档
    --emit-only    只生成中间文件，不编译
    --validate     只校验 papex.json，不生成也不编译
    --out DIR      输出目录（默认：papex.json 所在目录）
    --main NAME    主文档文件名（默认 papex-template.tex）
    --no-clean     编译后保留辅助文件
    --quiet        减少输出

设计要点：
  * 零第三方依赖（仅标准库）；jsonschema 为可选增强。
  * 章节 .tex 文件由作者手写，支持完整 LaTeX（含数学公式），不做转义。
  * JSON 中的纯文本字段默认安全转义；可用 papex.json 的
    build.passthrough（字段路径列表，如 ["paper.abstract"]）豁免转义。
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile

# ----------------------------------------------------------------------------
# LaTeX 文本转义
# ----------------------------------------------------------------------------
_LATEX_SPECIAL = [
    ("\\", r"\textbackslash{}"),  # 必须最先处理
    ("&", r"\&"),
    ("%", r"\%"),
    ("$", r"\$"),
    ("#", r"\#"),
    ("_", r"\_"),
    ("{", r"\{"),
    ("}", r"\}"),
    ("~", r"\textasciitilde{}"),
    ("^", r"\textasciicircum{}"),
]

# 单遍转义查表（避免替换文本被二次扫描）。
_LATEX_MAP = dict(_LATEX_SPECIAL)


def latex_escape(text):
    """转义 LaTeX 文本模式特殊字符，保留中文与常规标点。

    采用单遍字符扫描：替换文本（如 \\textbackslash{}）不会被二次扫描，
    避免其中的 { } 被再次转义为 \\{ \\} 而损坏。与前端
    src/lib/writespace/latex-gen.ts 的 latexEscape 保持一致。
    """
    if text is None:
        return ""
    s = str(text)
    out = []
    for ch in s:
        out.append(_LATEX_MAP.get(ch, ch))
    return "".join(out)


def bibtex_escape(text):
    """BibTeX 字段转义：仅处理大括号、%、&、# 与反斜杠，保留 LaTeX 命令与数学。"""
    if text is None:
        return ""
    s = str(text)
    # 单遍扫描，避免 \\textbackslash{} 中的大括号被二次转义（与前端保持一致）。
    mapping = {
        "\\": "\\textbackslash{}",
        "{": "\\{",
        "}": "\\}",
        "%": "\\%",
        "&": "\\&",
        "#": "\\#",
    }
    out = []
    for ch in s:
        out.append(mapping.get(ch, ch))
    return "".join(out)


# ----------------------------------------------------------------------------
# 字段路径豁免（passthrough）
# ----------------------------------------------------------------------------
def _resolve_path(data, dotted):
    """按 'a.b.0.c' 路径从 data 取值，找不到返回 None。"""
    cur = data
    for part in dotted.split("."):
        if isinstance(cur, list):
            try:
                cur = cur[int(part)]
                continue
            except (ValueError, IndexError):
                return None
        if isinstance(cur, dict) and part in cur:
            cur = cur[part]
        else:
            return None
    return cur


def is_passthrough(paper_root, dotted, passthrough_list):
    """判断某字段路径是否豁免转义。passthrough 列表以 paper.* 或根字段给出。"""
    if not passthrough_list:
        return False
    # 归一化：用户写 "paper.abstract" 或 "abstract" 都接受
    for p in passthrough_list:
        if p == dotted or p == dotted.split(".", 1)[-1]:
            return True
    return False


def esc_field(value, dotted, paper_root, passthrough):
    """根据豁免规则决定转义与否。"""
    if is_passthrough(paper_root, dotted, passthrough):
        return "" if value is None else str(value)
    return latex_escape(value)


# ----------------------------------------------------------------------------
# 校验
# ----------------------------------------------------------------------------
def basic_validate(data):
    """不依赖 jsonschema 的基础校验，返回 (ok, errors)。"""
    errors = []
    if not isinstance(data, dict):
        return False, ["根必须是对象"]

    if "schemaVersion" not in data:
        errors.append("缺少 schemaVersion")
    elif not re.match(r"^\d+\.\d+\.\d+$", str(data["schemaVersion"])):
        errors.append("schemaVersion 格式应为 x.y.z")

    paper = data.get("paper")
    if not isinstance(paper, dict):
        errors.append("缺少 paper 对象")
    else:
        for req in ("title", "abstract", "primaryCategoryId"):
            if req not in paper or not str(paper.get(req, "")).strip():
                errors.append(f"paper.{req} 为必填")
        pid = paper.get("id")
        if pid is not None and not re.match(r"^\d{4}\.\d{5}$", str(pid)):
            errors.append("paper.id 格式应为 YYMM.NNNNN")

    authors = data.get("authors")
    if not isinstance(authors, list) or len(authors) == 0:
        errors.append("authors 至少为 1 项")
    else:
        for i, a in enumerate(authors):
            if not isinstance(a, dict) or not str(a.get("name", "")).strip():
                errors.append(f"authors[{i}].name 为必填")

    sections = data.get("sections")
    if not isinstance(sections, list) or len(sections) == 0:
        errors.append("sections 至少为 1 项")
    else:
        for i, s in enumerate(sections):
            if not isinstance(s, dict) or not str(s.get("file", "")).strip():
                errors.append(f"sections[{i}].file 为必填")

    refs = data.get("references")
    if refs is not None:
        if not isinstance(refs, list):
            errors.append("references 必须为数组")
        else:
            for i, r in enumerate(refs):
                if not isinstance(r, dict) or not str(r.get("key", "")).strip():
                    errors.append(f"references[{i}].key 为必填")

    return (len(errors) == 0), errors


def validate(data, schema_path=None):
    """优先用 jsonschema；否则基础校验。"""
    if schema_path and os.path.isfile(schema_path):
        try:
            import jsonschema  # type: ignore
            with open(schema_path, "r", encoding="utf-8") as fh:
                schema = json.load(fh)
            jsonschema.validate(instance=data, schema=schema)
            return True, []
        except ImportError:
            sys.stderr.write(
                "[warn] 未安装 jsonschema，改用内置基础校验 "
                "(pip install jsonschema 可获得严格校验)\n"
            )
        except Exception as e:  # noqa: BLE001
            return False, [f"jsonschema 校验失败: {e}"]
    return basic_validate(data)


# ----------------------------------------------------------------------------
# 片段生成
# ----------------------------------------------------------------------------
AUTOGEN_BANNER = (
    "% ============================================================\n"
    "% 本文件由 papex-build.py 自动生成，请勿手工编辑。\n"
    "% 修改请在 papex.json 中进行，随后重新构建。\n"
    "% ============================================================\n\n"
)


def _sorted_authors(authors):
    """按 order（回退数组下标）排序。"""
    decorated = []
    for i, a in enumerate(authors):
        order = a.get("order")
        key = order if isinstance(order, int) else i
        decorated.append((key, i, a))
    decorated.sort(key=lambda t: (t[0], t[1]))
    return [a for _, _, a in decorated]


def gen_meta(data, root_dir, passthrough):
    """生成 _papex_meta.tex。"""
    paper = data.get("paper", {})
    authors = _sorted_authors(data.get("authors", []))
    build = data.get("build", {}) or {}

    lines = [AUTOGEN_BANNER]

    # 标题 / 副标题
    lines.append("\\title{%s}" % esc_field(paper.get("title"), "paper.title", data, passthrough))
    if paper.get("subtitle"):
        lines.append(
            "\\papexSubtitle{%s}" % esc_field(paper["subtitle"], "paper.subtitle", data, passthrough)
        )

    # 文献编号 / 许可 / venue / DOI / 版本注记
    if paper.get("id"):
        lines.append("\\papexPaperId{%s}" % latex_escape(paper["id"]))
    lines.append("\\papexLicense{%s}" % latex_escape(paper.get("license", "CC-BY-4.0")))
    if paper.get("venue"):
        lines.append("\\papexVenue{%s}" % esc_field(paper["venue"], "paper.venue", data, passthrough))
    if paper.get("doi"):
        lines.append("\\papexDoi{%s}" % latex_escape(paper["doi"]))
    if paper.get("versionNote"):
        lines.append("\\papexVersionNote{%s}" % esc_field(paper["versionNote"], "paper.versionNote", data, passthrough))

    # 关键词
    kws = paper.get("keywords")
    if isinstance(kws, list) and kws:
        joined = "；".join(latex_escape(k) for k in kws)
        lines.append("\\papexKeywords{%s}" % joined)

    # 页眉短标题（默认取标题前 40 字符）
    running = paper.get("subject") or paper.get("title", "")
    running = latex_escape(running[:40])
    lines.append("\\papexRunningTitle{%s}" % running)

    # 作者 / 机构（authblk）
    # 先收集去重机构
    affil_map = {}
    affil_seq = []
    for a in authors:
        aff = a.get("affiliation")
        if aff:
            if aff not in affil_map:
                affil_seq.append(aff)
                affil_map[aff] = len(affil_seq)

    pdf_authors = []
    for a in authors:
        name = a.get("name", "")
        pdf_authors.append(name)
        aff = a.get("affiliation")
        aff_tag = "[%d]" % affil_map[aff] if aff else ""
        # 收集全部脚注：通讯 / 同等贡献 / 自由文本 / ORCID / 主页
        thanks = []
        if a.get("corresponding"):
            mail = a.get("email")
            thanks.append("通讯作者。Email: %s" % mail if mail else "通讯作者。")
        if a.get("equalContribution"):
            thanks.append("同等贡献。")
        if a.get("footnote"):
            thanks.append(a["footnote"])
        if a.get("orcid"):
            thanks.append("ORCID: %s" % a["orcid"])
        if a.get("homepage"):
            thanks.append("主页: %s" % a["homepage"])
        suffix = "".join("\\thanks{%s}" % latex_escape(t) for t in thanks)
        lines.append("\\author%s{%s%s}" % (aff_tag, latex_escape(name), suffix))

    # 机构定义
    for idx, aff in enumerate(affil_seq, start=1):
        lines.append("\\affil[%d]{%s}" % (idx, latex_escape(aff)))

    # PDF 作者元数据
    lines.append("\\papexPdfAuthor{%s}" % latex_escape("; ".join(pdf_authors)))

    return "\n".join(lines) + "\n"


def gen_abstract(data, passthrough):
    paper = data.get("paper", {})
    text = esc_field(paper.get("abstract", ""), "paper.abstract", data, passthrough)
    return AUTOGEN_BANNER + text + "\n"


def gen_sections(data):
    lines = [AUTOGEN_BANNER]
    for s in data.get("sections", []):
        f = s.get("file", "")
        title = s.get("title")
        level = s.get("level", "section")
        if title:
            cmd = {
                "part": r"\part",
                "chapter": r"\chapter",
                "section": r"\section",
                "subsection": r"\subsection",
                "subsubsection": r"\subsubsection",
            }.get(level, r"\section")
            lines.append("%s{%s}" % (cmd, latex_escape(title)))
        lines.append("\\input{%s}" % f.replace("\\", "/"))
    return "\n".join(lines) + "\n"


def gen_backmatter(data):
    lines = [AUTOGEN_BANNER]
    ack = data.get("acknowledgments")
    funding = data.get("funding")
    if ack:
        lines.append("\\papexAcknowledgments{%s}" % latex_escape(ack))
    if funding:
        lines.append("\\papexFunding{%s}" % latex_escape(funding))
    return "\n".join(lines) + "\n"


def gen_appendices(data):
    lines = [AUTOGEN_BANNER]
    apps = data.get("appendices")
    if apps:
        lines.append("\\appendix")
        for a in apps:
            f = a.get("file", "")
            title = a.get("title")
            if title:
                lines.append("\\section{%s}" % latex_escape(title))
            lines.append("\\input{%s}" % f.replace("\\", "/"))
    return "\n".join(lines) + "\n"


BIB_TYPE_MAP = {
    "article": "article",
    "book": "book",
    "inproceedings": "inproceedings",
    "incollection": "incollection",
    "booklet": "booklet",
    "conference": "inproceedings",
    "mastersthesis": "mastersthesis",
    "phdthesis": "phdthesis",
    "techreport": "techreport",
    "misc": "misc",
    "unpublished": "unpublished",
    "online": "online",
}

BIB_FIELDS_ORDER = [
    "author", "title", "journal", "booktitle", "editor", "publisher",
    "institution", "school", "year", "volume", "number", "pages",
    "doi", "url", "note",
]


def gen_bib(data):
    """由 references 数组生成 references.bib。"""
    refs = data.get("references") or []
    if not refs:
        return None
    out = ["% 由 papex-build.py 从 papex.json 的 references 自动生成\n"]
    for r in refs:
        key = r.get("key", "")
        btype = BIB_TYPE_MAP.get(r.get("type", "misc"), "misc")
        out.append("@%s{%s," % (btype, key))
        for fld in BIB_FIELDS_ORDER:
            val = r.get(fld)
            if val is None or str(val).strip() == "":
                continue
            out.append("  %s = {%s}," % (fld, bibtex_escape(val)))
        out.append("}\n")
    return "\n".join(out)


# ----------------------------------------------------------------------------
# 归档解包
# ----------------------------------------------------------------------------
def extract_archive(path, dest):
    """解包 .tar.gz 到 dest，返回解包后的根目录（含 papex.json 的那层）。"""
    os.makedirs(dest, exist_ok=True)
    with tarfile.open(path, "r:gz") as tf:
        # 安全检查：防止路径穿越
        for m in tf.getmembers():
            target = os.path.realpath(os.path.join(dest, m.name))
            if not target.startswith(os.path.realpath(dest)):
                raise ValueError("归档含非法路径: %s" % m.name)
        tf.extractall(dest)
    # 定位 papex.json
    if os.path.isfile(os.path.join(dest, "papex.json")):
        return dest
    # 可能在单层子目录内
    for root, _dirs, files in os.walk(dest):
        if "papex.json" in files:
            return root
    raise FileNotFoundError("归档内未找到 papex.json")


# ----------------------------------------------------------------------------
# 主流程
# ----------------------------------------------------------------------------
def find_schema(root_dir):
    """查找 papex.schema.json（优先归档内，其次脚本同级目录）。"""
    cand = [
        os.path.join(root_dir, "papex.schema.json"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "papex.schema.json"),
    ]
    for c in cand:
        if os.path.isfile(c):
            return c
    return None


def main(argv=None):
    parser = argparse.ArgumentParser(description="Papex XeLaTeX 构建器")
    parser.add_argument("path", help="目录 | papex.json | .tar.gz")
    parser.add_argument("--emit-only", action="store_true", help="只生成中间文件，不编译")
    parser.add_argument("--validate", action="store_true", help="只校验，不生成不编译")
    parser.add_argument("--out", default=None, help="输出目录（默认 papex.json 同目录）")
    parser.add_argument("--main", default="papex-template.tex", help="主文档文件名")
    parser.add_argument("--no-clean", action="store_true", help="编译后保留辅助文件")
    parser.add_argument("--quiet", action="store_true", help="减少输出")
    args = parser.parse_args(argv)

    def log(*a):
        if not args.quiet:
            print(*a)

    tmp_dir = None
    try:
        p = args.path
        if os.path.isfile(p) and p.endswith(".tar.gz"):
            tmp_dir = tempfile.mkdtemp(prefix="papex-")
            root_dir = extract_archive(p, tmp_dir)
            log("[info] 已解包归档到 %s" % root_dir)
        elif os.path.isfile(p) and p.endswith(".json"):
            root_dir = os.path.dirname(os.path.abspath(p))
        elif os.path.isdir(p):
            root_dir = p
        else:
            sys.stderr.write("无法识别的输入: %s\n" % p)
            return 2

        manifest = os.path.join(root_dir, "papex.json")
        if not os.path.isfile(manifest):
            sys.stderr.write("未找到 papex.json: %s\n" % manifest)
            return 2

        with open(manifest, "r", encoding="utf-8") as fh:
            data = json.load(fh)

        ok, errors = validate(data, find_schema(root_dir))
        if not ok:
            sys.stderr.write("校验失败:\n  - " + "\n  - ".join(errors) + "\n")
            return 1
        log("[ok] papex.json 校验通过")

        if args.validate:
            log("[done] 仅校验，结束。")
            return 0

        passthrough = (data.get("build", {}) or {}).get("passthrough", []) or []

        out_dir = args.out or root_dir
        os.makedirs(out_dir, exist_ok=True)

        # 生成片段
        meta = gen_meta(data, root_dir, passthrough)
        abstract = gen_abstract(data, passthrough)
        sections = gen_sections(data)
        backmatter = gen_backmatter(data)
        appendices = gen_appendices(data)

        _write(out_dir, "_papex_meta.tex", meta)
        _write(out_dir, "_papex_abstract.tex", abstract)
        _write(out_dir, "_papex_sections.tex", sections)
        _write(out_dir, "_papex_backmatter.tex", backmatter)
        _write(out_dir, "_papex_appendices.tex", appendices)

        bib = gen_bib(data)
        if bib is not None:
            _write(out_dir, "references.bib", bib)
        else:
            # 若归档自带 references.bib，则使用之；否则警告
            if not os.path.isfile(os.path.join(root_dir, "references.bib")):
                log("[warn] papex.json 无 references 数组，且归档无 references.bib；"
                    "正文中的 \\cite 将无法解析。")

        log("[ok] 已生成中间片段：_papex_*.tex" + (" + references.bib" if bib else ""))

        if args.emit_only:
            log("[done] --emit-only，跳过编译。")
            return 0

        # 编译
        return _compile(out_dir, args, log)

    finally:
        if tmp_dir and os.path.isdir(tmp_dir):
            shutil.rmtree(tmp_dir, ignore_errors=True)


def _write(out_dir, name, content):
    """LF 换行写入（LaTeX 跨平台兼容）。"""
    with open(os.path.join(out_dir, name), "w", encoding="utf-8", newline="\n") as fh:
        fh.write(content)


def _compile(out_dir, args, log):
    main_tex = os.path.join(out_dir, args.main)
    if not os.path.isfile(main_tex):
        sys.stderr.write("未找到主文档: %s（可用 --main 指定）\n" % main_tex)
        return 1

    latexmk = shutil.which("latexmk")
    if latexmk is None:
        sys.stderr.write(
            "[error] 未找到 latexmk / XeLaTeX。请安装 TeX Live 后重试，"
            "或仅用 --emit-only 生成中间文件。\n"
        )
        return 1

    cmd = [
        latexmk,
        "-xelatex",
        "-interaction=nonstopmode",
        "-halt-on-error" if not args.quiet else "-interaction=batchmode",
        "-outdir=%s" % out_dir,
        args.main,
    ]
    log("[info] 编译中: %s" % " ".join(cmd))
    proc = subprocess.run(cmd, cwd=out_dir, capture_output=not args.quiet, text=True)
    if proc.returncode != 0:
        sys.stderr.write("[error] 编译失败。\n")
        if args.quiet and proc.stdout:
            sys.stderr.write(proc.stdout[-4000:])
        if proc.stderr:
            sys.stderr.write(proc.stderr[-4000:])
        return 1

    pdf = os.path.join(out_dir, os.path.splitext(args.main)[0] + ".pdf")
    if os.path.isfile(pdf):
        log("[ok] 已生成 PDF: %s" % pdf)

    if not args.no_clean:
        # 清理辅助文件（保留 pdf / tex / bib / 章节源）
        _clean_aux(out_dir, keep_main=args.main)
        log("[ok] 已清理辅助文件")
    return 0


def _clean_aux(out_dir, keep_main):
    keep_ext = {".pdf", ".tex", ".bib", ".cls", ".sty"}
    for fn in os.listdir(out_dir):
        fp = os.path.join(out_dir, fn)
        if not os.path.isfile(fp):
            continue
        ext = os.path.splitext(fn)[1].lower()
        if ext in keep_ext:
            continue
        # 保留主文档与章节源（以 .tex 结尾的全部保留）
        if fn.endswith(".tex"):
            continue
        # 保留自动生成片段（用户可能需要检视）
        if fn.startswith("_papex_"):
            continue
        try:
            os.remove(fp)
        except OSError:
            pass


if __name__ == "__main__":
    sys.exit(main())
