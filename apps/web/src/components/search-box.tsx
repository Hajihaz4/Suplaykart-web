"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SearchHeader } from "@suplaykart/ui";

interface Suggestion {
  name: string;
  slug: string;
}

/** Client search input: debounced `?q=` + live product suggestions. */
export function SearchBox({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [q, setQ] = React.useState(initialQuery);
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([]);
  const [open, setOpen] = React.useState(false);
  const first = React.useRef(true);

  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const query = q.trim();
    const t = setTimeout(() => {
      router.replace(
        query ? `/search?q=${encodeURIComponent(query)}` : "/search",
        { scroll: false },
      );
      if (query.length >= 2) {
        fetch(`/api/search/suggest?q=${encodeURIComponent(query)}`)
          .then((r) => r.json())
          .then((d: { suggestions?: Suggestion[] }) => {
            setSuggestions(d.suggestions ?? []);
            setOpen(true);
          })
          .catch(() => setSuggestions([]));
      } else {
        setSuggestions([]);
        setOpen(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q, router]);

  return (
    <div className="relative">
      <SearchHeader
        value={q}
        onValueChange={setQ}
        onBack={() => router.back()}
        autoFocus
      />
      {open && suggestions.length > 0 ? (
        <ul className="absolute inset-x-2 top-full z-30 mt-1 overflow-hidden rounded-xl border border-border-light bg-surface shadow-pop">
          {suggestions.map((s) => (
            <li key={s.slug}>
              <Link
                href={`/products/${s.slug}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 border-b border-border-light px-4 py-2.5 text-sm text-ink last:border-b-0 hover:bg-surface-alt"
              >
                {s.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
