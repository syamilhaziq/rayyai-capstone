import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

function Progress({
  className,
  value,
  styleColor,
  ...props
}) {
  const isFull = value >= 100;
  const fillColor = styleColor || (isFull ? "#586c75" : "#e5eff2");

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-[#a3b5b9]",
        className
      )}
      {...props}>
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "h-full w-full flex-1 transition-all"
        )}
        style={{ 
          transform: `translateX(-${100 - (value || 0)}%)`,
          backgroundColor: fillColor
        }} />
    </ProgressPrimitive.Root>
  );
}

export { Progress }