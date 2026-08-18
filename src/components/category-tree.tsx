import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { CategoryNode } from "@/lib/services/categories";
import { CategoryName } from "@/components/category-name";

export function CategoryTree({ nodes, depth = 0 }: { nodes: CategoryNode[]; depth?: number }) {
  return (
    <ul className={depth === 0 ? "space-y-1" : "ml-4 space-y-1 border-l pl-3"}>
      {nodes.map((node) => (
        <li key={node.id}>
          <div className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <Link
              href={`/categories/${node.id}`}
              className="rounded px-1 py-0.5 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              <span className="font-mono text-xs text-muted-foreground">{node.id}</span>{" "}
              <CategoryName id={node.id} name={node.name} nameZh={node.nameZh} />
            </Link>
          </div>
          {node.children.length > 0 && <CategoryTree nodes={node.children} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  );
}
