import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

function Slider({ className, "aria-label": ariaLabel, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root className={cn("relative flex w-full touch-none select-none items-center data-[disabled]:opacity-50", className)} {...props}>
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/12">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb aria-label={ariaLabel} className="block size-4 shrink-0 rounded-full border-2 border-primary bg-white shadow-sm outline-none transition-shadow hover:ring-4 hover:ring-primary/10 focus-visible:ring-4 focus-visible:ring-ring/20 disabled:pointer-events-none" />
    </SliderPrimitive.Root>
  );
}

export { Slider };
