import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transform active:scale-[0.98] border-[0.5px]",
  {
    variants: {
      variant: {
        default: "bg-neutral-neutral text-neutral-cream border-neutral-neutral shadow-sm hover:bg-neutral-textDark hover:border-neutral-textDark hover:shadow-md",
        destructive:
          "bg-destructive text-destructive-foreground border-destructive shadow-sm hover:bg-destructive/90 hover:shadow-md",
        outline:
          "border-neutral-border bg-transparent hover:bg-neutral-whiteBeige hover:border-neutral-peanut text-neutral-textDark",
        secondary:
          "bg-neutral-peanut text-neutral-whiteBeige border-neutral-peanut shadow-sm hover:bg-neutral-accentWarm hover:border-neutral-accentWarm hover:shadow-md",
        ghost: "border-transparent hover:bg-neutral-peachCream hover:text-neutral-textDark",
        link: "border-transparent text-neutral-neutral underline-offset-4 hover:underline font-medium",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
