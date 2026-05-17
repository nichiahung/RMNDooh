'use client';

import { useState } from 'react';
import { Check, CheckCircle2, Clock3, FileWarning, Film, Loader2, Pencil, Trash2, X } from 'lucide-react';
import type { MediaAssetSummary } from '@/lib/api/creatives';

interface AssetLibraryCardProps {
  asset: MediaAssetSummary;
  onDelete?: (id: string) => Promise<void> | void;
  onRename?: (id: string, newName: string) => Promise<void> | void;
}

export function AssetLibraryCard({ asset, onDelete, onRename }: AssetLibraryCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(asset.originalFilename);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const badge = getApprovalBadge(asset);
  const canEdit = Boolean(onRename);
  const canDelete = Boolean(onDelete);

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === asset.originalFilename || !onRename) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onRename(asset.id, trimmed);
      setIsEditing(false);
    } catch (err) {
      console.error('Rename failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(asset.id);
    } catch (err) {
      console.error('Delete failed:', err);
      setIsDeleting(false);
    }
  };

  return (
    <div className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:border-indigo-200 hover:shadow-sm">
      <div className="relative h-32 bg-slate-100">
        {asset.fileType === 'image' ? (
          <img src={asset.publicUrl} alt={asset.originalFilename} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Film className="h-8 w-8 text-slate-300" />
          </div>
        )}

        {badge && (
          <div className="absolute left-2 top-2">
            <span className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm ${badge.className}`}>
              {badge.icon}
              {badge.label}
            </span>
          </div>
        )}

        {(canEdit || canDelete) && (
          <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {canEdit && (
              <button
                onClick={() => {
                  setNameInput(asset.originalFilename);
                  setIsEditing(true);
                }}
                className="rounded-md bg-white p-1 text-slate-500 shadow transition-colors hover:text-indigo-600"
                title="重新命名"
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-md bg-white p-1 text-slate-500 shadow transition-colors hover:text-red-600 disabled:opacity-50"
                title="刪除"
              >
                {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="p-3">
        {isEditing ? (
          <div className="mb-1 flex items-center gap-1">
            <input
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveName();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              className="min-w-0 flex-1 border-b border-indigo-400 bg-transparent py-0.5 text-xs outline-none"
              autoFocus
            />
            <button onClick={handleSaveName} disabled={isSaving} className="flex-shrink-0 text-emerald-600 hover:text-emerald-700">
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            </button>
            <button onClick={() => setIsEditing(false)} className="flex-shrink-0 text-slate-400 hover:text-slate-600">
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <p className="mb-1 truncate text-xs font-semibold text-slate-800">{asset.originalFilename}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400">{(asset.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
          <span className="text-[10px] text-slate-400">{new Date(asset.createdAt).toLocaleDateString('zh-TW')}</span>
        </div>
      </div>
    </div>
  );
}

function getApprovalBadge(asset: MediaAssetSummary) {
  if (asset.isApproved) {
    return {
      label: '已審核',
      className: 'bg-emerald-500',
      icon: <CheckCircle2 className="h-2.5 w-2.5" />,
    };
  }

  if (asset.approvalStatus === 'rejected') {
    return {
      label: '已退回',
      className: 'bg-red-500',
      icon: <FileWarning className="h-2.5 w-2.5" />,
    };
  }

  if (asset.approvalStatus === 'pending_review') {
    return {
      label: '待審核',
      className: 'bg-amber-500',
      icon: <Clock3 className="h-2.5 w-2.5" />,
    };
  }

  return null;
}
