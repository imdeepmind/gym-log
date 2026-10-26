import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { exportJSONBackup, downloadBackupFile, validateBackupFile, executeImport, ImportPreview } from '@/services/backup';
import { exportSetsToCSV, downloadCSVFile, importFromCSV } from '@/services/csv';
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendTestNotification,
} from '@/services/notifications';
import {
  Download,
  Upload,
  Shield,
  Database,
  HardDrive,
  Check,
  AlertTriangle,
  Moon,
  Sun,
  FileSpreadsheet,
  Bell,
  Volume2,
  Smartphone,
  Sparkles,
} from 'lucide-react';

export function SettingsView() {
  const settingsRecords = useLiveQuery(() => db.settings.toArray(), [], []);
  const settingsMap = new Map(settingsRecords.map((s) => [s.key, s.value]));

  const unit = (settingsMap.get('unit') as 'kg' | 'lb') || 'kg';
  const rounding = (settingsMap.get('roundingIncrement') as number) || 2.5;
  const defaultRest = (settingsMap.get('defaultRestSec') as number) || 90;
  const betweenExerciseRest = (settingsMap.get('betweenExerciseRestSec') as number) || 120;
  const e1rmFormula = (settingsMap.get('e1rmFormula') as 'epley' | 'brzycki') || 'epley';
  const soundEnabled = settingsMap.has('soundEnabled') ? Boolean(settingsMap.get('soundEnabled')) : true;
  const vibrateEnabled = settingsMap.has('vibrateEnabled') ? Boolean(settingsMap.get('vibrateEnabled')) : true;
  const timerNotificationsEnabled = settingsMap.has('timerNotificationsEnabled')
    ? Boolean(settingsMap.get('timerNotificationsEnabled'))
    : true;
  const lastBackupAt = settingsMap.get('lastBackupAt') as string | undefined;

  const [notifPerm, setNotifPerm] = useState<string>(getNotificationPermission());
  const [testNotifSent, setTestNotifSent] = useState(false);
  const [storageStatus, setStorageStatus] = useState<string>('Checking...');
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importStrategy, setImportStrategy] = useState<'merge' | 'replace'>('merge');
  const [importSuccess, setImportSuccess] = useState(false);
  const [csvStatus, setCsvStatus] = useState<string | null>(null);

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

  const handleExportCSV = async () => {
    const csv = await exportSetsToCSV();
    downloadCSVFile(csv);
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const res = await importFromCSV(text);
        setCsvStatus(`Successfully imported ${res.importedWorkouts} workouts and ${res.importedSets} sets!`);
        setTimeout(() => setCsvStatus(null), 5000);
      } catch (err: any) {
        setCsvStatus(`Import error: ${err.message}`);
      }
    };
    reader.readAsText(file);
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

  const handleRequestPermission = async () => {
    const result = await requestNotificationPermission();
    setNotifPerm(result);
    if (result === 'granted') {
      await handleUpdateSetting('timerNotificationsEnabled', true);
      setTestNotifSent(true);
      await sendTestNotification();
      setTimeout(() => setTestNotifSent(false), 3000);
    }
  };

  const handleTestNotification = async () => {
    setTestNotifSent(true);
    await sendTestNotification();
    setTimeout(() => setTestNotifSent(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-200">
      <div className="border-b border-[var(--border-color)] pb-2">
        <h2 className="text-xl font-bold text-[var(--text-color)] tracking-tight">App Settings</h2>
        <p className="text-xs text-[var(--text-muted)]">
          Manage workout preferences, offline storage, and JSON backups
        </p>
      </div>

      {/* Units & Rounding */}
      <div className="flat-card p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#d9083c]">
          Units & Increment
        </h3>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-[var(--text-color)]">Default Weight Unit</div>
            <div className="text-xs text-[var(--text-muted)]">All values stored in canonical kg</div>
          </div>
          <div className="flex items-center space-x-1 bg-[var(--hover-bg)] p-1 rounded-sm border border-[var(--border-color)]">
            {(['kg', 'lb'] as const).map((u) => (
              <button
                key={u}
                onClick={() => handleUpdateSetting('unit', u)}
                className={`px-3 py-1 text-xs font-bold uppercase rounded-sm transition-colors ${unit === u ? 'bg-[#d9083c] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-color)]'
                  }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
          <div>
            <div className="text-sm font-semibold text-[var(--text-color)]">Plate Rounding Increment</div>
            <div className="text-xs text-[var(--text-muted)]">Stepper and suggestion increment</div>
          </div>
          <select
            value={rounding}
            onChange={(e) => handleUpdateSetting('roundingIncrement', parseFloat(e.target.value))}
            className="flat-input text-xs py-1.5 px-3 bg-[var(--card-bg)] text-[var(--text-color)] border-[var(--border-color)]"
          >
            <option value="1">1.0 kg / lb</option>
            <option value="1.25">1.25 kg</option>
            <option value="2.5">2.5 kg (Standard)</option>
            <option value="5">5.0 lb</option>
          </select>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
          <div>
            <div className="text-sm font-semibold text-[var(--text-color)]">Default Rest Duration</div>
            <div className="text-xs text-[var(--text-muted)]">Initial countdown between regular sets</div>
          </div>
          <select
            value={defaultRest}
            onChange={(e) => handleUpdateSetting('defaultRestSec', parseInt(e.target.value, 10))}
            className="flat-input text-xs py-1.5 px-3 bg-[var(--card-bg)] text-[var(--text-color)] border-[var(--border-color)]"
          >
            <option value="60">60 seconds (1 min)</option>
            <option value="90">90 seconds (1.5 min)</option>
            <option value="120">120 seconds (2 min)</option>
            <option value="180">180 seconds (3 min)</option>
          </select>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
          <div>
            <div className="text-sm font-semibold text-[var(--text-color)]">Between-Exercise Break</div>
            <div className="text-xs text-[var(--text-muted)]">Special rest time when a movement/exercise is finished</div>
          </div>
          <select
            value={betweenExerciseRest}
            onChange={(e) => handleUpdateSetting('betweenExerciseRestSec', parseInt(e.target.value, 10))}
            className="flat-input text-xs py-1.5 px-3 bg-[var(--card-bg)] text-[var(--text-color)] border-[var(--border-color)]"
          >
            <option value="60">60 seconds (1 min)</option>
            <option value="90">90 seconds (1.5 min)</option>
            <option value="120">120 seconds (2 min - Standard)</option>
            <option value="150">150 seconds (2.5 min)</option>
            <option value="180">180 seconds (3 min)</option>
            <option value="240">240 seconds (4 min)</option>
            <option value="300">300 seconds (5 min)</option>
          </select>
        </div>
      </div>

      {/* Notifications & Audio Alerts */}
      <div className="flat-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
          <div className="flex items-center space-x-2">
            <Bell className="w-4 h-4 text-[#d9083c]" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#d9083c]">
              Notifications & Alerts
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[var(--text-muted)]">
            Rest timer alerts
          </span>
        </div>

        {/* System Push Notification Permission & Toggle */}
        <div className="flex items-center justify-between">
          <div className="pr-4">
            <div className="text-sm font-semibold text-[var(--text-color)]">
              Rest Timer Notifications
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              Alert you when rest period or exercise break ends
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {notifPerm === 'granted' ? (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleTestNotification}
                  disabled={testNotifSent}
                  className="px-2.5 py-1 text-xs font-medium border border-[var(--border-color)] bg-[var(--hover-bg)] hover:bg-[var(--card-bg)] text-[var(--text-color)] rounded-sm transition-colors flex items-center space-x-1"
                  title="Send a quick test notification"
                >
                  <Sparkles className="w-3 h-3 text-[#d9083c]" />
                  <span>{testNotifSent ? 'Sent!' : 'Test'}</span>
                </button>
                <button
                  onClick={() =>
                    handleUpdateSetting(
                      'timerNotificationsEnabled',
                      !timerNotificationsEnabled
                    )
                  }
                  className={`px-3 py-1 text-xs font-bold uppercase rounded-sm transition-colors ${
                    timerNotificationsEnabled
                      ? 'bg-[#d9083c] text-white'
                      : 'bg-[var(--hover-bg)] text-[var(--text-muted)] border border-[var(--border-color)]'
                  }`}
                >
                  {timerNotificationsEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            ) : notifPerm === 'denied' ? (
              <span className="text-xs text-[#d9083c] font-medium border border-[#d9083c]/30 px-2 py-1 rounded-sm bg-[#d9083c]/10">
                Blocked in Browser
              </span>
            ) : notifPerm === 'unsupported' ? (
              <span className="text-xs text-[var(--text-muted)]">Not Supported</span>
            ) : (
              <button
                onClick={handleRequestPermission}
                className="btn-primary text-xs py-1.5 px-3 flex items-center space-x-1"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Enable Notifications</span>
              </button>
            )}
          </div>
        </div>

        {/* Audio Beep Chime */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
          <div className="flex items-center space-x-2.5">
            <Volume2 className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
            <div>
              <div className="text-sm font-semibold text-[var(--text-color)]">Audio Chime</div>
              <div className="text-xs text-[var(--text-muted)]">Two-tone chime when rest is complete</div>
            </div>
          </div>
          <button
            onClick={() => handleUpdateSetting('soundEnabled', !soundEnabled)}
            className={`px-3 py-1 text-xs font-bold uppercase rounded-sm transition-colors ${
              soundEnabled
                ? 'bg-[#d9083c] text-white'
                : 'bg-[var(--hover-bg)] text-[var(--text-muted)] border border-[var(--border-color)]'
            }`}
          >
            {soundEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Vibration Alert */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
          <div className="flex items-center space-x-2.5">
            <Smartphone className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
            <div>
              <div className="text-sm font-semibold text-[var(--text-color)]">Device Vibration</div>
              <div className="text-xs text-[var(--text-muted)]">Haptic buzz on phones & supported devices</div>
            </div>
          </div>
          <button
            onClick={() => handleUpdateSetting('vibrateEnabled', !vibrateEnabled)}
            className={`px-3 py-1 text-xs font-bold uppercase rounded-sm transition-colors ${
              vibrateEnabled
                ? 'bg-[#d9083c] text-white'
                : 'bg-[var(--hover-bg)] text-[var(--text-muted)] border border-[var(--border-color)]'
            }`}
          >
            {vibrateEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* PWA / iOS installation guidance note */}
        <div className="p-2.5 bg-[var(--hover-bg)] border border-[var(--border-color)] rounded-sm text-[11px] text-[var(--text-muted)] flex items-start space-x-2">
          <span className="text-[#d9083c] font-bold">iOS / Safari:</span>
          <span>
            To receive notifications on iPhone or iPad, tap <strong>Share</strong> in Safari and tap <strong>"Add to Home Screen"</strong> (requires iOS 16.4+).
          </span>
        </div>
      </div>

      {/* Calculations & Formulas */}
      <div className="flat-card p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#d9083c]">
          Calculations
        </h3>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-[var(--text-color)]">Estimated 1RM Formula</div>
            <div className="text-xs text-[var(--text-muted)]">Used for strength progression charts</div>
          </div>
          <select
            value={e1rmFormula}
            onChange={(e) => handleUpdateSetting('e1rmFormula', e.target.value)}
            className="flat-input text-xs py-1.5 px-3 bg-[var(--card-bg)] text-[var(--text-color)] border-[var(--border-color)]"
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

          <button
            onClick={handleExportCSV}
            className="btn-secondary text-xs flex items-center space-x-1.5 py-2.5 px-4 hover:border-[#d9083c] transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#d9083c]" />
            <span>Export CSV Spreadsheet</span>
          </button>

          <label className="btn-secondary text-xs flex items-center space-x-1.5 py-2.5 px-4 cursor-pointer hover:border-[#d9083c] transition-colors">
            <Upload className="w-3.5 h-3.5 text-[#d9083c]" />
            <span>Import Strong / Hevy CSV</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              className="hidden"
            />
          </label>

          <label className="btn-secondary text-xs flex items-center space-x-1.5 py-2.5 px-4 cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span>Restore JSON Backup</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {csvStatus && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-sm">
            {csvStatus}
          </div>
        )}

        {/* Import Preview Modal / Box */}
        {importPreview && (
          <div className="p-4 bg-[var(--hover-bg)] border border-[var(--border-color)] rounded-sm space-y-3 mt-4">
            {importPreview.valid ? (
              <>
                <div className="text-xs font-semibold text-[var(--text-color)] flex items-center space-x-1.5">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Valid Backup File Detected</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs font-mono text-[var(--text-muted)]">
                  <div>Workouts: <strong className="text-[var(--text-color)]">{importPreview.counts.workouts}</strong></div>
                  <div>Sets: <strong className="text-[var(--text-color)]">{importPreview.counts.sets}</strong></div>
                  <div>Exercises: <strong className="text-[var(--text-color)]">{importPreview.counts.exercises}</strong></div>
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <label className="flex items-center space-x-1.5 text-xs text-[var(--text-color)]">
                    <input
                      type="radio"
                      name="strategy"
                      checked={importStrategy === 'merge'}
                      onChange={() => setImportStrategy('merge')}
                    />
                    <span>Merge (keep newest records)</span>
                  </label>
                  <label className="flex items-center space-x-1.5 text-xs text-[var(--text-color)]">
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
    </div>
  );
}
