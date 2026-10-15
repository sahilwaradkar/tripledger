import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200",
        secondary: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
        warning: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
        offline: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
