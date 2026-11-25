import type * as React from "react";
import { cn } from "lib/cn";

export interface SectionCardProps extends React.ComponentProps<"div"> {
  /** Optional variant for background tone adjustments */
  variant?: "default" | "surface" | "subtle";
}

function SectionCard({
  className,
  variant = "default",
  ...props
}: SectionCardProps) {
  return (
    <div
      data-slot="section-card"
      className={cn(
        "rounded-xl border border-white/[0.08] p-4 transition-all duration-200",
        variant === "default" && "bg-white/[0.02]",
        variant === "surface" && "bg-[#161b22]",
        variant === "subtle" && "bg-white/[0.01]",
        className
      )}
      {...props}
    />
  );
}

export interface SectionCardHeaderProps extends React.ComponentProps<"div"> {
  icon?: React.ReactNode;
}

function SectionCardHeader({
  className,
  icon,
  children,
  ...props
}: SectionCardHeaderProps) {
  return (
    <div
      data-slot="section-card-header"
      className={cn(
        "flex items-center gap-2.5 pb-2.5 mb-3 border-b border-white/[0.06] text-xs font-semibold text-[var(--nora-panel-text)]",
        className
      )}
      {...props}
    >
      {icon}
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}

export interface SectionCardIconProps extends React.ComponentProps<"div"> {
  variant?:
    | "cyan"
    | "teal"
    | "red"
    | "amber"
    | "purple"
    | "blue"
    | "gray";
}

function SectionCardIcon({
  className,
  variant = "cyan",
  children,
  ...props
}: SectionCardIconProps) {
  const variantClass = {
    cyan: "badge-soft-cyan",
    teal: "badge-soft-teal",
    red: "badge-soft-red",
    amber: "badge-soft-amber",
    purple: "badge-soft-purple",
    blue: "badge-soft-blue",
    gray: "badge-soft-gray",
  }[variant];

  return (
    <div
      data-slot="section-card-icon"
      className={cn(
        "size-7 shrink-0 rounded-md flex items-center justify-center [&_svg]:size-4",
        variantClass,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function SectionCardTitle({
  className,
  ...props
}: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="section-card-title"
      className={cn("text-xs font-semibold text-[var(--nora-panel-text)] truncate", className)}
      {...props}
    />
  );
}

function SectionCardDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="section-card-description"
      className={cn("text-[11px] text-[#8b949e] font-normal leading-normal", className)}
      {...props}
    />
  );
}

function SectionCardContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="section-card-content"
      className={cn("space-y-3.5", className)}
      {...props}
    />
  );
}

// Compound component pattern attachment for flexible syntax
SectionCard.Root = SectionCard;
SectionCard.Header = SectionCardHeader;
SectionCard.Icon = SectionCardIcon;
SectionCard.Title = SectionCardTitle;
SectionCard.Description = SectionCardDescription;
SectionCard.Content = SectionCardContent;

export {
  SectionCard,
  SectionCardHeader,
  SectionCardIcon,
  SectionCardTitle,
  SectionCardDescription,
  SectionCardContent,
};
