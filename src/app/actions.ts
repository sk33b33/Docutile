"use server";

import { signIn, signOut } from "@/auth";
import { authEnabled, safeCallbackPath } from "@/lib/auth/config";

export async function signInWithGoogle(formData: FormData) {
  if (!authEnabled()) return;
  await signIn("google", { redirectTo: safeCallbackPath(String(formData.get("callbackUrl") ?? "/")) });
}

export async function signOutAction() {
  if (!authEnabled()) return;
  await signOut({ redirectTo: "/login" });
}
