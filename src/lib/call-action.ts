export const UNEXPECTED_ERROR = "Something went wrong. Check your connection and try again.";

function isNavigation(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return (
    typeof digest === "string" &&
    (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK"))
  );
}

/**
 * Call a Server Action from a client component. Expected failures come back as `{ error }` from the
 * action itself; this turns unexpected ones (network drop, server crash) into the same shape so the
 * UI can show a toast instead of falling through to the error page. Framework redirects pass through.
 */
// Every action result type in this app is `{ error?: string; …optional fields }`, so an error-only
// object is a valid T.
export async function callAction<T extends { error?: string }>(
  action: () => Promise<T>,
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (isNavigation(error)) throw error;
    console.error(error);
    return { error: UNEXPECTED_ERROR } as T;
  }
}
