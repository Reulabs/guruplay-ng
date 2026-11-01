const technicalMessage =
  /\b(?:JSON|SyntaxError|TypeError|unexpected token|unexpected end|not configured|service.?role|SUPABASE|PGRST\w*|SQL|JWT|stack trace|NOT_FOUND|FUNCTION_\w+)\b|[<>{}]|https?:\/\//i;

export function feedbackMessage(
  message: unknown,
  fallback = "We couldn’t load this right now. Please try again shortly.",
): string {
  return typeof message === "string" &&
    message.trim().length > 0 &&
    message.length <= 300 &&
    !technicalMessage.test(message)
    ? message
    : fallback;
}

export async function readApiResponse(
  response: Response,
  fallback = "We couldn’t complete this request. Please try again shortly.",
): Promise<unknown> {
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401)
      throw new Error("Your session has expired. Please sign in again.");
    if (response.status === 429)
      throw new Error("Too many attempts. Wait a moment and try again.");
    const message =
      result && typeof result === "object" && "error" in result
        ? result.error
        : null;
    throw new Error(
      response.status >= 500 ? fallback : feedbackMessage(message, fallback),
    );
  }
  if (result === null || typeof result !== "object") throw new Error(fallback);
  return result;
}
