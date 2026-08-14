import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LocaleText } from "@/components/locale-text";

export default function NotFound() {
  return (
    <div className="container py-20 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-2 text-muted-foreground">
        <LocaleText path="notFound.title" />
      </p>
      <Button asChild className="mt-6">
        <Link href="/">
          <LocaleText path="notFound.back" />
        </Link>
      </Button>
    </div>
  );
}
