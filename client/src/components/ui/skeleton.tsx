import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const skeletonVariants = cva(
  "animate-pulse rounded-md",
  {
    variants: {
      variant: {
        default: "bg-muted/50 dark:bg-muted/20",
        shimmer: "bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 dark:from-muted/20 dark:via-muted/10 dark:to-muted/20 bg-[length:200%_100%] animate-shimmer",
        subtle: "bg-muted/30 dark:bg-muted/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

function Skeleton({
  className,
  variant,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(skeletonVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Skeleton }
