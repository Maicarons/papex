import { getCategoryTree } from "@/lib/services/categories";
import { CategoryTree } from "@/components/category-tree";

export const revalidate = 3600;

export default async function CategoriesPage() {
  const tree = await getCategoryTree();
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">学科分类</h1>
      <CategoryTree nodes={tree} />
    </div>
  );
}
