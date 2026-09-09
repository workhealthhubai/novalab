import { Trash2, TriangleAlert } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { AppButton } from './app-button';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" renders the red trash icon + danger button (Figma default); "default" uses the brand colour. */
  tone?: 'danger' | 'default';
  loading?: boolean;
  onConfirm: () => void;
}

/** Centred confirmation dialog matching the Figma "Confirm Dialog" component. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Evet, Sil',
  cancelLabel = 'Vazgeç',
  tone = 'danger',
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const Icon = tone === 'danger' ? Trash2 : TriangleAlert;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="items-center text-center">
        <span
          className={cn(
            'mx-auto flex size-12 items-center justify-center rounded-full',
            tone === 'danger'
              ? 'bg-destructive-soft text-destructive'
              : 'bg-primary-soft text-primary-dark',
          )}
        >
          <Icon className="size-6" aria-hidden />
        </span>
        <DialogHeader className="items-center">
          <DialogTitle className="text-center">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-center">{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <DialogFooter className="w-full">
          <AppButton
            variant="secondary"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </AppButton>
          <AppButton
            variant={tone === 'danger' ? 'danger' : 'primary'}
            className="flex-1"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </AppButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
