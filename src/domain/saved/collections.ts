// Named collections of saved recipes. A name is unique, ignoring case and
// spaces at the ends: two "Weeknights" (or "Vego" and "vego") side by side
// would be impossible to tell apart. The UI checks as you type, but Undo after
// a delete and the old-app import add collections without that screen, so the
// rule lives here and every write goes through it.

export type NamedCollection = { id: string; name: string; recipeIds: string[]; createdAt: number; updatedAt: number };

const key = (name: string) => name.trim().toLocaleLowerCase();

/** The collection already using this name, if any (other than `exceptId`). */
export function collectionNamed<C extends NamedCollection>(list: readonly C[], name: string, exceptId?: string): C | undefined {
  const k = key(name);
  return list.find((c) => c.id !== exceptId && key(c.name) === k);
}

/**
 * Adds a collection, keeping names unique. Same id already there: nothing
 * changes (so a repeated import or a double Undo is harmless). Same name:
 * its recipes join the collection that has the name, instead of making a twin.
 */
export function addCollection<C extends NamedCollection>(list: readonly C[], incoming: C): C[] {
  if (list.some((c) => c.id === incoming.id)) return [...list];
  const twin = collectionNamed(list, incoming.name);
  if (!twin) return [...list, { ...incoming, name: incoming.name.trim() }].sort((a, b) => a.createdAt - b.createdAt);
  const recipeIds = [...twin.recipeIds, ...incoming.recipeIds.filter((id) => !twin.recipeIds.includes(id))];
  return list.map((c) => (c === twin ? { ...c, recipeIds, updatedAt: Math.max(c.updatedAt, incoming.updatedAt) } : c));
}

/** Renames, unless the name is empty or another collection already has it. */
export function renameCollection<C extends NamedCollection>(list: readonly C[], id: string, name: string, now: number): C[] {
  if (!name.trim() || collectionNamed(list, name, id)) return [...list];
  return list.map((c) => (c.id === id ? { ...c, name: name.trim(), updatedAt: now } : c));
}
