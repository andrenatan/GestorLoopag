import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Staggered entrance for glass panes.
 *
 * When a page mounts, every top-level pane inside the scope (`.glass`,
 * `.glass-strong`, `.bg-card`, Card, or anything marked `data-reveal`) fades in
 * and rises, ordered by on-screen position (row by row, left to right). Panes
 * that mount shortly after (data arriving, loading skeleton swapped for
 * content) join the sequence. The animation runs on the pane itself — never on
 * a wrapper — so its backdrop blur keeps sampling the page while it fades.
 *
 * Opt out per element with `data-no-reveal`. Disabled under
 * prefers-reduced-motion (CSS + JS).
 */

const PANE_SELECTOR =
  "[data-reveal], .glass, .glass-strong, .glass-card, .glassmorphism, .bg-card";
const STEP_MS = 65;
const MAX_STEPS = 10;
const LATE_WINDOW_MS = 4000;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

function collectPanes(root: HTMLElement, from: Element, seen: WeakSet<Element>) {
  const candidates: HTMLElement[] = [];
  const pool: Element[] = from.matches?.(PANE_SELECTOR) ? [from] : [];
  pool.push(...Array.from(from.querySelectorAll(PANE_SELECTOR)));

  for (const el of pool) {
    if (!(el instanceof HTMLElement) || seen.has(el)) continue;
    if (el.closest("[data-no-reveal]")) continue;
    // Only top-level panes: skip anything nested in another pane of this scope.
    const parentPane = el.parentElement?.closest(PANE_SELECTOR);
    if (parentPane && root.contains(parentPane)) continue;
    candidates.push(el);
  }
  return candidates;
}

function play(panes: HTMLElement[], seen: WeakSet<Element>) {
  const viewportBottom = window.innerHeight;
  const ordered = panes
    .map((el) => ({ el, rect: el.getBoundingClientRect() }))
    .sort((a, b) => Math.round(a.rect.top / 24) - Math.round(b.rect.top / 24) || a.rect.left - b.rect.left);

  let step = 0;
  for (const { el, rect } of ordered) {
    seen.add(el);
    // Panes far below the fold simply appear; no one would see them animate.
    if (rect.top > viewportBottom + 200) continue;
    el.style.setProperty("--reveal-delay", `${Math.min(step, MAX_STEPS) * STEP_MS}ms`);
    el.classList.add("reveal-run");
    step += 1;
    const done = () => {
      el.classList.remove("reveal-run");
      el.style.removeProperty("--reveal-delay");
      el.removeEventListener("animationend", onEnd);
    };
    const onEnd = (event: AnimationEvent) => {
      if (event.target === el && event.animationName === "pane-rise") done();
    };
    el.addEventListener("animationend", onEnd);
  }
}

export function RevealScope({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || prefersReducedMotion()) return;

    const seen = new WeakSet<Element>();
    play(collectPanes(root, root, seen), seen);

    let queued: HTMLElement[] = [];
    let frame = 0;
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) queued.push(...collectPanes(root, node, seen));
        });
      }
      if (queued.length && !frame) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          const batch = queued.filter((el) => el.isConnected);
          queued = [];
          play(batch, seen);
        });
      }
    });
    observer.observe(root, { childList: true, subtree: true });
    const stop = window.setTimeout(() => observer.disconnect(), LATE_WINDOW_MS);

    return () => {
      observer.disconnect();
      window.clearTimeout(stop);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} className={cn("contents", className)}>
      {children}
    </div>
  );
}
