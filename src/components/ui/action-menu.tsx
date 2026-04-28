import { MoreHorizontal } from 'lucide-react';
import { Dropdown, DropdownItem } from '@/components/ui/dropdown';
import { IconButton } from '@/components/ui/icon-button';

export type ActionMenuItem = {
  label: string;
  onClick: () => void;
  destructive?: boolean;
};

/** Row ellipsis menu — fixed width panel, item height per system spec. */
export function ActionMenu({ label = 'Row actions', items }: { label?: string; items: ActionMenuItem[] }) {
  return (
    <Dropdown
      align="right"
      className="relative"
      menuClassName="w-44 rounded-lg py-0"
      trigger={
        <IconButton
          type="button"
          className="h-9 w-9 text-gray-600"
          aria-label={label}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </IconButton>
      }
    >
      <>
        {items.map((it) => (
          <DropdownItem key={it.label} destructive={it.destructive} onClick={it.onClick}>
            {it.label}
          </DropdownItem>
        ))}
      </>
    </Dropdown>
  );
}
