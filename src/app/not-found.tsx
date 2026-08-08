import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container py-20 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-2 text-muted-foreground">找不到该页面。</p>
      <Button asChild className="mt-6">
        <Link href="/">返回首页</Link>
      </Button>
    </div>
  );
}
