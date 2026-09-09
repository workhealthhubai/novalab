import { type ChangeEvent, forwardRef, useState } from 'react';
import { formatGsm, normalizeGsm } from '@osgb/shared-types';
import { Input } from '@/components/ui/input';

interface GsmInputProps extends Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'> {
  value: string;
  onChange: (digits: string) => void;
}

/**
 * Masked mobile number input: displays "5XX XXX XX XX", accepts digits only,
 * strips +90/0 prefixes on paste and emits the raw 10 digits.
 */
export const GsmInput = forwardRef<HTMLInputElement, GsmInputProps>(function GsmInput(
  { value, onChange, ...props },
  ref,
) {
  const [display, setDisplay] = useState(formatGsm(value));

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const digits = normalizeGsm(event.target.value).slice(0, 10);
    setDisplay(formatGsm(digits));
    onChange(digits);
  };

  return (
    <Input
      ref={ref}
      inputMode="numeric"
      autoComplete="tel-national"
      placeholder="5XX XXX XX XX"
      maxLength={13}
      value={display}
      onChange={handleChange}
      {...props}
    />
  );
});
