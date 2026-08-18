import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";

export async function listCategories() {
  return db.select().from(categories).orderBy(asc(categories.id));
}

export async function getCategory(slug: string) {
  const [cat] = await db.select().from(categories).where(eq(categories.id, slug));
  return cat ?? null;
}

/** All category ids — used by `generateStaticParams` for the category pages. */
export async function getAllCategorySlugs(): Promise<{ slug: string }[]> {
  return db.select({ slug: categories.id }).from(categories);
}

export interface CategoryNode {
  id: string;
  name: string;
  description: string | null;
  /** Simplified-Chinese translation of `name`. Null when not yet translated. */
  nameZh: string | null;
  /** Simplified-Chinese translation of `description`. Null when not yet translated. */
  descriptionZh: string | null;
  children: CategoryNode[];
}

export async function getCategoryTree(): Promise<CategoryNode[]> {
  const all = await listCategories();
  const map = new Map<string, CategoryNode>();
  for (const c of all) {
    map.set(c.id, {
      id: c.id,
      name: c.name,
      description: c.description,
      nameZh: c.nameZh ?? null,
      descriptionZh: c.descriptionZh ?? null,
      children: [],
    });
  }
  const roots: CategoryNode[] = [];
  for (const c of all) {
    const node = map.get(c.id)!;
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

// Re-export the client-safe localize helpers so server-side callers can resolve
// category names/descriptions from the same source of truth.
export {
  localizeCategoryName,
  localizeCategoryDescription,
} from "@/lib/category-i18n";
