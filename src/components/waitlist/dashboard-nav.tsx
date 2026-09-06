import Link from "next/link";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/waitlist/sign-out-button";

export type DashboardNavProps = {
  userEmail?: string;
  showAdmin?: boolean;
  active?: "dashboard" | "admin";
  className?: string;
};

export function DashboardNav({
  userEmail,
  showAdmin = false,
  active = "dashboard",
  className,
}: DashboardNavProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between pl-4 pr-14 sm:pl-6 sm:pr-16">
        {/* Left: brand */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            W
          </span>
          <span className="hidden sm:inline">Smart Waitlist</span>
        </Link>

        {/* Right: actions */}
        <nav className="flex items-center gap-1.5 sm:gap-2">
          <Button
            asChild
            variant={active === "dashboard" ? "secondary" : "ghost"}
            size="sm"
          >
            <Link href="/dashboard">Dashboard</Link>
          </Button>

          {showAdmin ? (
            <Button
              asChild
              variant={active === "admin" ? "secondary" : "ghost"}
              size="sm"
            >
              <Link href="/admin">Admin</Link>
            </Button>
          ) : null}

          {userEmail ? (
            <span
              className="hidden max-w-[200px] truncate text-xs text-muted-foreground sm:inline"
              title={userEmail}
            >
              {userEmail}
            </span>
          ) : null}

          <SignOutButton iconOnly label="Sign out" />
        </nav>
      </div>
    </header>
  );
}
