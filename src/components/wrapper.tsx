import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

export const Wrapper = ({ children }: { children: ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (ref.current) {
      setHeight(ref.current.scrollHeight);
    }
  }, [children]);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setHeight(entry.contentRect.height);
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      style={{ height }}
      className="flex w-full max-w-md flex-col justify-center gap-8 overflow-hidden rounded-sm bg-[#e9e6e1] transition-[height] duration-500 ease-in-out"
    >
      <div ref={ref}>{children}</div>
    </div>
  );
};
