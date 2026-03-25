/**
 * Badge UI Component
 * Provides a highly customizable badge element using class-variance-authority.
 * Used for status labels, counts, and minor highlights.
 */

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary/15 text-secondary border-primary/25 [a&]:hover:bg-primary/20 dark:text-primary",
        secondary:
          "bg-white/70 text-secondary border-secondary/10 [a&]:hover:bg-white/85 dark:bg-white/[0.05] dark:text-foreground",
        destructive:
          "bg-red-500/12 text-red-700 border-red-300/30 focus-visible:ring-destructive/20 [a&]:hover:bg-red-500/18 dark:text-red-200",
        outline:
          "border-secondary/10 text-secondary [a&]:hover:bg-primary/10 [a&]:hover:text-secondary dark:text-foreground dark:[a&]:hover:text-foreground",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
        success:
          "bg-emerald-500/12 text-emerald-700 border-emerald-300/30 dark:text-emerald-200",
        warning:
          "bg-amber-500/12 text-amber-700 border-amber-300/30 dark:text-amber-200",
        info:
          "bg-accent/12 text-secondary border-accent/30 dark:text-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
