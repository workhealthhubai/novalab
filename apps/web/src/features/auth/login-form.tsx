import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { PATHS } from '@/app/router/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppButton } from '@/design-system/app-button';
import { useLogin } from '@/hooks/use-auth';
import { toApiError } from '@/services/api-client';
import { type LoginFormValues, loginSchema } from './login-schema';

interface LoginFormProps {
  onSuccess: () => void;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs text-destructive">
      {message}
    </p>
  );
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const login = useLogin();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: false, tenantSlug: '' },
  });

  const serverError = login.error ? toApiError(login.error) : null;
  const tenantRequired = serverError?.code === 'TENANT_REQUIRED';

  const onSubmit = handleSubmit((values) => {
    login.mutate(
      {
        email: values.email,
        password: values.password,
        remember: values.remember,
        ...(values.tenantSlug ? { tenantSlug: values.tenantSlug } : {}),
      },
      { onSuccess },
    );
  });

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      noValidate
      method="post"
      action="/login"
      className="flex flex-col gap-5"
    >
      <div>
        <h1 className="text-xl font-bold text-foreground">Giriş Yap</h1>
        <p className="mt-1 text-base text-muted-foreground">Kurumsal hesabınızla oturum açın.</p>
      </div>

      {serverError ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2.5 text-sm font-medium text-destructive"
        >
          {serverError.message}
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-email">E-posta</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="username"
          placeholder="ad.soyad@firma.com"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? 'login-email-error' : undefined}
          {...register('email')}
        />
        <FieldError id="login-email-error" message={errors.email?.message} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-password">Şifre</Label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? 'login-password-error' : undefined}
          {...register('password')}
        />
        <FieldError id="login-password-error" message={errors.password?.message} />
      </div>

      {tenantRequired ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-tenant">Kurum kodu</Label>
          <Input
            id="login-tenant"
            placeholder="ornek-osgb"
            aria-invalid={errors.tenantSlug ? true : undefined}
            {...register('tenantSlug')}
          />
          <FieldError id="login-tenant-error" message={errors.tenantSlug?.message} />
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Controller
            control={control}
            name="remember"
            render={({ field }) => (
              <Checkbox
                id="login-remember"
                checked={field.value}
                onCheckedChange={(value) => field.onChange(value === true)}
              />
            )}
          />
          <Label
            htmlFor="login-remember"
            className="cursor-pointer text-sm font-normal text-muted-foreground"
          >
            Beni hatırla
          </Label>
        </div>
        <Link
          to={PATHS.login}
          className="rounded-xs text-sm font-medium text-primary hover:text-primary-dark"
        >
          Şifremi Unuttum
        </Link>
      </div>

      <AppButton
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        loading={login.isPending}
      >
        Giriş Yap
      </AppButton>
    </form>
  );
}
