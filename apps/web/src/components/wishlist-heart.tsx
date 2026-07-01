"use client";
import * as React from "react";
import { Heart } from "lucide-react";
import { toggleWishlistAction } from "@/app/account/wishlist/actions";

export function WishlistHeart({
  variantId,
  initial,
}: {
  variantId: string;
  initial: boolean;
}) {
  const [on, setOn] = React.useState(initial);
  const [pending, start] = React.useTransition();

  React.useEffect(() => setOn(initial), [initial]);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOn((v) => !v);
    start(async () => {
      await toggleWishlistAction(variantId);
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending || !variantId}
      aria-label={on ? "Remove from wishlist" : "Add to wishlist"}
      className="grid size-7 place-items-center rounded-full bg-surface/90 shadow-sm backdrop-blur"
    >
      <Heart
        className={`size-4 ${on ? "fill-danger text-danger" : "text-muted"}`}
      />
    </button>
  );
}
