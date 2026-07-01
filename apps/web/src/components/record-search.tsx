"use client";
import * as React from "react";
import { recordSearchAction } from "@/app/search/actions";

export function RecordSearch({ q }: { q: string }) {
  React.useEffect(() => {
    if (q) void recordSearchAction(q);
  }, [q]);
  return null;
}
