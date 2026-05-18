import type * as React from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ButtonProps = React.ComponentProps<typeof Button>

type ActionIntent =
  | 'primary'
  | 'secondary'
  | 'view'
  | 'edit'
  | 'delete'
  | 'back'
  | 'approve'
  | 'reject'
  | 'deliver'
  | 'return'

const ACTION_STYLES: Record<
  ActionIntent,
  {
    variant: ButtonProps['variant']
    className?: string
  }
> = {
  primary: { variant: 'default' },
  secondary: { variant: 'outline' },
  view: { variant: 'outline' },
  edit: { variant: 'outline' },
  delete: {
    variant: 'outline',
    className: 'border-destructive/30 text-destructive hover:text-destructive',
  },
  back: { variant: 'outline' },
  approve: {
    variant: 'default',
    className: 'bg-green-600 text-white hover:bg-green-700',
  },
  reject: {
    variant: 'outline',
    className: 'border-destructive/30 text-destructive hover:text-destructive',
  },
  deliver: { variant: 'default' },
  return: { variant: 'outline' },
}

type ActionButtonProps = Omit<ButtonProps, 'variant' | 'size'> & {
  intent?: ActionIntent
  size?: ButtonProps['size']
}

export function ActionButton({
  intent = 'secondary',
  size = 'sm',
  className,
  ...props
}: ActionButtonProps) {
  const style = ACTION_STYLES[intent]

  return (
    <Button
      variant={style.variant}
      size={size}
      className={cn('gap-1.5', style.className, className)}
      {...props}
    />
  )
}

type ActionIconButtonProps = Omit<ActionButtonProps, 'children' | 'size'> & {
  label: string
  children: React.ReactNode
}

export function ActionIconButton({
  intent = 'secondary',
  label,
  className,
  children,
  ...props
}: ActionIconButtonProps) {
  return (
    <ActionButton
      intent={intent}
      size="icon-sm"
      className={cn('shrink-0', className)}
      aria-label={label}
      {...props}
    >
      {children}
    </ActionButton>
  )
}
