import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border-[0.5px] border-neutral-border bg-input px-3 py-2 text-sm font-normal ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-neutral-peanut focus-visible:ring-2 focus-visible:ring-neutral-peanut focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 dark:border-dark-4 dark:bg-dark-6 dark:text-text-light dark:placeholder:text-gray-400 dark:focus-visible:border-text-gold dark:focus-visible:ring-text-gold",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
