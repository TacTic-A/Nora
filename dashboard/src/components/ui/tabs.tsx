import type * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "lib/cn"
import { Tabs as TabsPrimitive } from "radix-ui"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-[orientation=horizontal]:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-xl p-1 text-[#8b949e] group-data-[orientation=horizontal]/tabs:h-9 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=line]:rounded-none data-[variant=line]:border-b data-[variant=line]:border-white/[0.08]",
  {
    variants: {
      variant: {
        default: "bg-[var(--nora-panel-surface)] border border-[var(--nora-panel-border)]",
        line: "gap-2 bg-transparent p-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-2px)] flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-sm font-medium whitespace-nowrap text-[var(--nora-panel-text-muted)] transition-all group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-[var(--nora-panel-text)] focus-visible:ring-2 focus-visible:ring-[var(--nora-panel-accent)] focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:text-[var(--nora-panel-text)]",
        "group-data-[variant=default]/tabs-list:data-[state=active]:bg-[var(--nora-panel-elevated)] group-data-[variant=default]/tabs-list:data-[state=active]:text-[var(--nora-panel-text)] group-data-[variant=default]/tabs-list:data-[state=active]:border-[var(--nora-panel-border)] group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm",
        "data-[state=active]:text-[var(--nora-panel-text)]",
        "after:absolute after:bg-[var(--nora-panel-accent)] after:opacity-0 after:shadow-[0_0_8px_color-mix(in_srgb,var(--nora-panel-accent)_60%,transparent)] after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-1 group-data-[orientation=horizontal]/tabs:after:bottom-[-2px] group-data-[orientation=horizontal]/tabs:after:h-[2px] group-data-[orientation=horizontal]/tabs:after:rounded-full group-data-[orientation=vertical]/tabs:after:inset-y-1 group-data-[orientation=vertical]/tabs:after:-end-[2px] group-data-[orientation=vertical]/tabs:after:w-[2px] group-data-[orientation=vertical]/tabs:after:rounded-full group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
