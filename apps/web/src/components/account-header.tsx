import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function AccountHeader({
  title,
  backHref = "/account",
}: {
  title: string;
  backHref?: string;
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border-light bg-surface px-4 py-3">
      <Link
        href={backHref}
        aria-label="Back"
        className="grid size-9 place-items-center rounded-full bg-surface-alt"
      >
        <ArrowLeft className="size-4 text-ink" />
      </Link>
      <span className="text-sm font-extrabold text-ink">{title}</span>
    </header>
  );
}
