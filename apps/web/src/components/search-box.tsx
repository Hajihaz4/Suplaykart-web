"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { SearchHeader } from "@suplaykart/ui";

/** Client search input that pushes a debounced `?q=` to the URL (server search). */
export function SearchBox({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [q, setQ] = React.useState(initialQuery);
  const first = React.useRef(true);

  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      const query = q.trim();
      router.replace(query ? `/search?q=${encodeURIComponent(query)}` : "/search", {
        scroll: false,
      });
    }, 300);
    return () => clearTimeout(t);
  }, [q, router]);

  return (
    <SearchHeader
      value={q}
      onValueChange={setQ}
      onBack={() => router.back()}
      autoFocus
    />
  );
}
