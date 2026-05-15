// src/components/campaign-planner/CreativeUploadStep.tsx
'use client';

import React, { useRef, useState, useCallback } from 'react';
import { CreativeAsset, MediaPlanItem, InventoryLocation } from '@/types/inventory';
import { CanonicalFormat, FormatSpec, AssetStatus } from '@/types/creative';
import { FORMAT_SPECS, deriveRequiredFormats, validateAsset } from '@/utils/creativeRequirements';
import { uploadCreativeAsset } from '@/lib/api/creatives';
import { uploadAssetToRequirement } from '@/lib/api/campaign-draft';
import { ArrowLeft, UploadCloud, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

interface Props {
  selectedItems: MediaPlanItem[];
  allInventory: InventoryLocation[];
  creatives: CreativeAsset[];
  setCreatives: React.Dispatch<React.SetStateAction<CreativeAsset[]>>;
  onBack: () => void;
  onContinue: () => void;
  // New: stored requirement rows (present after submitCreativesForReview)
  // If null/undefined, falls back to derived-only mode (no DB linking)
  storedRequirements?: Array<{ id: string; canonicalFormat: string }> | null;
}

type ZoneState = {
  status: AssetStatus;
  file: File;
  previewUrl: string;
  errorMessage?: string;
  asset?: CreativeAsset;
};

export function CreativeUploadStep({
  selectedItems,
  allInventory,
  setCreatives,
  onBack,
  onContinue,
  storedRequirements,
}: Props) {
  const { t } = useI18n();
  const requiredFormats = deriveRequiredFormats(selectedItems, allInventory);
  const [zones, setZones] = useState<Partial<Record<CanonicalFormat, ZoneState>>>({});

  const venueCountForFormat = (format: CanonicalFormat): number => {
    const spec = FORMAT_SPECS.find(s => s.format === format)!;
    return selectedItems.filter(item => {
      const venue = allInventory.find(v => v.id === item.inventoryId);
      return venue && spec.screenTypes.includes(venue.screenType);
    }).length;
  };

  const handleFile = useCallback(async (format: CanonicalFormat, spec: FormatSpec, file: File) => {
    // Revoke previous blob URL for this format slot if it exists
    setZones(prev => {
      const old = prev[format];
      if (old?.previewUrl) URL.revokeObjectURL(old.previewUrl);
      return prev;
    });

    const previewUrl = URL.createObjectURL(file);
    const validation = validateAsset(file, spec);

    if (!validation.valid) {
      setZones(prev => ({
        ...prev,
        [format]: { status: 'invalid', file, previewUrl, errorMessage: validation.errorMessage },
      }));
      return;
    }

    setZones(prev => ({ ...prev, [format]: { status: 'uploading', file, previewUrl } }));

    try {
      const asset = await uploadCreativeAsset(file);

      // If we have a stored requirement for this format, link the asset.
      // uploadAssetToRequirement also handles the blocked_by_creative auto-transition.
      if (storedRequirements) {
        const req = storedRequirements.find(r => r.canonicalFormat === format);
        if (req) {
          await uploadAssetToRequirement(req.id, asset.id);
        }
      }

      setZones(prev => ({ ...prev, [format]: { status: 'valid', file, previewUrl, asset } }));
    } catch (err) {
      setZones(prev => ({
        ...prev,
        [format]: {
          status: 'invalid',
          file,
          previewUrl,
          errorMessage: err instanceof Error ? err.message : t('creative.upload.error.generic'),
        },
      }));
    }
  }, [storedRequirements]);

  const handleRemove = (format: CanonicalFormat) => {
    setZones(prev => {
      const next = { ...prev };
      const zone = next[format];
      if (zone) URL.revokeObjectURL(zone.previewUrl);
      delete next[format];
      return next;
    });
  };

  const allDone = requiredFormats.length > 0 &&
    requiredFormats.every(f => zones[f]?.status === 'valid');

  const handleSubmit = () => {
    const assets = requiredFormats
      .map(f => zones[f]?.asset)
      .filter((a): a is CreativeAsset => !!a);
    setCreatives(assets);
    onContinue();
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6 sm:p-8 custom-scrollbar">
      <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">{t('creative.title')}</h2>
          <p className="text-slate-500 mt-1">
            {t('creative.subtitle')} · {selectedItems.length} 個版位，需要{' '}
            <span className="font-semibold text-indigo-600">{requiredFormats.length}</span>{' '}
            {t('creative.upload.formatsNeeded')}
          </p>
        </div>

        {/* Format Upload Zones */}
        {requiredFormats.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
            {t('creative.upload.emptyState')}
          </div>
        ) : (
          <div className="space-y-4">
            {requiredFormats.map(format => {
              const spec = FORMAT_SPECS.find(s => s.format === format)!;
              return (
                <FormatUploadZone
                  key={format}
                  spec={spec}
                  venueCount={venueCountForFormat(format)}
                  state={zones[format] ?? null}
                  onFile={file => handleFile(format, spec, file)}
                  onRemove={() => handleRemove(format)}
                  t={t}
                />
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center px-6 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> {t('creative.backToInventory')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!allDone}
            className="flex items-center px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('creative.submit.button')}
          </button>
        </div>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// FormatUploadZone sub-component
// ─────────────────────────────────────────────

interface ZoneProps {
  spec: FormatSpec;
  venueCount: number;
  state: ZoneState | null;
  onFile: (file: File) => void;
  onRemove: () => void;
  t: (key: string) => string;
}

function FormatUploadZone({ spec, venueCount, state, onFile, onRemove, t }: ZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  const borderColor =
    state?.status === 'valid' ? 'border-emerald-400 bg-emerald-50/30' :
    state?.status === 'invalid' ? 'border-red-400 bg-red-50/30' :
    isDragging ? 'border-indigo-400 bg-indigo-50/30' :
    'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/20';

  return (
    <div className={`rounded-xl border-2 transition-colors ${state ? borderColor : `border-dashed ${borderColor}`}`}>
      {/* Zone Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            {state?.status === 'valid' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            {state?.status === 'invalid' && <AlertCircle className="w-4 h-4 text-red-500" />}
            {state?.status === 'uploading' && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />}
            <span className="font-semibold text-slate-900 text-sm">{spec.label}</span>
            <span className="text-xs text-slate-400 font-normal">{spec.aspectRatio}</span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {spec.dimensions} · {t('creative.upload.maxSize')} {spec.maxFileSizeMB}MB · JPG/PNG/MP4
          </div>
        </div>
        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
          {venueCount} {t('creative.upload.venuesCount')}
        </span>
      </div>

      {/* Zone Body */}
      <div className="p-4">
        {!state ? (
          <div
            className="flex flex-col items-center justify-center py-8 cursor-pointer"
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept={spec.acceptedMimeTypes.join(',')}
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }}
            />
            <UploadCloud className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">{t('creative.upload.dragDrop')}</p>
          </div>
        ) : state.status === 'uploading' ? (
          <div className="flex items-center gap-3 py-4">
            <Loader2 className="w-5 h-5 text-indigo-400 animate-spin flex-shrink-0" />
            <span className="text-sm text-slate-600">{t('creative.upload.uploading')}</span>
            <span className="text-xs text-slate-400 truncate">{state.file.name}</span>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            {/* Preview */}
            {state.file.type.startsWith('image/') ? (
              <img
                src={state.previewUrl}
                alt={state.file.name}
                className="w-20 h-12 object-cover rounded border border-slate-200 flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-12 bg-slate-100 rounded border border-slate-200 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] text-slate-500 font-medium">MP4</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{state.file.name}</p>
              {state.status === 'invalid' && state.errorMessage && (
                <p className="text-xs text-red-600 mt-0.5">{state.errorMessage}</p>
              )}
              {state.status === 'valid' && (
                <p className="text-xs text-emerald-600 mt-0.5">
                  {(state.file.size / (1024 * 1024)).toFixed(1)} MB
                </p>
              )}
            </div>
            <button
              onClick={onRemove}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
              title={t('creative.upload.remove')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
