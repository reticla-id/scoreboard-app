"use client";

import { useEffect, useId, useRef, type RefObject } from "react";

const OPEN_EVENT = "reticla:popover-open";

/** Shared dismissal behavior for non-modal menus and filter popovers. */
export function useDismissiblePopover(
  open: boolean,
  root: RefObject<HTMLElement | null>,
  close: () => void,
) {
  const id = useId();
  const closeRef = useRef(close);
  useEffect(() => { closeRef.current = close; }, [close]);

  useEffect(() => {
    if (!open) return;
    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: id }));
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) closeRef.current();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (root.current?.querySelector("dialog[open]")) return;
      event.preventDefault();
      closeRef.current();
      root.current?.querySelector<HTMLElement>("button, summary")?.focus();
    };
    const anotherOpened = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) closeRef.current();
    };
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", escape);
    window.addEventListener(OPEN_EVENT, anotherOpened);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", escape);
      window.removeEventListener(OPEN_EVENT, anotherOpened);
    };
  }, [id, open, root]);
}
