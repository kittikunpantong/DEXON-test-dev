export function safeNext(value: string | null | undefined): string {
  if (!value) return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  if (value.startsWith("/login") || value.startsWith("/api/auth")) return "/";
  if (value.includes("\\") || value.includes("\n") || value.includes("\r")) return "/";
  return value;
}
