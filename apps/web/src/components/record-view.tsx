"use client";
import * as React from "react";
import { recordViewAction } from "@/app/products/[slug]/actions";

/** Fire-and-forget recording of a product view (recently-viewed). */
export function RecordView({ slug }: { slug: string }) {
  React.useEffect(() => {
    void recordViewAction(slug);
  }, [slug]);
  return null;
}
