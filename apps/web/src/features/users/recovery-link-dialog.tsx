import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AppButton } from '@/design-system/app-button';
import { usersService } from '@/services/users.service';
import { toApiError } from '@/services/api-client';
import type { StaffUser } from '@/types/user';

export function RecoveryLinkDialog({ user, onClose }: { user: StaffUser; onClose: () => void }) {
  const [result, setResult] = useState<{ link: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Şifre kurtarma bağlantısı</DialogTitle>
          <DialogDescription>
            {user.firstName} {user.lastName} · {user.email}. Önce kişinin kimliğini doğrulayın.
            Oluşturulan bağlantıyı yalnızca bu kişiye güvenli bir kanaldan iletin.
          </DialogDescription>
        </DialogHeader>
        {result ? (
          <>
            <Input
              aria-label="Tek kullanımlık kurtarma bağlantısı"
              readOnly
              value={result.link}
              onFocus={(e) => e.target.select()}
            />
            <p className="text-sm text-muted-foreground">
              Son geçerlilik: {new Date(result.expiresAt).toLocaleString('tr-TR')}. Bağlantı
              otomatik gönderilmedi. Pencere kapatılınca yeniden gösterilmez; yeni bağlantı eskisini
              geçersiz kılar.
            </p>
          </>
        ) : (
          <AppButton
            loading={busy}
            onClick={async () => {
              setBusy(true);
              setError('');
              try {
                const data = await usersService.recoveryLink(user.id);
                setResult({
                  link: `${window.location.origin}/reset-password#token=${data.token}`,
                  expiresAt: data.expiresAt,
                });
              } catch (e) {
                setError(toApiError(e).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Kimliği doğruladım, bağlantı oluştur
          </AppButton>
        )}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <AppButton variant="secondary" onClick={onClose}>
          Kapat
        </AppButton>
      </DialogContent>
    </Dialog>
  );
}
