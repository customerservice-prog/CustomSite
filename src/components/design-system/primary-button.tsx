import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';

export function PrimaryButton({ type = 'button', ...props }: ComponentProps<typeof Button>) {
  return <Button type={type} {...props} />;
}
