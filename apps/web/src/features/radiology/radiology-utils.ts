import { PATHS } from '@/app/router/navigation';

export function requestPath(id: string): string {
  return PATHS.radiologyStudy.replace(':requestId', id);
}
