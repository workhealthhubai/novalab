/** Drops query strings and fragments before a request path reaches logs or audit storage. */
export function safeRequestPath(value: string | undefined): string {
  if (!value) return '';
  const end = value.search(/[?#]/);
  return end === -1 ? value : value.slice(0, end);
}
