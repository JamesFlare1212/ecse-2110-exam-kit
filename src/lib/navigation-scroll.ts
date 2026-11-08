type SwapEvent = { swap: () => void };
type ScrollContainer = Pick<HTMLElement, 'scrollTop' | 'scrollLeft' | 'isConnected'>;

/** Keep a persistent navigation scroller stable across Astro's body replacement, before paint. */
export function preserveNavigationScroll(event: SwapEvent, scroller: ScrollContainer) {
  const swap = event.swap;
  event.swap = () => {
    // Capture at the actual swap, not while the destination is still loading.
    const {scrollTop, scrollLeft} = scroller;
    swap.call(event);
    if (scroller.isConnected) {
      scroller.scrollTop = scrollTop;
      scroller.scrollLeft = scrollLeft;
    }
  };
}
