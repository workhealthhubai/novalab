import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner';

/**
 * Toast styling (Figma "Toast"): white surface, 14px radius, 4px coloured left border,
 * icon in a soft tinted square, 12.5px semibold message. Sonner provides the runtime.
 */
export function AppToaster() {
  return (
    <SonnerToaster
      position="top-right"
      gap={10}
      icons={{
        success: <CircleCheck className="size-4" />,
        error: <CircleAlert className="size-4" />,
        warning: <TriangleAlert className="size-4" />,
        info: <Info className="size-4" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'group/toast flex w-[380px] max-w-[calc(100vw-2rem)] items-center gap-2.5 rounded-[14px] border border-border border-l-4 bg-card px-3.5 py-3 font-sans shadow-toast',
          title: 'text-[12.5px] leading-[17px] font-semibold text-foreground',
          description: 'text-xs text-muted-foreground',
          icon: 'flex size-7 shrink-0 items-center justify-center rounded-sm',
          closeButton: 'ml-auto text-muted-foreground hover:text-foreground',
          success: 'border-l-success [&_[data-icon]]:bg-success-soft [&_[data-icon]]:text-success',
          error:
            'border-l-destructive [&_[data-icon]]:bg-destructive-soft [&_[data-icon]]:text-destructive',
          warning: 'border-l-warning [&_[data-icon]]:bg-warning-soft [&_[data-icon]]:text-warning',
          info: 'border-l-info [&_[data-icon]]:bg-info-soft [&_[data-icon]]:text-info',
        },
      }}
    />
  );
}

/** Thin wrapper so feature code never imports sonner directly. */
export const toast = {
  success: (message: string, description?: string) => sonnerToast.success(message, { description }),
  error: (message: string, description?: string) => sonnerToast.error(message, { description }),
  warning: (message: string, description?: string) => sonnerToast.warning(message, { description }),
  info: (message: string, description?: string) => sonnerToast.info(message, { description }),
};
