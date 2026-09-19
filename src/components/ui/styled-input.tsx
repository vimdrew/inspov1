import { Input as InputPrimitive } from "@base-ui/react/input";
import type * as React from "react";
import { useEffect, useRef, useState } from "react";

import { cn } from "#/lib/utils.ts";

function InputStyled({
  className,
  type,
  onBlur,
  onFocus,
  ...props
}: React.ComponentProps<"input">) {
  const [active, setActive] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!inputRef) return;
    setActive(inputRef.current?.value.trim() !== "");
  }, []);

  return (
    <div className="relative w-full">
      <InputPrimitive
        type={type}
        onFocus={(e) => {
          setActive(true);
          onFocus?.(e);
        }}
        autoComplete="off"
        autoCorrect="off"
        onBlur={(e) => {
          setActive(e.target.value.trim() !== "");
          onBlur?.(e);
        }}
        data-slot="input"
        className={cn("h-12 w-full border bg-white p-2 pt-4 text-xs", className)}
        {...props}
      />
      <span
        className={`agdasima-bold pointer-events-none tracking-wider uppercase ${active ? "top-1 text-xs opacity-60" : "top-1/2 -translate-y-1/2 text-xs opacity-80"} absolute left-2 transition-all duration-100 ease-in-out`}
      >
        {props.name}
      </span>
    </div>
  );
}
export { InputStyled };
