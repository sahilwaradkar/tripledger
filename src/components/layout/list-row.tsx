import Link from "next/link";
import { cn } from "@/lib/utils";

export function ListRow({
  href,
  onClick,
  children,
  className,
}: {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const classes = cn(
    "flex items-center gap-3 border-b border-border bg-surface px-3 py-3 last:border-b-0",
    (href || onClick) && "transition hover:bg-background active:bg-background",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" className={cn(classes, "w-full text-left")} onClick={onClick}>
        {children}
      </button>
    );
  }

  return <div className={classes}>{children}</div>;
}

export function ListRowAvatar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent">
      {children}
    </div>
  );
}
