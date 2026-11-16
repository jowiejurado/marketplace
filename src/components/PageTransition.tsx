import { ViewTransition, type ReactNode } from "react";

const DIRECTIONAL = { "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" };

/**
 * Drill transition between pages: going deeper (Sell something) slides left,
 * coming back (logo, Back) slides right. Untyped navigations don't move.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={DIRECTIONAL} exit={DIRECTIONAL} default="none">
      {children}
    </ViewTransition>
  );
}
