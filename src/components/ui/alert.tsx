import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative grid w-full grid-cols-[auto_1fr] items-start gap-x-3 rounded-xl border px-4 py-3 text-sm [&>svg]:mt-0.5 [&>svg]:size-4",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-card-foreground",
        info: "border-primary/25 bg-primary/[0.06] text-foreground [&>svg]:text-primary",
        warning: "border-amber-500/25 bg-amber-500/8 text-foreground [&>svg]:text-amber-600",
        destructive: "border-brand-coral/30 bg-brand-coral/[0.07] text-foreground [&>svg]:text-brand-coral-deep",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Alert({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("col-start-2 font-medium leading-none", className)} {...props} />;
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("col-start-2 mt-1 text-xs leading-relaxed text-muted-foreground", className)} {...props} />;
}

export { Alert, AlertTitle, AlertDescription };
