import { useMemo, useRef } from 'react';

// Task: "input transaksi di pc/desktop, gak bisa geser untuk memilih
// kategori" — the category chip row (and similar horizontally-scrolling
// rows like the pockets carousel) only supports touch/trackpad swipe
// (`overflow-x-auto`), which a plain mouse simply cannot drive: there's no
// visible scrollbar (`no-scrollbar`) and a normal mouse wheel only ever
// reports vertical delta. This hook adds the two things a mouse needs:
//   1. Click-and-drag scrolling (mousedown + move + up), the desktop
//      equivalent of a touch swipe.
//   2. Redirecting a plain vertical mouse-wheel scroll into horizontal
//      movement while hovering the row, since there's nothing to scroll
//      vertically inside it anyway.
// Spread the returned `handlers` onto the SAME element that has
// `overflow-x-auto` (the actual scrollable container), not a wrapper.
export function useHorizontalDragScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const state = useRef({ isDown: false, hasDragged: false, startX: 0, startScrollLeft: 0 });

  const handlers = useMemo(() => ({
    ref,
    onMouseDown: (e: React.MouseEvent<T>) => {
      // Only the primary mouse button starts a drag — never interferes with
      // right-click/middle-click, and never triggers for touch (touch
      // already scrolls natively via overflow-x-auto, untouched by this).
      if (e.button !== 0 || !ref.current) return;
      state.current.isDown = true;
      state.current.hasDragged = false;
      state.current.startX = e.clientX;
      state.current.startScrollLeft = ref.current.scrollLeft;
    },
    onMouseMove: (e: React.MouseEvent<T>) => {
      if (!state.current.isDown || !ref.current) return;
      const delta = e.clientX - state.current.startX;
      // Small threshold before counting this as a real drag (vs. a click
      // with a tiny hand tremor) — below it, the click below is left alone.
      if (Math.abs(delta) > 4) {
        state.current.hasDragged = true;
        ref.current.scrollLeft = state.current.startScrollLeft - delta;
      }
    },
    onMouseUp: (e: React.MouseEvent<T>) => {
      if (state.current.hasDragged) {
        // A real drag just happened — the upcoming native `click` (fired
        // right after mouseup on whatever chip the cursor lands on) must be
        // swallowed, or releasing the drag over a category chip would
        // silently select it. One-shot capture-phase listener, removes
        // itself immediately after firing once.
        const el = ref.current;
        const suppressNextClick = (ev: MouseEvent) => {
          ev.preventDefault();
          ev.stopPropagation();
          el?.removeEventListener('click', suppressNextClick, true);
        };
        el?.addEventListener('click', suppressNextClick, true);
      }
      state.current.isDown = false;
    },
    onMouseLeave: () => {
      state.current.isDown = false;
    },
    onWheel: (e: React.WheelEvent<T>) => {
      if (!ref.current || e.deltaY === 0) return;
      // Nothing to scroll vertically inside a `flex` row — redirect a plain
      // mouse-wheel's vertical delta into horizontal movement instead of
      // doing nothing (the default when a normal wheel meets a
      // horizontal-only overflow container).
      ref.current.scrollLeft += e.deltaY;
      e.preventDefault();
    },
  }), []);

  return handlers;
}
