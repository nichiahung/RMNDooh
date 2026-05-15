// src/types/creative.ts
export type CanonicalFormat =
  | 'landscape_16_9'
  | 'portrait_9_16'
  | 'square_1_1'
  | 'ultra_wide';

// 'uploading' = file selected, upload in progress
// 'valid'     = uploaded successfully
// 'invalid'   = validation or upload failed
export type AssetStatus = 'uploading' | 'valid' | 'invalid';

export interface FormatSpec {
  format: CanonicalFormat;
  label: string;
  dimensions: string;
  aspectRatio: string;
  maxFileSizeMB: number;
  acceptedMimeTypes: string[];
  screenTypes: string[]; // InventoryLocation.screenType values that map here
}
