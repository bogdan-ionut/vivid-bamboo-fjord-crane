import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-semibold transition-colors transition-transform duration-(--motion-fast,250ms) ease-[cubic-bezier(0.22,1,0.36,1)] select-none disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-fg hover:bg-[#9aaa72]",
        secondary: "bg-surface-2 text-fg border border-border hover:bg-surface",
        ghost: "bg-transparent text-fg hover:bg-surface-2",
        osea: "bg-osea text-fg hover:brightness-110",
        lois: "bg-lois text-fg hover:brightness-110",
      },
      size: {
        sm: "h-9 px-3 text-sm rounded-sm",
        md: "h-11 px-5 text-base rounded-md",
        lg: "h-12 px-6 text-lg rounded-lg",
        icon: "size-11 rounded-md",
        pad: "size-14 rounded-lg",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
