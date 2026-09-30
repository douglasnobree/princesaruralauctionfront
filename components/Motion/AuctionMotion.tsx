"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const surfaces = "section, article, form, [data-pr-reveal]";

/** Progressive enhancement: content stays visible and actionable without JavaScript. */
export function AuctionMotion() {
  const pathname = usePathname();

  useEffect(() => {
    // Broadcast graphics have their own animation/timing and transparent canvas.
    if (pathname.startsWith("/broadcast/")) return;
    const main = document.querySelector("body > main");
    if (!main || !Element.prototype.animate) return;

    document.body.dataset.prMotion = "on";
    const operational = pathname.startsWith("/admin");
    const observed = new WeakSet<Element>();
    const animations = new Set<Animation>();
    let printing = false;

    function play(element: Element, frames: Keyframe[], options: KeyframeAnimationOptions) {
      if (printing || document.hidden) return;
      const animation = element.animate(frames, options);
      animations.add(animation);
      animation.finished.then(() => animations.delete(animation)).catch(() => animations.delete(animation));
    }

    play(main, [{ opacity: .72 }, { opacity: 1 }], { duration: operational ? 180 : 360, easing: "ease-out" });

    const reveal = new IntersectionObserver((entries) => {
      let index = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        reveal.unobserve(entry.target);
        // Don't move a form/control that someone is already using.
        if (entry.target.contains(document.activeElement)) continue;
        play(entry.target, operational
          ? [{ opacity: .65 }, { opacity: 1 }]
          : [{ opacity: .5, transform: "translateY(22px)" }, { opacity: 1, transform: "translateY(0)" }], {
          duration: operational ? 220 : 650,
          delay: operational ? 0 : Math.min(index++ * 65, 195),
          easing: "cubic-bezier(.16, 1, .3, 1)",
        });
      }
    }, { threshold: .08 });

    const loops = new IntersectionObserver((entries) => {
      for (const entry of entries) (entry.target as HTMLElement).dataset.prVisible = String(entry.isIntersecting);
    });

    function discover(root: Element) {
      const candidates = [...(root.matches(surfaces) ? [root] : []), ...root.querySelectorAll(surfaces)];
      for (const element of candidates) {
        if (observed.has(element) || element.closest('[data-slot="dialog-content"], .broadcast-page')) continue;
        // Animate the outer surface only, avoiding compounded movement in nested panels.
        const card = element.matches(".pr-auction-card");
        if (!card && (element.parentElement?.closest(surfaces) || element.querySelector(".pr-auction-card"))) continue;
        observed.add(element);
        reveal.observe(element);
      }
      const looping = [...(root.matches("[data-pr-loop]") ? [root] : []), ...root.querySelectorAll("[data-pr-loop]")];
      for (const element of looping) loops.observe(element);
    }

    discover(main);
    const changes = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.removedNodes) if (node instanceof Element) {
          for (const element of [node, ...node.querySelectorAll(`${surfaces}, [data-pr-loop]`)]) {
            reveal.unobserve(element);
            loops.unobserve(element);
          }
        }
        for (const node of record.addedNodes) if (node instanceof Element) discover(node);
      }
    });
    changes.observe(main, { childList: true, subtree: true });

    function acknowledge(event: MouseEvent) {
      const element = event.target instanceof Element ? event.target.closest('button:not(:disabled), a, summary') : null;
      if (!element || element.closest('[aria-disabled="true"], .broadcast-page')) return;
      // Color feedback keeps operational hit targets in the same place.
      play(element, [{ filter: "brightness(1)" }, { filter: "brightness(1.16)" }, { filter: "brightness(1)" }], { duration: 260 });
    }

    function visibility() {
      document.body.dataset.prHidden = String(document.hidden);
      if (document.hidden) for (const animation of animations) animation.finish();
    }

    function beforePrint() {
      printing = true;
      for (const animation of animations) animation.finish();
    }
    function afterPrint() { printing = false; }

    document.addEventListener("click", acknowledge);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);
    visibility();

    return () => {
      reveal.disconnect();
      loops.disconnect();
      changes.disconnect();
      document.removeEventListener("click", acknowledge);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
      for (const animation of animations) animation.cancel();
      delete document.body.dataset.prMotion;
      delete document.body.dataset.prHidden;
    };
  }, [pathname]);

  return null;
}
