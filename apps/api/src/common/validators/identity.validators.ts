import { registerDecorator, type ValidationOptions } from 'class-validator';
import { isValidGsm, isValidLandline, isValidTurkishId } from '@osgb/shared-types';

/** T.C. Kimlik No: 11 digits, first digit non-zero, both check digits valid. */
export function IsTurkishId(options?: ValidationOptions) {
  return (target: object, propertyName: string) =>
    registerDecorator({
      name: 'isTurkishId',
      target: target.constructor,
      propertyName,
      options: { message: 'nationalId is not a valid T.C. Kimlik No', ...options },
      validator: {
        validate: (value: unknown) => typeof value === 'string' && isValidTurkishId(value),
      },
    });
}

/** Turkish mobile number: 10 digits starting with 5 (after normalisation). */
export function IsGsm(options?: ValidationOptions) {
  return (target: object, propertyName: string) =>
    registerDecorator({
      name: 'isGsm',
      target: target.constructor,
      propertyName,
      options: { message: 'phone must be a 10-digit mobile number starting with 5', ...options },
      validator: { validate: (value: unknown) => typeof value === 'string' && isValidGsm(value) },
    });
}

/** Turkish landline: 10 digits with a 2XX-4XX area code. */
export function IsLandline(options?: ValidationOptions) {
  return (target: object, propertyName: string) =>
    registerDecorator({
      name: 'isLandline',
      target: target.constructor,
      propertyName,
      options: { message: 'homePhone must be a 10-digit landline number', ...options },
      validator: {
        validate: (value: unknown) => typeof value === 'string' && isValidLandline(value),
      },
    });
}
