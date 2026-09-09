import { useParams } from 'react-router';
import { PATHS } from '@/app/router/navigation';
import { ModulePlaceholder } from '../module-placeholder';

/** Serves both the list route and the `:studyId` detail route until the module is implemented. */
export function RadiologyPage() {
  const { studyId } = useParams<'studyId'>();
  return <ModulePlaceholder path={PATHS.radiology} detailId={studyId} />;
}
