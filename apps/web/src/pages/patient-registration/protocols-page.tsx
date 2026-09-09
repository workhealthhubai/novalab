import { useParams } from 'react-router';
import { PATHS } from '@/app/router/navigation';
import { ModulePlaceholder } from '../module-placeholder';

/** Serves both the list route and the `:protocolId` detail route until the module is implemented. */
export function ProtocolsPage() {
  const { protocolId } = useParams<'protocolId'>();
  return <ModulePlaceholder path={PATHS.protocols} detailId={protocolId} />;
}
