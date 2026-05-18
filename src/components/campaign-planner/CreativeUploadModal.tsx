'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { X, UploadCloud, CheckCircle2, AlertCircle, Loader2, ImageIcon, Film, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { FormatSpec, CanonicalFormat, AssetStatus } from '@/types/creative';
import { validateAsset } from '@/utils/creativeRequirements';
import { uploadCreativeAsset, listMediaAssets } from '@/lib/api/creatives';
import { uploadAssetToRequirement } from '@/lib/api/campaign-draft';
import { CreativeAsset } from '@/types/inventory';

type LibraryAsset = Awaited<ReturnType<typeof listMediaAssets>>[number];

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

type Tab = 'upload' | 'library';

export function CreativeUploadModal({ spec, venueCount, requirementId, onSuccess, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [state, setState] = useState<UploadState | null>(null);

  // Library picker state
  const [libraryAssets, setLibraryAssets] = useState<LibraryAsset[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    if (tab !== 'library') return;
    setLibraryLoading(true);
    setLibraryError(null);
    listMediaAssets()
      .then(assets => {
        // Filter to compatible file types
        const acceptedTypes = spec.acceptedMimeTypes;
        setLibraryAssets(assets.filter(a => acceptedTypes.includes(a.mimeType)));
      })
      .catch(err => setLibraryError(err.message))
      .finally(() => setLibraryLoading(false));
  }, [tab, spec.acceptedMimeTypes]);

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

  const handleSelectFromLibrary = async () => {
    if (!selectedAssetId) return;
    const chosen = libraryAssets.find(a => a.id === selectedAssetId);
    if (!chosen) return;
    setIsLinking(true);
    try {
      await uploadAssetToRequirement(requirementId, chosen.id);
      const asset: CreativeAsset = {
        id: chosen.id,
        name: chosen.originalFilename,
        type: chosen.mimeType as CreativeAsset['type'],
        fileSize: chosen.fileSizeBytes,
        durationSeconds: undefined,
        previewUrl: chosen.publicUrl,
        status: 'pending_review',
        uploadedAt: chosen.createdAt,
      };
      onSuccess(asset, spec.format);
      onClose();
    } catch (err) {
      setLibraryError(err instanceof Error ? err.message : '選取失敗，請重試');
    } finally {
      setIsLinking(false);
    }
  };

  const zoneBorder =
    state?.status === 'valid' ? 'border-emerald-300 bg-emerald-50/40' :
    state?.status === 'invalid' ? 'border-red-300 bg-red-50/30' :
    isDragging ? 'border-indigo-400 bg-indigo-50' :
    'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30';

  return (
    <Modal onClose={onClose} maxWidth="max-w-md" zIndex="z-[200]">
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

        {/* Tab switcher */}
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setTab('upload')}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${tab === 'upload' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            上傳新素材
          </button>
          <button
            onClick={() => setTab('library')}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${tab === 'library' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            從素材庫選取
          </button>
        </div>

        {tab === 'upload' && (
          <>
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
          </>
        )}

        {tab === 'library' && (
          <div className="p-4">
            {libraryLoading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
              </div>
            )}

            {libraryError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {libraryError}
              </div>
            )}

            {!libraryLoading && !libraryError && libraryAssets.length === 0 && (
              <div className="py-12 flex flex-col items-center text-center">
                <ImageIcon className="w-10 h-10 text-slate-200 mb-3" />
                <p className="text-sm font-medium text-slate-600 mb-1">素材庫是空的</p>
                <p className="text-xs text-slate-400">尚無符合此格式的素材</p>
                <button
                  onClick={() => setTab('upload')}
                  className="mt-4 text-xs font-semibold text-indigo-600 hover:underline"
                >
                  上傳新素材
                </button>
              </div>
            )}

            {!libraryLoading && !libraryError && libraryAssets.length > 0 && (
              <>
                <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto mb-4 custom-scrollbar">
                  {libraryAssets.map(asset => (
                    <button
                      key={asset.id}
                      onClick={() => setSelectedAssetId(prev => prev === asset.id ? null : asset.id)}
                      className={`relative rounded-lg overflow-hidden border-2 transition-all aspect-square ${
                        selectedAssetId === asset.id
                          ? 'border-indigo-500 shadow-md'
                          : 'border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      {asset.fileType === 'image' ? (
                        <img src={asset.publicUrl} alt={asset.originalFilename} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                          <Film className="w-6 h-6 text-slate-400" />
                        </div>
                      )}
                      {selectedAssetId === asset.id && (
                        <div className="absolute inset-0 bg-indigo-600/20 flex items-center justify-center">
                          <CheckCircle2 className="w-7 h-7 text-indigo-600 drop-shadow" />
                        </div>
                      )}
                      {asset.isApproved && (
                        <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm" title="已核准">
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1">
                        <p className="text-[9px] text-white truncate">{asset.originalFilename}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleSelectFromLibrary}
                  disabled={!selectedAssetId || isLinking}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLinking ? <><Loader2 className="w-4 h-4 animate-spin" /> 套用中...</> : '套用選取素材'}
                </button>
              </>
            )}
          </div>
        )}
    </Modal>
  );
}
