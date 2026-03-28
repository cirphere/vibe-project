"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const MAX_EMAIL_LEN = 254;
const MAX_PASSWORD_LEN = 128;
const MIN_PASSWORD_LEN = 8;

/** Basic email shape check; not full RFC coverage. */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALIDATION_ERROR = "이메일과 비밀번호를 올바르게 입력해 주세요.";

function parseCredentials(formData: FormData): { email: string; password: string } | null {
  const emailRaw = formData.get("email");
  const passwordRaw = formData.get("password");
  const email = typeof emailRaw === "string" ? emailRaw.trim() : "";
  const password = typeof passwordRaw === "string" ? passwordRaw : "";

  if (
    !email ||
    !password ||
    email.length > MAX_EMAIL_LEN ||
    password.length < MIN_PASSWORD_LEN ||
    password.length > MAX_PASSWORD_LEN ||
    !EMAIL_REGEX.test(email)
  ) {
    return null;
  }

  return { email, password };
}

export async function login(formData: FormData) {
  const parsed = parseCredentials(formData);
  if (!parsed) {
    return { error: VALIDATION_ERROR };
  }
  const { email, password } = parsed;

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    logger.error("login:auth_failed", error);
    return { error: "이메일 또는 비밀번호를 확인해 주세요." };
  }

  return { success: true };
}

export async function signup(formData: FormData) {
  const parsed = parseCredentials(formData);
  if (!parsed) {
    return { error: VALIDATION_ERROR };
  }
  const { email, password } = parsed;

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    logger.error("signup:auth_failed", error);
    return { error: "회원가입에 실패했습니다. 다시 시도해 주세요." };
  }

  return { success: "가입 확인 이메일을 확인해 주세요." };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
