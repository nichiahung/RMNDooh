'use client';

import React, { useRef, useState, useCallback } from 'react';
import { X, UploadCloud, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { FormatSpec, CanonicalFormat, AssetStatus } from '@/types/creative';
import { validateAsset } from '@/utils/creativeRequirements';
import { uploadCreativeAsset } from '@/lib/api/creatives';
import { uploadAssetToRequirement } from '@/lib/api/campaign-draft';
import { CreativeAsset } from '@/types/inventory';

interface Props {
  spec: FormatSpec;
  venueCount: number;
  requirementId: string;
  onSuccess: (asset: CreativeAsset, format: CanonicalFormat) => void;
  onClose: () => void;
}

type UploadState = {
  status: AssetStatus;
  file: File;
  previewUrl: string;
  errorMessage?: string;
  asset?: CreativeAsset;
};

export function CreativeUploadModal({ spec, venueCount, requirementId, onSuccess, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [state, setState] = useState<UploadState | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (state?.previewUrl) URL.revokeObjectURL(state.previewUrl);
    const previewUrl = URL.createObjectURL(file);
    const validation = validateAsset(file, spec);

    if (!validation.valid) {
      setState({ status: 'invalid', file, previewUrl, errorMessage: validation.errorMessage });
      return;
    }

    setState({ status: 'uploading', file, previewUrl });

    try {
      const asset = await uploadCreativeAsset(file);
      await uploadAssetToRequirement(requirementId, asset.id);
      setState({ status: 'valid', file, previewUrl, asset });
      setTimeout(() => {
        onSuccess(asset, spec.format);
        onClose();
      }, 800);
    } catch (err) {
      setState({
        status: 'invalid', file, previewUrl,
        errorMessage: err instanceof Error ? err.message : '上傳失敗，請重試',
      });
    }
  }, [spec, requirementId, onSuccess, onClose, state]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const zoneBorder =
    state?.status === 'valid' ? 'border-emerald-300 bg-emerald-50/40' :
    state?.status === 'invalid' ? 'border-red-300 bg-red-50/30' :
    isDragging ? 'border-indigo-400 bg-indigo-50' :
    'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-900">{spec.label}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {spec.dimensions} · {spec.aspectRatio} · {venueCount} 個版位
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Zone */}
        <div className="p-5">
          {!state ? (
            <div
              className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer transition-colors ${zoneBorder}`}
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
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
              />
              <UploadCloud className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-600">拖曳或點擊上傳</p>
              <p className="text-xs text-slate-400 mt-1">JPG · PNG · MP4 · 最大 {spec.maxFileSizeMB}MB</p>
            </div>
          ) : state.status === 'uploading' ? (
            <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/30 rounded-xl p-12 flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-3" />
              <p className="text-sm text-slate-600">上傳中...</p>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px] truncate">{state.file.name}</p>
            </div>
          ) : state.status === 'valid' ? (
            <div className="border-2 border-emerald-300 bg-emerald-50/30 rounded-xl p-10 flex flex-col items-center justify-center gap-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              <p className="text-sm font-semibold text-emerald-700">上傳成功</p>
              <p className="text-xs text-slate-400 max-w-[200px] truncate">{state.file.name}</p>
            </div>
          ) : (
            <div className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 ${zoneBorder}`}>
              <AlertCircle className="w-8 h-8 text-red-500" />
              <p className="text-sm text-red-600 text-center">{state.errorMessage}</p>
              <button
                onClick={() => { if (state.previewUrl) URL.revokeObjectURL(state.previewUrl); setState(null); }}
                className="text-xs font-medium text-indigo-600 hover:underline"
              >
                重新選擇
              </button>
            </div>
          )}
        </div>

        <div className="px-5 pb-5">
          <p className="text-xs text-slate-400">
            接受格式：{spec.acceptedMimeTypes.map(m => m.split('/')[1].toUpperCase()).join(' · ')} · 最大 {spec.maxFileSizeMB}MB
          </p>
        </div>
      </div>
    </div>
  );
}
