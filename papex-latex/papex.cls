% papex.cls -- Papex 学术论文文档类（XeLaTeX）
%
% 设计目标：
%   1. 中英混排（基于 ctex，默认 fandol 字体集，服务端 TeX Live 可移植编译）。
%   2. 作者 / 机构块（authblk：多作者共享机构、通讯作者、equal-contribution 脚注）。
%   3. 参考文献（biblatex + biber；支持 numeric / authoryear）。
%   4. 元数据宏：文献编号、副标题、关键词、许可、venue、DOI —— 由构建器从 papex.json 注入。
%   5. 页眉页脚：文献编号 + 简短标题 + 许可声明。
%
%
% 编译：xelatex -> biber -> xelatex -> xelatex
%
\ProvidesClass{papex}[2026/08/08 v1.0.0 Papex academic paper class (XeLaTeX)]
\NeedsTeXFormat{LaTeX2e}

% ---------- 选项 ----------
\newif\if@papex@twocolumn
\DeclareOption{twocolumn}{\@papex@twocolumntrue}

% 字体集（默认 fandol，TeX Live 自带，跨平台可移植；本地可调 windows/mac/ubuntu/nofonts）
\newcommand{\papex@fontset}{fandol}
\DeclareOption{fontset}{\renewcommand{\papex@fontset}{#1}}

% 参考文献样式
\newcommand{\papex@bibstyle}{numeric}
\DeclareOption{bibstyle}{\renewcommand{\papex@bibstyle}{#1}}

% 其余未知选项透传给底层 article 类
\DeclareOption*{\PassOptionsToClass{\CurrentOption}{article}}
\ProcessOptions\relax

% 底层基类
\def\papex@colopt{}
\if@papex@twocolumn\def\papex@colopt{twocolumn}\fi
\LoadClass[a4paper,11pt,\papex@colopt]{article}

% ---------- 基础包 ----------
\RequirePackage[fontset=\papex@fontset,scheme=plain]{ctex} % 中英混排 + 字体管理
\RequirePackage{authblk}        % 作者 / 机构块
\RequirePackage{etoolbox}       % 钩子（AtEndEnvironment 等）
\RequirePackage{xcolor}         % 颜色
\RequirePackage{geometry}       % 页面尺寸
\RequirePackage{fancyhdr}       % 页眉页脚
\RequirePackage{graphicx}       % 插图
\RequirePackage{booktabs}       % 三线表
\RequirePackage{amsmath,amssymb,amsthm} % 数学
\RequirePackage{enumitem}       % 列表微调
\RequirePackage{microtype}      % 字距优化（XeLaTeX 下部分功能受限，但安全）

% 参考文献引擎
\RequirePackage[backend=biber,style=\papex@bibstyle,sorting=none,
                giveninits=true,terseinits=true]{biblatex}

% hyperref 放最后（CJK 书签）
\RequirePackage{hyperref}

% ---------- 品牌色 ----------
\definecolor{papexblue}{RGB}{29,78,137}      % 主色：沉稳靛蓝
\definecolor{papexgrey}{RGB}{110,116,124}    % 次要文字
\definecolor{papexline}{RGB}{200,205,212}    % 分隔线

% ---------- 页面几何（可被主文档 \geometry{} 覆盖） ----------
\geometry{margin=2.5cm,headheight=15pt}

% ---------- 元数据存储宏（由构建器注入） ----------
\newcommand{\papex@paperid}{}
\newcommand{\papexPaperId}[1]{\renewcommand{\papex@paperid}{#1}}

\newcommand{\papex@subtitle}{}
\newcommand{\papexSubtitle}[1]{\renewcommand{\papex@subtitle}{#1}}

\newcommand{\papex@venue}{}
\newcommand{\papexVenue}[1]{\renewcommand{\papex@venue}{#1}}

\newcommand{\papex@doi}{}
\newcommand{\papexDoi}[1]{\renewcommand{\papex@doi}{#1}}

\newcommand{\papex@versionnote}{}
\newcommand{\papexVersionNote}[1]{\renewcommand{\papex@versionnote}{#1}}

\newcommand{\papex@keywords}{}
\newcommand{\papexKeywords}[1]{\renewcommand{\papex@keywords}{#1}}

\newcommand{\papex@license}{CC-BY-4.0}
\newcommand{\papexLicense}[1]{\renewcommand{\papex@license}{#1}}

\newcommand{\papex@runningtitle}{}
\newcommand{\papexRunningTitle}[1]{\renewcommand{\papex@runningtitle}{#1}}

\newcommand{\papex@pdfauthor}{}
\newcommand{\papexPdfAuthor}[1]{\renewcommand{\papex@pdfauthor}{#1}}

% ---------- 标题块（包装 authblk 的 \maketitle） ----------
% authblk 在 \RequirePackage{authblk} 时已重定义 \maketitle，此处先保存其版本，
% 再包装：在它之前渲染「文献编号」，在它之后渲染副标题 / venue / DOI / 版本注记。
\let\papex@authblk@maketitle\maketitle
\renewcommand{\maketitle}{%
  % —— 文献编号（标题之上）——
  \ifx\papex@paperid\@empty\else
    \noindent{\small\sffamily\color{papexblue}%
      \textbf{文献编号：}\papex@paperid}\par\vspace{0.6em}%
  \fi
  % —— authblk 渲染 标题 + 作者 + 机构 ——
  \papex@authblk@maketitle
  % —— 副标题（作者之下）——
  \ifx\papex@subtitle\@empty\else
    \par\medskip\centering{\large\papex@subtitle}\par%
  \fi
  % —— venue（会议 / 期刊）——
  \ifx\papex@venue\@empty\else
    \par\smallskip\centering{\itshape\papex@venue}\par%
  \fi
  % —— DOI ——
  \ifx\papex@doi\@empty\else
    \par\smallskip\centering{\small\sffamily\color{papexgrey}%
      DOI:~\href{https://doi.org/\papex@doi}{\papex@doi}}\par%
  \fi
  % —— 版本注记 ——
  \ifx\papex@versionnote\@empty\else
    \par\smallskip\centering{\small\itshape\color{papexgrey}\papex@versionnote}\par%
  \fi
  \par\vspace{1.2em}%
}

% ---------- 关键词环境钩子 ----------
% 在 abstract 环境结束后追加关键词行。
\AtEndEnvironment{abstract}{%
  \ifx\papex@keywords\@empty\else
    \par\medskip\noindent{\textbf{\sffamily 关键词：}\papex@keywords}%
  \fi
}

% ---------- 致谢 / 基金（由生成器注入到 _papex_backmatter.tex） ----------
% 提供便捷命令，生成器亦可手写 \section*。
\newcommand{\papexAcknowledgments}[1]{%
  \section*{致谢}%
  #1%
}
\newcommand{\papexFunding}[1]{%
  \paragraph*{基金资助} #1%
}

% ---------- 页眉页脚 ----------
\pagestyle{fancy}
\fancyhf{}
\renewcommand{\headrulewidth}{0.4pt}
\renewcommand{\footrulewidth}{0.4pt}
\renewcommand{\headrule}{\hbox to\headwidth{\color{papexline}\leaders\hrule height \headrulewidth\hfill}}
\renewcommand{\footrule}{\hbox to\headwidth{\color{papexline}\leaders\hrule height \footrulewidth\hfill}}
\fancyhead[L]{\small\sffamily\color{papexgrey}\papex@paperid}
\fancyhead[R]{\small\sffamily\color{papexgrey}%
  \ifx\papex@runningtitle\@empty\papex@paperid\else\papex@runningtitle\fi}
\fancyfoot[C]{\small\sffamily\color{papexgrey}\papex@license\hfill 第 \thepage\ 页}

% 标题页也用相同页眉页脚
\fancypagestyle{plain}{%
  \fancyhf{}%
  \renewcommand{\headrulewidth}{0.4pt}%
  \renewcommand{\footrulewidth}{0.4pt}%
  \fancyhead[L]{\small\sffamily\color{papexgrey}\papex@paperid}%
  \fancyhead[R]{\small\sffamily\color{papexgrey}%
    \ifx\papex@runningtitle\@empty\papex@paperid\else\papex@runningtitle\fi}%
  \fancyfoot[C]{\small\sffamily\color{papexgrey}\papex@license\hfill 第 \thepage\ 页}%
}

% ---------- authblk 样式微调 ----------
\renewcommand{\Authfont}{\normalsize\sffamily}
\renewcommand{\Affilfont}{\small\itshape\color{papexgrey}}
\setlength{\affilsep}{0.6em}

% ---------- 章节标题样式 ----------
\ctexset{
  section={
    format={\large\bfseries\sffamily\color{papexblue}},
    beforeskip={1.4em plus 0.2em minus 0.1em},
    afterskip={0.8em plus 0.1em},
  },
  subsection={
    format={\normalsize\bfseries\sffamily\color{papexblue}},
    beforeskip={1.1em plus 0.15em minus 0.1em},
    afterskip={0.6em plus 0.1em},
  },
  subsubsection={
    format={\normalsize\bfseries\sffamily},
    beforeskip={1em plus 0.1em},
    afterskip={0.4em},
  },
}

% ---------- PDF 元数据（begin document 时 title/authors 仍可用） ----------
\AtBeginDocument{%
  \hypersetup{
    colorlinks=true,
    linkcolor=papexblue,
    citecolor=papexblue,
    urlcolor=papexblue,
    bookmarksnumbered=true,
    pdftitle={\@title},
    pdfauthor={\papex@pdfauthor},
    pdfkeywords={\papex@keywords},
  }%
}

% ---------- 引用命令别名（更语义化） ----------
\let\citeauthoryear\parencite
\newcommand{\citep}[1]{\parencite{#1}}
\newcommand{\citet}[1]{\textcite{#1}}

\endinput
