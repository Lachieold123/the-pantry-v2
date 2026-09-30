// A collection's actions, from its "⋯" chip or a long press on its card:
// rename (in v1's centred dialog) or delete (with Undo, so there's no
// "are you sure?" to get past).
import { useState } from 'react';

import { useSaved, type Collection } from '@/store/saved';
import { ActionSheet } from '@/ui/patterns/ActionSheet';
import { CollectionNameDialog } from '@/ui/patterns/CollectionNameDialog';
import { useToast } from '@/ui/patterns/Toast';

/** Why a name can't be used: names are unique, ignoring case. */
export function nameProblem(collections: readonly Collection[], name: string, exceptId?: string): string | undefined {
  const taken = collections.some((c) => c.id !== exceptId && c.name.toLowerCase() === name.toLowerCase());
  return taken ? 'You already have a collection with that name.' : undefined;
}

type Props = {
  /** The collection whose actions are showing, or null when closed. */
  id: string | null;
  onClose: () => void;
  /** After a delete: the collection's own page goes back to the list. */
  onDeleted?: () => void;
};

export function CollectionActions({ id, onClose, onDeleted }: Props) {
  const toast = useToast();
  const collections = useSaved((s) => s.collections);
  const rename = useSaved((s) => s.renameCollection);
  const del = useSaved((s) => s.deleteCollection);
  const restore = useSaved((s) => s.restoreCollection);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const open = collections.find((c) => c.id === id);
  const renaming = collections.find((c) => c.id === renamingId);

  const remove = (target: string) => {
    const removed = del(target);
    onDeleted?.();
    if (removed) toast({ message: `${removed.name} deleted`, undo: () => restore(removed) });
  };

  return (
    <>
      <ActionSheet
        visible={open !== undefined}
        onClose={onClose}
        title={open?.name ?? ''}
        actions={
          open
            ? [
                { label: 'Rename', icon: 'edit', onPress: () => setRenamingId(open.id), testID: 'collection-rename' },
                {
                  label: 'Delete collection',
                  icon: 'trash',
                  destructive: true,
                  onPress: () => remove(open.id),
                  testID: 'collection-delete',
                },
              ]
            : []
        }
      />
      <CollectionNameDialog
        visible={renaming !== undefined}
        title="Rename collection"
        confirmLabel="Save"
        initialName={renaming?.name ?? ''}
        problem={(name) => nameProblem(collections, name, renaming?.id)}
        onSubmit={(name) => {
          if (renaming) rename(renaming.id, name);
          setRenamingId(null);
        }}
        onClose={() => setRenamingId(null)}
      />
    </>
  );
}
