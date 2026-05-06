export function isNextRedirectError(error: unknown) {
  const digest = (error as { digest?: unknown } | null)?.digest;
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return (
    (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) ||
    message === "NEXT_REDIRECT" ||
    message.includes("NEXT_REDIRECT")
  );
}

export function getAdminActionErrorMessage(error: unknown, fallback: string) {
  if (isNextRedirectError(error)) {
    throw error;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}
