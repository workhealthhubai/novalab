import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * Button primitive. Variants mirror the Figma "Button" component:
 * Primary (brand fill) · Secondary (surface + border) · Ghost (brand text) · Danger (red fill).
 */
const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent text-base font-semibold whitespace-nowrap transition-colors select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        secondary: 'border-border bg-secondary text-secondary-foreground hover:bg-muted',
        ghost: 'text-primary hover:bg-primary-soft/60',
        danger: 'bg-destructive text-destructive-foreground hover:bg-destructive-hover',
      },
      size: {
        sm: 'h-control-sm px-3 text-sm',
        default: 'h-control px-4',
        lg: 'h-control-lg px-5',
        icon: 'size-control',
        'icon-sm': 'size-control-sm rounded-sm',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  },
);

type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button';
  return (
    <Comp
      data-slot="button"
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants, type ButtonProps };
