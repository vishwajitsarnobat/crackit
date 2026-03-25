/**
 * Button UI Component
 * Reusable button element with pre-defined variants and sizes using class-variance-authority.
 * Supports rendering as a Next.js Link via the asChild prop.
 */

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "border border-secondary/15 bg-secondary text-secondary-foreground shadow-[0_16px_36px_rgba(45,75,42,0.18)] hover:bg-secondary/90",
        destructive:
          "border border-red-300/30 bg-red-500/12 text-red-700 hover:bg-red-500/18 focus-visible:ring-destructive/20 dark:text-red-200",
        outline:
          "border border-secondary/12 bg-white/60 text-secondary shadow-[0_10px_30px_rgba(74,106,71,0.08)] hover:bg-white/85 dark:bg-white/[0.04] dark:text-foreground dark:hover:bg-white/[0.08]",
        secondary:
          "border border-primary/30 bg-primary/20 text-secondary hover:bg-primary/28 dark:text-primary",
        ghost:
          "text-secondary hover:bg-primary/10 hover:text-secondary dark:text-foreground dark:hover:bg-white/[0.06]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
