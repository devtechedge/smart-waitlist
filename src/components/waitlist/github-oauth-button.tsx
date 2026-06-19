"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type GitHubOAuthButtonProps = {
  refCode?: string;
  redirectPath?: string;
  label?: "continue" | "signup" | "signin";
  className?: string;
};

export function GitHubOAuthButton({ refCode, redirectPath = "/dashboard", label = "continue", className }: GitHubOAuthButtonProps) {
  const [isPending, setIsPending] = React.useState(false);
  const supabase = createSupabaseBrowserClient();

  const labelText = label === "signup" ? "Sign up with GitHub" : label === "signin" ? "Sign in with GitHub" : "Continue with GitHub";

  async function handleClick() {
    setIsPending(true);
    try {
      await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectPath)}${refCode ? `&ref=${encodeURIComponent(refCode)}` : ""}`,
        },
      });
      setIsPending(false);
    } catch (err) {
      console.error("[GitHubOAuthButton] OAuth error", err);
      setIsPending(false);
    }
  }

  return (
    <Button type="button" variant="outline" className={cn("w-full gap-2", className)} onClick={handleClick} disabled={isPending}>
      {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <GitHubIcon className="size-4" aria-hidden />}
      {labelText}
    </Button>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}
