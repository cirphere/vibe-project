type LogLevel = "error" | "warn" | "info";

interface SupabaseError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

const isProd = process.env.NODE_ENV === "production";

function sanitize(error: unknown): Record<string, string> {
  if (!error || typeof error !== "object") {
    return { code: "UNKNOWN" };
  }

  const e = error as SupabaseError;
  const safe: Record<string, string> = {
    code: e.code ?? "UNKNOWN",
  };

  if (!isProd) {
    if (e.message) safe.message = e.message;
    if (e.details) safe.details = e.details;
    if (e.hint) safe.hint = e.hint;
  }

  return safe;
}

function log(level: LogLevel, tag: string, error?: unknown) {
  const entry = {
    level,
    tag,
    timestamp: new Date().toISOString(),
    ...(error !== undefined && { error: sanitize(error) }),
  };

  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else if (level === "warn") {
    console.warn(JSON.stringify(entry));
  } else {
    console.info(JSON.stringify(entry));
  }
}

export const logger = {
  error: (tag: string, error?: unknown) => log("error", tag, error),
  warn: (tag: string, error?: unknown) => log("warn", tag, error),
  info: (tag: string) => log("info", tag),
};
