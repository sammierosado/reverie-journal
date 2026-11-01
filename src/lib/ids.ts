/** Short, collision-resistant ids. `crypto.randomUUID` is available in every supported browser. */
export function newId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16)
}
