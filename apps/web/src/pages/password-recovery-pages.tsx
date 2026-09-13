import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppButton } from '@/design-system/app-button';
import { authService } from '@/services/auth.service';
import { toApiError } from '@/services/api-client';
import { useAuthStore } from '@/stores/auth.store';
import { passwordSchema } from '@/features/users/user-schemas';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [tenant, setTenant] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
          setMessage((await authService.passwordHelp(email.trim(), tenant.trim())).message);
        } catch (e) {
          setError(toApiError(e).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h1 className="text-xl font-bold">Şifre kurtarma</h1>
      <p className="text-sm text-muted-foreground">
        Kurum yöneticiniz kimliğinizi doğrulayıp size tek kullanımlık bağlantı verecek. Kurum
        kodunuzu bilmiyorsanız yöneticinizle iletişime geçin.
      </p>
      {message ? (
        <p role="status">{message}</p>
      ) : (
        <>
          <div className="space-y-1">
            <Label htmlFor="help-email">E-posta</Label>
            <Input
              id="help-email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="help-tenant">Kurum kodu</Label>
            <Input
              id="help-tenant"
              pattern="[a-z0-9-]{2,64}"
              maxLength={64}
              required
              value={tenant}
              onChange={(e) => setTenant(e.target.value)}
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <AppButton type="submit" loading={busy}>
            Destek talebi gönder
          </AppButton>
        </>
      )}
      <Link className="block text-sm text-primary" to="/login">
        Giriş ekranına dön
      </Link>
    </form>
  );
}

export function ResetPasswordPage() {
  // Keep the secret only in memory. Fragments do not go to HTTP access logs or Referer headers.
  const [token] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '',
  );
  useEffect(() => {
    window.history.replaceState(window.history.state, '', window.location.pathname);
  }, []);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const client = useQueryClient();
  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setError('');
        const parsed = passwordSchema.safeParse(password);
        if (!parsed.success) {
          setError(parsed.error.issues[0]!.message);
          return;
        }
        if (password !== confirm) {
          setError('Şifreler eşleşmiyor');
          return;
        }
        setBusy(true);
        try {
          const result = await authService.resetPassword(token, password);
          setPassword('');
          setConfirm('');
          useAuthStore.getState().clearSession();
          client.clear();
          setMessage(result.message);
        } catch (e) {
          setError(toApiError(e).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h1 className="text-xl font-bold">Yeni şifre belirle</h1>
      {message ? (
        <p role="status">{message}</p>
      ) : !/^[a-f0-9]{64}$/.test(token) ? (
        <p role="alert">
          Geçerli kurtarma bağlantısı bulunamadı. Yöneticinizden yeni bağlantı isteyin.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Bağlantı 15 dakika geçerlidir ve bir kez kullanılabilir. Şifreniz değişince önceki
            oturumlarınız kapanır.
          </p>
          <div className="space-y-1">
            <Label htmlFor="reset-password">Yeni şifre</Label>
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              minLength={10}
              maxLength={128}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="reset-confirm">Yeni şifre (tekrar)</Label>
            <Input
              id="reset-confirm"
              type="password"
              autoComplete="new-password"
              maxLength={128}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <AppButton type="submit" loading={busy}>
            Şifremi yenile
          </AppButton>
        </>
      )}
      <Link className="block text-sm text-primary" to="/login">
        Giriş ekranına dön
      </Link>
    </form>
  );
}
