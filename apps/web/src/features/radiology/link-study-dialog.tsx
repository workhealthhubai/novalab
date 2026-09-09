import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AppButton } from '@/design-system/app-button';
import { ErrorState } from '@/design-system/error-state';
import { FormField } from '@/design-system/form-field';
import { LoadingState } from '@/design-system/loading-state';
import { toApiError } from '@/services/api-client';
import type { RadiologyRequest, StudySummary } from '@/types/radiology';
import { StudyCard } from './study-card';
import { usePacsCandidates, useRadiologyMutations } from './use-radiology';

interface LinkStudyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: RadiologyRequest | null;
  onLinked: (request: RadiologyRequest) => void;
}

const UID = /^[0-9.]{5,64}$/;

/** Attaches a PACS study: pick a candidate found by patient id / TC / name, or paste a StudyInstanceUID. */
export function LinkStudyDialog({ open, onOpenChange, request, onLinked }: LinkStudyDialogProps) {
  const candidates = usePacsCandidates(request?.id, open);
  const { linkStudy } = useRadiologyMutations();
  const [uid, setUid] = useState('');
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [seed, setSeed] = useState(open);
  if (seed !== open) {
    setSeed(open);
    if (open) {
      setUid('');
      setBusyUid(null);
      linkStudy.reset();
    }
  }

  const link = (studyInstanceUid: string) => {
    if (!request) return;
    setBusyUid(studyInstanceUid);
    linkStudy.mutate(
      { id: request.id, studyInstanceUid },
      {
        onSuccess: (r) => {
          onLinked(r);
          onOpenChange(false);
        },
        onSettled: () => setBusyUid(null),
      },
    );
  };
  const pick = (study: StudySummary) => link(study.studyInstanceUid);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[720px] gap-5" showCloseButton>
        <DialogHeader>
          <DialogTitle>PACS çalışması bağla</DialogTitle>
          <DialogDescription>
            {request ? `${request.employee.firstName} ${request.employee.lastName} · ` : ''}
            PACS'ta hasta kimliği, TC Kimlik No veya ad-soyad ile eşleşen çalışmalar listelenir.
            Bağlanınca istek "Görüntü alındı" durumuna geçer.
          </DialogDescription>
        </DialogHeader>
        {linkStudy.error ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2.5 text-sm font-medium text-destructive"
          >
            {toApiError(linkStudy.error).message}
          </div>
        ) : null}
        {candidates.isPending ? <LoadingState title="PACS aranıyor…" className="min-h-24" /> : null}
        {candidates.error ? (
          <ErrorState
            title="PACS'a ulaşılamadı"
            description={toApiError(candidates.error).message}
            onRetry={() => void candidates.refetch()}
          />
        ) : null}
        {candidates.data ? (
          candidates.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Bu hastayla eşleşen bağlanmamış çalışma bulunamadı. Çekim henüz aktarılmamış olabilir;
              UID ile de bağlayabilirsiniz.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {candidates.data.map((s) => (
                <StudyCard
                  key={s.orthancStudyId}
                  study={s}
                  actionLabel="Bağla"
                  onAction={pick}
                  busy={busyUid === s.studyInstanceUid}
                />
              ))}
            </ul>
          )
        ) : null}
        <FormField
          id="ls-uid"
          label="StudyInstanceUID ile bağla"
          hint="Cihazdan veya PACS'tan kopyalanan DICOM UID (0020,000D)."
        >
          <div className="flex gap-2">
            <Input
              id="ls-uid"
              value={uid}
              onChange={(e) => setUid(e.target.value.trim())}
              placeholder="1.2.826.0.1…"
              className="font-mono"
            />
            <AppButton
              variant="secondary"
              disabled={!UID.test(uid)}
              loading={busyUid === uid && uid !== ''}
              onClick={() => link(uid)}
            >
              Bağla
            </AppButton>
          </div>
        </FormField>
      </DialogContent>
    </Dialog>
  );
}
