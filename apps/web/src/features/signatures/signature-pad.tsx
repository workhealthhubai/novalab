import { Eraser } from 'lucide-react';
import { useEffect, useRef } from 'react';
import SignaturePad from 'signature_pad';
import { AppButton } from '@/design-system/app-button';
import { cn } from '@/lib/utils';

interface SignaturePadFieldProps {
  id: string;
  /** Receives the PNG data URL after each stroke, or null when cleared. */
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Touch / pen / mouse signature capture. The canvas backing store follows devicePixelRatio and the
 * container width so strokes stay crisp on tablets; the exported PNG is what the API stores.
 */
export function SignaturePadField({
  id,
  onChange,
  disabled = false,
  className,
}: SignaturePadFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.getContext('2d')) return;
    const pad = new SignaturePad(canvas, {
      minWidth: 0.8,
      maxWidth: 2.4,
      penColor: '#111827',
      backgroundColor: 'rgba(0,0,0,0)',
    });
    padRef.current = pad;
    const emit = () => onChangeRef.current(pad.isEmpty() ? null : pad.toDataURL('image/png'));
    pad.addEventListener('endStroke', emit);

    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const data = pad.toData();
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext('2d')?.scale(ratio, ratio);
      pad.clear();
      pad.fromData(data);
    };
    resize();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    observer?.observe(canvas);
    return () => {
      observer?.disconnect();
      pad.off();
      padRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (disabled) padRef.current?.off();
    else padRef.current?.on();
  }, [disabled]);

  const clear = () => {
    padRef.current?.clear();
    onChangeRef.current(null);
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="relative rounded-lg border-2 border-dashed border-border bg-card">
        <canvas
          id={id}
          ref={canvasRef}
          role="img"
          aria-label="İmza alanı"
          className="block h-44 w-full touch-none rounded-lg"
          style={{ touchAction: 'none' }}
        />
        <span className="pointer-events-none absolute right-3 bottom-2 text-xs text-muted-foreground">
          Buraya imzalayın
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Tablet kalemi, parmak veya fare ile imzalanabilir.
        </p>
        <AppButton type="button" size="sm" variant="ghost" onClick={clear} disabled={disabled}>
          <Eraser />
          Temizle
        </AppButton>
      </div>
    </div>
  );
}
