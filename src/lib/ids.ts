// Short unique ids for things the cook creates (plan entries, collections).
// Time-ordered prefix keeps them sortable; the random suffix avoids clashes.
export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
