import { z } from "zod";

/** Shared Zod primitives for auth Server Actions. */

export const emailField = z
  .string()
  .min(1, "Email is required")
  .email("Please enter a valid email address")
  .max(254, "Email is too long")
  .transform((s) => s.trim().toLowerCase());

export const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[0-9]/, "Password must contain a number");

export const fullNameField = z
  .string()
  .min(1, "Full name is required")
  .max(100, "Full name is too long")
  .transform((s) => s.trim());

export const refCodeField = z
  .string()
  .max(32, "Referral code is too long")
  .optional()
  .transform((s) => (s ? s.trim().toLowerCase() : undefined));

export const signInSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required"),
});

export const signUpSchema = z.object({
  email: emailField,
  password: passwordField,
  fullName: fullNameField,
  refCode: refCodeField,
});
