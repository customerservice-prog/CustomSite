import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';

export function SecondaryButton(props: ComponentProps<typeof Button>) {
  return <Button type="button" variant="secondary" {...props} />;
}
