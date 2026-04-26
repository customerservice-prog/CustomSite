import { MoreHorizontal } from 'lucide-react';
import { Dropdown, DropdownItem } from '@/components/ui/dropdown';
import { IconButton } from '@/components/ui/icon-button';
import { useShell } from '@/context/shell-context';

export function DataRowMenu({
  label = 'Row actions',
  onView,
  onEdit,
}: {
  label?: string;
  onView?: () => void;
  onEdit?: () => void;
}) {
  const { toast } = useShell();
  return (
    <Dropdown
      align="right"
      trigger={
        <IconButton type="button" className="h-8 w-8 text-slate-500" aria-label={label}>
          <MoreHorizontal className="h-4 w-4" />
        </IconButton>
      }
    >
      <DropdownItem
        onClick={() => {
          onView?.();
          toast('Details panel opens here.', 'info');
        }}
      >
        View details
      </DropdownItem>
      <DropdownItem
        onClick={() => {
          onEdit?.();
          toast('Editor opens here.', 'info');
        }}
      >
        Edit
      </DropdownItem>
    </Dropdown>
  );
}
