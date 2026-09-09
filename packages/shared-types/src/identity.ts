import type { Gender } from './enums.js';

/** Fields that can be read from the MRZ / OCR of a Turkish ID card. */
export interface IdCardScanFields {
  nationalId?: string;
  documentNumber?: string;
  firstName?: string;
  lastName?: string;
  /** ISO date (YYYY-MM-DD). */
  birthDate?: string;
  gender?: Gender;
  /** ISO date (YYYY-MM-DD). */
  expiryDate?: string;
  nationality?: string;
}

export interface IdCardBarcode {
  /** Symbology, e.g. "Code128". */
  format: string;
  text: string;
}

export type IdCardScanEngine = 'client' | 'server';

export interface IdCardScanResult {
  /** Where the OCR ran: in the browser (photo never leaves the device) or on the API. */
  engine?: IdCardScanEngine;
  /** True when a machine-readable zone was found and all its check digits matched. */
  mrzValid: boolean;
  fields: IdCardScanFields;
  /** 1D/2D barcode found on the card (Turkish ID cards carry the document number as Code 128). */
  barcode?: IdCardBarcode;
  /** Per-field validity from check digits / algorithmic validation. */
  checks: {
    nationalIdChecksum?: boolean;
    documentNumberChecksum?: boolean;
    birthDateChecksum?: boolean;
    expiryDateChecksum?: boolean;
    compositeChecksum?: boolean;
    /** Barcode text equals the MRZ document number (second source for the document number). */
    documentNumberBarcodeMatch?: boolean;
  };
  /** 0-100 OCR confidence reported by the engine. */
  confidence: number;
  /** Raw MRZ lines as recognised (for debugging in the UI). */
  rawLines: string[];
  warnings: string[];
}

export type IdentityVerificationOutcome = 'VERIFIED' | 'MISMATCH' | 'UNAVAILABLE' | 'DISABLED';

export interface IdentityVerificationRequest {
  nationalId: string;
  firstName: string;
  lastName: string;
  birthYear: number;
}

export interface IdentityVerificationResult {
  outcome: IdentityVerificationOutcome;
  /** Provider identifier, e.g. "nvi-kps-public" or "none". */
  provider: string;
  checkedAt: string;
  message?: string;
}
