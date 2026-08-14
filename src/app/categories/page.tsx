import { getCategoryTree } from "@/lib/services/categories";
import { CategoryTree } from "@/components/category-tree";
import { LocaleText } from "@/components/locale-text";

export const revalidate = 3600;

export default async function CategoriesPage() {
  // 无 DB 时回退空分类树，保证预渲染不硬失败；运行时带 DB 由 revalidate=3600 刷新。
  let tree: Awaited<ReturnType<typeof getCategoryTree>> = [];
  try {
    tree = await getCategoryTree();
  } catch {
    // 忽略：DB 不可达，使用空分类树
  }
  return (
    <div className="mx-auto max-w-2xl">
      <LocaleText path="categories.title" as="h1" className="mb-6 text-2xl font-bold" />
      <CategoryTree nodes={tree} />
    </div>
  );
}
