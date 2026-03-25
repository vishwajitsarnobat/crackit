/**
 * Textarea UI Component
 * A stylized wrapper around the native HTML textarea element.
 */

import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-2xl border border-secondary/12 bg-white/65 px-3 py-2 text-base text-foreground shadow-[0_8px_24px_rgba(74,106,71,0.05)] transition-[color,box-shadow,background-color] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-white/[0.04] md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
