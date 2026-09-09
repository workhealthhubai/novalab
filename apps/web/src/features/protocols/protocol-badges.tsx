import type { ProtocolItemStatus, ProtocolStatus } from '@osgb/shared-types';
import { StatusBadge } from '@/design-system/status-badge';
import { PROTOCOL_ITEM_STATUS, PROTOCOL_STATUS } from './protocol-labels';

export function ProtocolStatusBadge({ value }: { value: ProtocolStatus }) {
  return (
    <StatusBadge status={PROTOCOL_STATUS[value].status} label={PROTOCOL_STATUS[value].label} />
  );
}

export function ProtocolItemStatusBadge({ value }: { value: ProtocolItemStatus }) {
  return (
    <StatusBadge
      status={PROTOCOL_ITEM_STATUS[value].status}
      label={PROTOCOL_ITEM_STATUS[value].label}
    />
  );
}
