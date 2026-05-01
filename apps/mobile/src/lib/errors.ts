export function getErrorMessage(error: unknown, fallback = "Something went wrong") {
  if (error instanceof Error && error.message) {
    if (error.message.includes("InvalidAccountId")) return "No account uses that email.";
    if (error.message.includes("InvalidSecret")) return "That password is not correct.";
    if (error.message.includes("EmailDeliveryFailed")) {
      return "The verification email could not be sent right now.";
    }
    if (error.message.includes("Server Error") || error.message.includes("[CONVEX")) {
      return fallback;
    }
    return error.message;
  }
  return fallback;
}
