export function getFriendlyAuthMessage(
  rawMessage: string | null | undefined,
  fallback: string
) {
  const message = String(rawMessage ?? "").trim();
  const normalized = message.toLowerCase();

  if (!message) {
    return fallback;
  }

  if (normalized.includes("invalid login credentials")) {
    return "Email or password is incorrect.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Check your inbox and confirm your email before signing in.";
  }

  if (
    normalized.includes("user already registered") ||
    normalized.includes("already been registered")
  ) {
    return "An account with this email already exists. Try signing in instead.";
  }

  if (
    normalized.includes("password should be at least") ||
    normalized.includes("password must be at least")
  ) {
    return "Password must be at least 6 characters long.";
  }

  if (
    normalized.includes("unable to validate email address") ||
    normalized.includes("invalid email")
  ) {
    return "Enter a valid email address.";
  }

  if (normalized.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  if (normalized.includes("network")) {
    return "We could not reach the server. Please try again.";
  }

  return fallback;
}
