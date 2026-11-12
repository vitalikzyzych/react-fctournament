import { type RefObject, useEffect, useState } from "react";

/** Content width of an element, kept up to date (for SVG charts). */
export const useWidth = (ref: RefObject<HTMLElement | null>): number => {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width)
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
};
