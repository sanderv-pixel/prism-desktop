export function adminHeaders(adminSecret: string): Record<string, string> {
  const headers: Record<string, string> = {}
  if (adminSecret) {
    headers['X-Admin-Secret'] = adminSecret
  }
  return headers
}
