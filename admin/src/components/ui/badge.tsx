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
        default: "bg-sky-500/15 text-sky-200 border-sky-400/20 [a&]:hover:bg-sky-500/20",
        secondary:
          "bg-slate-900/80 text-slate-200 border-white/10 [a&]:hover:bg-slate-800/90",
        destructive:
          "bg-red-500/15 text-red-200 border-red-400/20 focus-visible:ring-destructive/20 [a&]:hover:bg-red-500/20",
        outline:
          "border-white/10 text-slate-200 [a&]:hover:bg-white/5 [a&]:hover:text-white",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
        success:
          "bg-emerald-500/15 text-emerald-200 border-emerald-400/20",
        warning:
          "bg-amber-500/15 text-amber-200 border-amber-400/20",
        info:
          "bg-blue-500/15 text-blue-200 border-blue-400/20",
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
