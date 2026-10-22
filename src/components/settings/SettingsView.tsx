import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { exportJSONBackup, downloadBackupFile, validateBackupFile, executeImport, ImportPreview } from '@/services/backup';
import { Download, Upload, Shield, Database, HardDrive, Check, AlertTriangle, Moon, Sun } from 'lucide-react';

export function SettingsView() {
  const settingsRecords = useLiveQuery(() => db.settings.toArray(), [], []);
  const settingsMap = new Map(settingsRecords.map((s) => [s.key, s.value]));

  const unit = (settingsMap.get('unit') as 'kg' | 'lb') || 'kg';
  const rounding = (settingsMap.get('roundingIncrement') as number) || 2.5;
  const defaultRest = (settingsMap.get('defaultRestSec') as number) || 90;
  const e1rmFormula = (settingsMap.get('e1rmFormula') as 'epley' | 'brzycki') || 'epley';
  const lastBackupAt = settingsMap.get('lastBackupAt') as string | undefined;

  const [storageStatus, setStorageStatus] = useState<string>('Checking...');
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importStrategy, setImportStrategy] = useState<'merge' | 'replace'>('merge');
  const [importSuccess, setImportSuccess] = useState(false);

  // Check persistent storage status
  useEffect(() => {
    async function checkStorage() {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const { usage, quota } = await navigator.storage.estimate();
        const usageMB = usage ? (usage / (1024 * 1024)).toFixed(1) : '0';
        const quotaMB = quota ? (quota / (1024 * 1024)).toFixed(0) : '0';
        const isPersisted = await navigator.storage.persisted();
        setStorageStatus(`${usageMB} MB used of ${quotaMB} MB quota (${isPersisted ? 'Persisted' : 'Not Persisted'})`);
      } else {
        setStorageStatus('Storage API not supported on this browser');
      }
    }
    checkStorage();
  }, []);

  const handleUpdateSetting = async (key: string, value: any) => {
    await db.settings.put({ key, value });
  };

  const handleExportBackup = async () => {
    const backup = await exportJSONBackup();
    downloadBackupFile(backup);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const preview = validateBackupFile(content);
      setImportPreview(preview);
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!importPreview?.valid) return;
    try {
      await executeImport(importPreview.backup, importStrategy);
      setImportSuccess(true);
      setTimeout(() => {
        setImportSuccess(false);
        setImportPreview(null);
      }, 3000);
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-200">
      <div className="border-b border-[#2a2a2a] pb-2">
        <h2 className="text-xl font-bold text-white tracking-tight">App Settings</h2>
        <p className="text-xs text-[var(--text-muted)]">
          Manage gym preferences, offline storage, and JSON backups
        </p>
      </div>

      {/* Units & Rounding */}
      <div className="flat-card p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#d9083c]">
          Units & Increment
        </h3>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white">Default Weight Unit</div>
            <div className="text-xs text-[var(--text-muted)]">All values stored in canonical kg</div>
          </div>
          <div className="flex items-center space-x-1 bg-[#1e1e1e] p-1 rounded-sm border border-[#2a2a2a]">
            {(['kg', 'lb'] as const).map((u) => (
              <button
                key={u}
                onClick={() => handleUpdateSetting('unit', u)}
                className={`px-3 py-1 text-xs font-bold uppercase rounded-sm transition-colors ${
                  unit === u ? 'bg-[#d9083c] text-white' : 'text-[var(--text-muted)] hover:text-white'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#2a2a2a]">
          <div>
            <div className="text-sm font-semibold text-white">Plate Rounding Increment</div>
            <div className="text-xs text-[var(--text-muted)]">Stepper and suggestion increment</div>
          </div>
          <select
            value={rounding}
            onChange={(e) => handleUpdateSetting('roundingIncrement', parseFloat(e.target.value))}
            className="flat-input text-xs py-1.5 px-3 bg-[#161616]"
          >
            <option value="1">1.0 kg / lb</option>
            <option value="1.25">1.25 kg</option>
            <option value="2.5">2.5 kg (Standard)</option>
            <option value="5">5.0 lb</option>
          </select>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#2a2a2a]">
          <div>
            <div className="text-sm font-semibold text-white">Default Rest Duration</div>
            <div className="text-xs text-[var(--text-muted)]">Initial countdown when rest starts</div>
          </div>
          <select
            value={defaultRest}
            onChange={(e) => handleUpdateSetting('defaultRestSec', parseInt(e.target.value, 10))}
            className="flat-input text-xs py-1.5 px-3 bg-[#161616]"
          >
            <option value="60">60 seconds (1 min)</option>
            <option value="90">90 seconds (1.5 min)</option>
            <option value="120">120 seconds (2 min)</option>
            <option value="180">180 seconds (3 min)</option>
          </select>
        </div>
      </div>

      {/* Calculations & Formulas */}
      <div className="flat-card p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#d9083c]">
          Calculations
        </h3>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white">Estimated 1RM Formula</div>
            <div className="text-xs text-[var(--text-muted)]">Used for strength progression charts</div>
          </div>
          <select
            value={e1rmFormula}
            onChange={(e) => handleUpdateSetting('e1rmFormula', e.target.value)}
            className="flat-input text-xs py-1.5 px-3 bg-[#161616]"
          >
            <option value="epley">Epley Formula (w × (1 + r/30))</option>
            <option value="brzycki">Brzycki Formula (w × (36 / (37 - r)))</option>
          </select>
        </div>
      </div>

      {/* JSON Backup & Restore (Spec 13) */}
      <div className="flat-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#d9083c]">
              Local Backup & Restore
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Export your workouts to an open JSON format or restore data anytime.
            </p>
          </div>
          <Shield className="w-5 h-5 text-emerald-400" />
        </div>

        {lastBackupAt && (
          <div className="text-[11px] text-[var(--text-muted)] font-mono">
            Last exported: {new Date(lastBackupAt).toLocaleString()}
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={handleExportBackup}
            className="btn-primary text-xs flex items-center space-x-1.5 py-2.5 px-4"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Full JSON Backup</span>
          </button>

          <label className="btn-secondary text-xs flex items-center space-x-1.5 py-2.5 px-4 cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-[#d9083c]" />
            <span>Import Backup File</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {/* Import Preview Modal / Box */}
        {importPreview && (
          <div className="p-4 bg-[#121212] border border-[#2a2a2a] rounded-sm space-y-3 mt-4">
            {importPreview.valid ? (
              <>
                <div className="text-xs font-semibold text-white flex items-center space-x-1.5">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Valid Backup File Detected</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs font-mono text-[var(--text-muted)]">
                  <div>Workouts: <strong className="text-white">{importPreview.counts.workouts}</strong></div>
                  <div>Sets: <strong className="text-white">{importPreview.counts.sets}</strong></div>
                  <div>Exercises: <strong className="text-white">{importPreview.counts.exercises}</strong></div>
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <label className="flex items-center space-x-1.5 text-xs text-white">
                    <input
                      type="radio"
                      name="strategy"
                      checked={importStrategy === 'merge'}
                      onChange={() => setImportStrategy('merge')}
                    />
                    <span>Merge (keep newest records)</span>
                  </label>
                  <label className="flex items-center space-x-1.5 text-xs text-white">
                    <input
                      type="radio"
                      name="strategy"
                      checked={importStrategy === 'replace'}
                      onChange={() => setImportStrategy('replace')}
                    />
                    <span className="text-rose-400 font-semibold">Replace All Data</span>
                  </label>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <button
                    onClick={handleExecuteImport}
                    className="btn-primary text-xs py-2 px-4"
                  >
                    Confirm & Execute Import
                  </button>
                  <button
                    onClick={() => setImportPreview(null)}
                    className="btn-secondary text-xs py-2 px-3"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <div className="text-xs text-rose-400 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4" />
                <span>{importPreview.error}</span>
              </div>
            )}
          </div>
        )}

        {importSuccess && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-sm">
            Backup successfully restored into IndexedDB!
          </div>
        )}
      </div>

      {/* Storage Estimate */}
      <div className="flat-card p-5 space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          IndexedDB Offline Storage
        </h3>
        <div className="text-xs text-white font-mono flex items-center space-x-2">
          <HardDrive className="w-4 h-4 text-[#d9083c]" />
          <span>{storageStatus}</span>
        </div>
      </div>
    </div>
  );
}
