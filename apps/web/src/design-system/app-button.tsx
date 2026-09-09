import { LoaderCircle } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';

export type AppButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface AppButtonProps extends Omit<ButtonProps, 'variant'> {
  variant?: AppButtonVariant;
  /** Shows a spinner and disables the button (ignored with `asChild`, which needs a single child). */
  loading?: boolean;
}

/**
 * Application button = shadcn Button with the four Figma variants and a loading state.
 * Prefer this over the raw primitive in feature code.
 */
export function AppButton({
  variant = 'primary',
  loading = false,
  disabled,
  asChild = false,
  children,
  ...props
}: AppButtonProps) {
  const showSpinner = loading && !asChild;
  return (
    <Button
      variant={variant}
      asChild={asChild}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {showSpinner ? (
        <>
          <LoaderCircle className="animate-spin" aria-hidden />
          {children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
