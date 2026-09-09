import { useLocation, useNavigate } from 'react-router';
import { PATHS } from '@/app/router/navigation';
import { LoginForm } from '@/features/auth/login-form';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? PATHS.dashboard;

  return <LoginForm onSuccess={() => void navigate(from, { replace: true })} />;
}
