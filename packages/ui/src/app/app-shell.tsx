import * as React from "react";
import { cn } from "../lib/cn";

export interface AppShellProps {
  header?: React.ReactNode;
  bottomNav?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Responsive app shell: sticky header → scrollable main → fixed bottom nav.
 * Mobile-first (390px phone feel); content widens at md (768) / lg (1024).
 * The fixed bottom nav clears via main padding and hides on desktop.
 */
export function AppShell({
  header,
  bottomNav,
  children,
  className,
}: AppShellProps) {
  return (
    <div className={cn("flex min-h-screen flex-col bg-surface-alt", className)}>
      {header}
      <main className="flex-1 pb-24 lg:pb-10">
        <div className="mx-auto w-full max-w-md md:max-w-3xl lg:max-w-6xl">
          {children}
        </div>
      </main>
      {bottomNav}
    </div>
  );
}
