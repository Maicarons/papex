import Link from "next/link";
import type { CitationOut } from "@/lib/services/citations";

function truncate(s: string | null, n = 30): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

interface NodeSpec {
  key: string;
  label: string;
  href?: string;
  x: number;
  y: number;
}

const W = 760;
const NODE_W = 210;
const NODE_H = 40;
const GAP = 16;
const PAD = 12;
const COL_LEFT = PAD;
const COL_CENTER = (W - NODE_W) / 2;
const COL_RIGHT = W - NODE_W - PAD;

export function CitationGraph({
  paperId,
  paperTitle,
  outgoing,
  incoming,
}: {
  paperId: string;
  paperTitle: string;
  outgoing: CitationOut[];
  incoming: CitationOut[];
}) {
  const maxN = Math.max(outgoing.length, incoming.length, 1);
  const height = maxN * (NODE_H + GAP) + PAD * 2;
  const centerY = height / 2 - NODE_H / 2;

  const leftNodes: NodeSpec[] = incoming.map((c, i) => ({
    key: `in-${c.id}`,
    label: truncate(c.resolvedTitle) || "未知来源",
    href: `/papers/${c.paperId}`,
    x: COL_LEFT,
    y: PAD + i * (NODE_H + GAP),
  }));

  const rightNodes: NodeSpec[] = outgoing.map((c, i) => {
    const label = truncate(c.targetTitle) || c.targetArxivId || c.targetDoi || "外部文献";
    const href = c.targetPaperId
      ? `/papers/${c.targetPaperId}`
      : c.targetUrl
        ? c.targetUrl
        : undefined;
    return { key: `out-${c.id}`, label, href, x: COL_RIGHT, y: PAD + i * (NODE_H + GAP) };
  });

  const centerNode: NodeSpec = {
    key: "center",
    label: truncate(paperTitle, 26),
    href: `/papers/${paperId}`,
    x: COL_CENTER,
    y: centerY,
  };

  const edges: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (const n of leftNodes) {
    edges.push({ x1: n.x + NODE_W, y1: n.y + NODE_H / 2, x2: centerNode.x, y2: centerNode.y + NODE_H / 2 });
  }
  for (const n of rightNodes) {
    edges.push({ x1: centerNode.x + NODE_W, y1: centerNode.y + NODE_H / 2, x2: n.x, y2: n.y + NODE_H / 2 });
  }

  const renderNode = (n: NodeSpec) => {
    const inner = (
      <g>
        <rect
          x={n.x}
          y={n.y}
          width={NODE_W}
          height={NODE_H}
          rx={8}
          className="fill-card stroke-border"
          strokeWidth={1}
        />
        <text
          x={n.x + NODE_W / 2}
          y={n.y + NODE_H / 2}
          dy="0.35em"
          textAnchor="middle"
          className="fill-foreground text-[11px]"
        >
          {n.label}
        </text>
      </g>
    );
    return n.href ? (
      <Link key={n.key} href={n.href} className="hover:opacity-80">
        {inner}
      </Link>
    ) : (
      <g key={n.key}>{inner}</g>
    );
  };

  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      className="w-full"
      role="img"
      aria-label="引用关系图"
      style={{ maxHeight: 460 }}
    >
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" className="fill-muted-foreground" />
        </marker>
        <marker id="arrow-r" markerWidth="8" markerHeight="8" refX="2" refY="3" orient="auto">
          <path d="M6,0 L0,3 L6,6 Z" className="fill-muted-foreground" />
        </marker>
      </defs>
      {edges.map((e, i) => (
        <line
          key={`e-${i}`}
          x1={e.x1}
          y1={e.y1}
          x2={e.x2}
          y2={e.y2}
          className="stroke-muted-foreground/50"
          strokeWidth={1}
          markerEnd="url(#arrow)"
        />
      ))}
      {leftNodes.map(renderNode)}
      {rightNodes.map(renderNode)}
      {renderNode(centerNode)}
    </svg>
  );
}
