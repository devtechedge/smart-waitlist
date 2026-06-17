"use server";

import { z } from "zod";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicAppOrigin } from "@/lib/public-env";

/**
 * Auth Server Actions
 * -------------------
 * These wrap Supabase Auth's `signInWithPassword`, `signUp`, and `signOut`.
 * Inputs are validated with Zod before being passed to Supabase.
 *
 * Form-action signature: `(prevState, formData) => Promise<ActionState>`.
 * The prevState is the previous return value (for `useFormState`), the
 * formData is the submitting form's fields.
 *
 * On success we `redirect()` (which throws internally); on failure we
 * return `{ ok: false, error }` so the UI can display the message.
 */

export type ActionState = {
  ok: boolean;
  error?: string;
  /** Field name that caused the error, for inline form feedback. */
  field?: "email" | "password" | "fullName" | "refCode" | "form";
};

/** Common Zod primitives reused across auth actions. */
const emailField = z
  .string()
  .min(1, "Email is required")
  .email("Please enter a valid email address")
  .max(254, "Email is too long")
  .transform((s) => s.trim().toLowerCase());

const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[0-9]/, "Password must contain a number");

const fullNameField = z
  .string()
  .min(1, "Full name is required")
  .max(100, "Full name is too long")
  .transform((s) => s.trim());

const refCodeField = z
  .string()
  .max(32, "Referral code is too long")
  .optional()
  .transform((s) => (s ? s.trim().toLowerCase() : undefined));

const signInSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required"),
});

const signUpSchema = z.object({
  email: emailField,
  password: passwordField,
  fullName: fullNameField,
  refCode: refCodeField,
});

/** Helper: read a FormData field as a string (or undefined). */
function getString(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  return typeof v === "string" ? v : undefined;
}

/**
 * Sign-in action. Form fields: `email`, `password`.
 *
 * Redirects to `?redirect=` query param if present, else `/dashboard`.
 */
export async function signInAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signInSchema.safeParse({
    email: getString(formData, "email"),
    password: getString(formData, "password"),
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (!issue) return { ok: false, error: "Invalid input.", field: "form" };
    return {
      ok: false,
      error: issue.message,
      field: issue.path[0] === "email" ? "email" : "password",
    };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Supabase returns a generic "Invalid login credentials" for both
    // wrong-password and unknown-email to prevent user enumeration.
    return {
      ok: false,
      error:
        error.code === "invalid_credentials"
          ? "Incorrect email or password."
          : error.message,
      field: "form",
    };
  }

  // Successful sign-in. Check for a `redirect` query param via formData.
  // (Forms include a hidden `redirect` input populated by the page.)
  const redirectPath = getString(formData, "redirect") ?? "/dashboard";
  redirect(safeRedirectPath(redirectPath));
}

/**
 * Sign-up action. Form fields: `email`, `password`, `fullName`, `refCode?`, `redirect?`.
 *
 * - Passes `fullName` and `refCode` to Supabase as `user_metadata` so the
 *   post-signup `claimOrCreateWaitlistEntryAction` can read them.
 * - If email confirmation is enabled (default in Supabase), `data.session`
 *   will be null and we redirect to `/check-email`. Otherwise we redirect
 *   to `/dashboard`.
 */
export async function signUpAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({
    email: getString(formData, "email"),
    password: getString(formData, "password"),
    fullName: getString(formData, "fullName"),
    refCode: getString(formData, "refCode"),
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (!issue) return { ok: false, error: "Invalid input.", field: "form" };
    const fieldMap: Record<string, ActionState["field"]> = {
      email: "email",
      password: "password",
      fullName: "fullName",
      refCode: "refCode",
    };
    return {
      ok: false,
      error: issue.message,
      field: fieldMap[issue.path[0] as string] ?? "form",
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        ref_code: parsed.data.refCode ?? null,
      },
      emailRedirectTo: `${publicAppOrigin()}/auth/callback`,
    },
  });

  if (error) {
    return {
      ok: false,
      error:
        error.code === "user_already_exists"
          ? "An account with this email already exists. Try signing in instead."
          : error.message,
      field: "email",
    };
  }

  // If email confirmation is enabled, `session` is null and `user` exists
  // but `user.confirmed_at` is null. Redirect to a "check your email" page.
  if (!data.session) {
    redirect("/check-email");
  }

  // Otherwise the user is immediately authenticated — go to dashboard.
  redirect("/dashboard");
}

/**
 * Sign-out action. Clears the Supabase session and redirects to `/`.
 * Called from a small client-side form (`<form action={signOutAction}>`).
 */
export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

/**
 * Defensive guard: only allow redirects to same-origin absolute paths or
 * site-relative paths starting with "/". Prevents open-redirect attacks via
 * crafted `?redirect=https://evil.com` query params.
 */
function safeRedirectPath(input: string): string {
  if (!input) return "/dashboard";

  // Reject anything with a scheme (http://, https://, //evil.com).
  if (/^\/\//.test(input) || /^[a-z][a-z0-9+.-]*:/i.test(input)) {
    return "/dashboard";
  }

  // Reject backslashes (some browsers treat them like forward slashes).
  if (input.includes("\\")) return "/dashboard";

  // Must start with a single slash.
  if (!input.startsWith("/")) return "/dashboard";

  return input;
}
