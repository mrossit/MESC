import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border-[0.5px] px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-neutral-border bg-neutral-badgeWarm text-neutral-textDark hover:shadow-sm",
        secondary:
          "border-neutral-border bg-neutral-badgeNeutral text-neutral-textDark hover:shadow-sm",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border-neutral-border text-foreground hover:bg-neutral-whiteBeige",
        pearl:
          "border-neutral-border bg-neutral-badgeLight text-neutral-textDark hover:shadow-sm",
        gold:
          "border-neutral-border bg-neutral-badgeWarm text-neutral-textDark hover:shadow-sm",
        copper:
          "border-neutral-border bg-neutral-badgeSoft text-neutral-textMedium hover:shadow-sm",
        terracotta:
          "border-neutral-border bg-neutral-accentWarm text-neutral-cream hover:shadow-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
