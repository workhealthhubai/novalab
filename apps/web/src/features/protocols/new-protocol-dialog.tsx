import { type ExaminationType, PERMISSIONS, type ProtocolItemType } from '@osgb/shared-types';
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AppButton } from '@/design-system/app-button';
import { FormField } from '@/design-system/form-field';
import { toApiError } from '@/services/api-client';
import type { PatientListItem } from '@/types/patient';
import type { Protocol } from '@/types/protocol';
import { PatientPicker } from './patient-picker';
import {
  DEFAULT_ITEMS,
  PROTOCOL_ITEM_LABELS,
  PROTOCOL_ITEM_TYPES,
  PROTOCOL_TYPE_LABELS,
} from './protocol-labels';
import { useCreateProtocol } from './use-protocols';
import { packageProtocolItems } from '@/features/test-packages/package-schema';
import { useTestPackages } from '@/features/test-packages/use-test-packages';
import { usePermissions } from '@/hooks/use-permissions';

interface NewProtocolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Preselected patient (e.g. from the patient detail page). */
  patient?: PatientListItem | null;
  onCreated: (protocol: Protocol) => void;
}

const TYPES = Object.keys(PROTOCOL_TYPE_LABELS) as ExaminationType[];
const NO_PACKAGE = '__none__';

/** Opens a visit: patient + reason + ordered tests. The API assigns the protocol number. */
export function NewProtocolDialog({
  open,
  onOpenChange,
  patient = null,
  onCreated,
}: NewProtocolDialogProps) {
  const create = useCreateProtocol();
  const [selected, setSelected] = useState<PatientListItem | null>(patient);
  const [type, setType] = useState<ExaminationType>('PRE_EMPLOYMENT');
  const [items, setItems] = useState<ProtocolItemType[]>(DEFAULT_ITEMS.PRE_EMPLOYMENT);
  const [notes, setNotes] = useState('');
  const [packageId, setPackageId] = useState<string>('');
  const [touched, setTouched] = useState(false);
  const { can } = usePermissions();
  const packages = useTestPackages(
    { pageSize: 100, isActive: true },
    open && can(PERMISSIONS.TESTS_READ),
  );
  // Keep the preselected patient in sync when the dialog is reused for another patient.
  const [lastPatient, setLastPatient] = useState(patient);
  if (patient !== lastPatient) {
    setLastPatient(patient);
    setSelected(patient);
  }

  const reset = () => {
    setSelected(patient);
    setType('PRE_EMPLOYMENT');
    setItems(DEFAULT_ITEMS.PRE_EMPLOYMENT);
    setNotes('');
    setPackageId('');
    setTouched(false);
    create.reset();
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const changeType = (next: ExaminationType) => {
    setType(next);
    if (!packageId) setItems(DEFAULT_ITEMS[next]);
  };

  /** Selecting a package replaces the checklist with the package's test categories. */
  const choosePackage = (next: string) => {
    setPackageId(next === NO_PACKAGE ? '' : next);
    const pkg = packages.data?.items.find((p) => p.id === next);
    setItems(pkg ? packageProtocolItems(pkg) : DEFAULT_ITEMS[type]);
  };

  const toggle = (item: ProtocolItemType, checked: boolean) => {
    setItems((current) =>
      checked
        ? PROTOCOL_ITEM_TYPES.filter((t) => t === item || current.includes(t))
        : current.filter((t) => t !== item),
    );
  };

  const patientMissing = selected === null;
  const itemsMissing = items.length === 0;

  const submit = () => {
    setTouched(true);
    if (patientMissing || itemsMissing) return;
    create.mutate(
      { employeeId: selected.id, type, items, ...(notes.trim() ? { notes: notes.trim() } : {}) },
      {
        onSuccess: (protocol) => {
          onCreated(protocol);
          handleOpenChange(false);
        },
      },
    );
  };

  const error = create.error ? toApiError(create.error) : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[640px] gap-5" showCloseButton>
        <DialogHeader>
          <DialogTitle>Yeni Protokol</DialogTitle>
          <DialogDescription>
            Hastayı ve ziyaret nedenini seçin; yapılacak tetkikleri işaretleyin. Protokol numarası
            otomatik verilir.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2.5 text-sm font-medium text-destructive"
          >
            {error.message}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id="protocol-patient"
            label="Hasta"
            required
            error={touched && patientMissing ? 'Hasta seçin' : undefined}
            className="sm:col-span-2"
          >
            <PatientPicker
              id="protocol-patient"
              value={selected}
              onChange={setSelected}
              invalid={touched && patientMissing}
              disabled={patient !== null}
            />
          </FormField>
          <FormField id="protocol-type" label="Ziyaret nedeni" required>
            <Select value={type} onValueChange={(value) => changeType(value as ExaminationType)}>
              <SelectTrigger id="protocol-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {PROTOCOL_TYPE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          {can(PERMISSIONS.TESTS_READ) ? (
            <FormField
              id="protocol-package"
              label="Tetkik paketi"
              hint="Seçilince tetkikler paketten işaretlenir"
            >
              <Select value={packageId || NO_PACKAGE} onValueChange={choosePackage}>
                <SelectTrigger id="protocol-package">
                  <SelectValue placeholder="Paket seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PACKAGE}>— Paket yok —</SelectItem>
                  {(packages.data?.items ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          ) : null}
          <FormField id="protocol-notes" label="Not">
            <Textarea
              id="protocol-notes"
              rows={2}
              placeholder="Ziyaretle ilgili kısa not"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </FormField>
          <FormField
            id="protocol-items"
            label="Tetkikler"
            required
            error={touched && itemsMissing ? 'En az bir tetkik seçin' : undefined}
            className="sm:col-span-2"
          >
            <div
              id="protocol-items"
              className="grid grid-cols-2 gap-2 rounded-md border border-border p-3 sm:grid-cols-3"
            >
              {PROTOCOL_ITEM_TYPES.map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <Checkbox
                    id={`protocol-item-${item}`}
                    checked={items.includes(item)}
                    onCheckedChange={(value) => toggle(item, value === true)}
                  />
                  <Label
                    htmlFor={`protocol-item-${item}`}
                    className="cursor-pointer text-sm font-normal"
                  >
                    {PROTOCOL_ITEM_LABELS[item]}
                  </Label>
                </div>
              ))}
            </div>
          </FormField>
        </div>

        <div className="flex justify-end gap-2">
          <AppButton
            variant="secondary"
            onClick={() => handleOpenChange(false)}
            disabled={create.isPending}
          >
            Vazgeç
          </AppButton>
          <AppButton onClick={submit} loading={create.isPending}>
            Protokol Aç
          </AppButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
