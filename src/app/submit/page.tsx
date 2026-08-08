import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { listCategories } from "@/lib/services/categories";
import { SubmitForm } from "@/components/submit-form";
import { SourcePackageUpload } from "@/components/source-package-upload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getServerLocale } from "@/i18n/server";
import { getDictionary, t as translate } from "@/i18n";

export const dynamic = "force-dynamic";

export default async function SubmitPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const locale = await getServerLocale();
  const dict = getDictionary(locale);
  const t = (path: string) => translate(dict, path);
  const cats = await listCategories();
  const options = cats.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-2xl font-bold tracking-tight">{t("submit.title")}</h1>
      <p className="mb-6 text-muted-foreground">{t("submit.subtitle")}</p>

      <Tabs defaultValue="form" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="form">{t("submit.methodForm")}</TabsTrigger>
          <TabsTrigger value="package">{t("submit.methodPackage")}</TabsTrigger>
        </TabsList>
        <TabsContent value="form">
          <SubmitForm categories={options} />
        </TabsContent>
        <TabsContent value="package">
          <SourcePackageUpload />
        </TabsContent>
      </Tabs>
    </div>
  );
}
