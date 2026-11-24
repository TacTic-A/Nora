import type * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "lib/cn"
import { Slot } from "radix-ui"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-md border border-transparent px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap transition-[color,box-shadow,border-color,background-color] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default:
          "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 rounded-md [a&]:hover:bg-cyan-500/25",
        secondary:
          "border border-white/10 bg-white/[0.05] text-[#b1bac4] rounded-md [a&]:hover:bg-white/10",
        destructive:
          "badge-soft-red rounded-md [a&]:hover:bg-red-500/20",
        outline:
          "border border-white/10 text-[#c9d1d9] rounded-md [a&]:hover:bg-white/[0.05]",
        ghost:
          "text-[#b1bac4] rounded-md [a&]:hover:bg-white/[0.05] [a&]:hover:text-white",
        link:
          "text-cyan-400 underline-offset-4 rounded-md [a&]:hover:underline",
        soft: "badge-soft-cyan rounded-md",
        "soft-cyan": "badge-soft-cyan rounded-md",
        "soft-teal": "badge-soft-teal rounded-md",
        "soft-red": "badge-soft-red rounded-md",
        "soft-amber": "badge-soft-amber rounded-md",
        "soft-purple": "badge-soft-purple rounded-md",
        "soft-blue": "badge-soft-blue rounded-md",
        "soft-gray": "badge-soft-gray rounded-md",
        cyan: "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 rounded-md",
        teal: "bg-teal-500/15 border border-teal-500/30 text-teal-400 rounded-md",
        red: "bg-red-500/15 border border-red-500/30 text-red-400 rounded-md",
        amber: "bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-md",
        purple: "bg-purple-500/15 border border-purple-500/30 text-purple-400 rounded-md",
        blue: "bg-blue-500/15 border border-blue-500/30 text-blue-400 rounded-md",
        gray: "bg-white/[0.05] border border-white/10 text-[#8b949e] rounded-md",
      },
    },
    defaultVariants: {
      variant: "secondary",
    },
  }
)

function Badge({
  className,
  variant = "secondary",
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
