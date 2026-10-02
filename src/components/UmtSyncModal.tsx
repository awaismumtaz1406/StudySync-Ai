import React, { useState, useEffect } from 'react';
import { UmtSyncStatus } from '../types.js';
import { safeFetchJson } from '../api.js';
import {
  Calendar,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  ExternalLink,
  X,
  Bell,
  MessageSquare,
  Mail,
  GraduationCap
} from 'lucide-react';

interface UmtSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

const DEFAULT_DEMO_URL = 'https://lms.umt.edu.pk/calendar/export_execute.php?preset_what=all&preset_time=recentupcoming&userid=54812&authtoken=demo_umt_token';

export const UmtSyncModal: React.FC<UmtSyncModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete
}) => {
  const [icalUrl, setIcalUrl] = useState('');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [syncInterval, setSyncInterval] = useState(15);
  const [status, setStatus] = useState<UmtSyncStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch current status from backend
  const fetchStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const data = await safeFetchJson('/api/umt/status');
      if (data && data.status) {
        setStatus(data.status);
        setIcalUrl(data.status.config.icalUrl || DEFAULT_DEMO_URL);
        setAutoSyncEnabled(data.status.config.autoSyncEnabled);
        setSyncInterval(data.status.config.syncIntervalMinutes || 15);
      }
    } catch (err) {
      console.error('Failed to fetch UMT sync status:', err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setFeedbackMsg(null);
    }
  }, [isOpen]);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setFeedbackMsg(null);
    try {
      const data = await safeFetchJson('/api/umt/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: icalUrl })
      });

      if (data && data.result && data.result.success) {
        setFeedbackMsg({
          type: 'success',
          text: data.result.message || 'Successfully synchronized with UMT LMS calendar!'
        });
        setStatus(data.status);
        if (onSyncComplete) onSyncComplete();
      } else {
        setFeedbackMsg({
          type: 'error',
          text: data?.result?.message || data?.error || 'Failed to sync with UMT LMS'
        });
      }
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err?.message || 'Network error while contacting sync service'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      const data = await safeFetchJson('/api/umt/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          icalUrl,
          autoSyncEnabled,
          syncIntervalMinutes: syncInterval
        })
      });
      if (data && data.status) {
        setStatus(data.status);
        setFeedbackMsg({
          type: 'success',
          text: 'UMT LMS sync configuration saved successfully!'
        });
      }
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err?.message || 'Could not save configuration'
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-indigo-600 p-0.5 shadow-md">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  UMT LMS Background Sync
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  node-ical active
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Automatic academic deadline importing & WhatsApp/Email dispatch
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Status Alert Banner */}
          {feedbackMsg && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                feedbackMsg.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-800/50 text-rose-300'
              }`}
            >
              {feedbackMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="text-[11.5px] leading-relaxed font-medium">
                {feedbackMsg.text}
              </div>
            </div>
          )}

          {/* Sync Status Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-[10px] text-slate-500 block">Sync Status</span>
              <div className="flex items-center gap-1.5 mt-1 font-semibold text-slate-200">
                <span
                  className={`w-2 h-2 rounded-full ${
                    status?.lastSyncStatus === 'success'
                      ? 'bg-emerald-400'
                      : status?.lastSyncStatus === 'syncing'
                      ? 'bg-amber-400 animate-ping'
                      : 'bg-indigo-400'
                  }`}
                />
                <span className="capitalize">{status?.lastSyncStatus || 'Idle'}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-[10px] text-slate-500 block">Last Synced</span>
              <div className="font-semibold text-slate-200 mt-1 font-mono text-[11px] truncate">
                {status?.lastSyncTime
                  ? new Date(status.lastSyncTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })
                  : 'Never'}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-[10px] text-slate-500 block">Total Synced</span>
              <div className="font-semibold text-indigo-400 mt-1 font-mono text-sm">
                {status?.totalEventsSynced || 0} events
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-[10px] text-slate-500 block">Auto Interval</span>
              <div className="font-semibold text-slate-200 mt-1 font-mono text-[11px]">
                Every {status?.config.syncIntervalMinutes || 15}m
              </div>
            </div>
          </div>

          {/* iCal URL Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>UMT LMS Calendar iCal URL</span>
              </label>
              <button
                type="button"
                onClick={() => setIcalUrl(DEFAULT_DEMO_URL)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
              >
                Use Demo Feed
              </button>
            </div>

            <input
              type="text"
              value={icalUrl}
              onChange={e => setIcalUrl(e.target.value)}
              placeholder="e.g. https://lms.umt.edu.pk/calendar/export_execute.php?preset_what=all&..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-slate-200 font-mono text-xs focus:outline-none transition-colors"
            />

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 leading-relaxed space-y-1">
              <div className="font-semibold text-slate-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>How to get your UMT iCal URL:</span>
              </div>
              <p>
                1. Login to UMT LMS (<span className="text-indigo-300 font-mono">lms.umt.edu.pk</span>).
                <br />
                2. Go to <strong>Calendar</strong> &rarr; Click <strong>Export calendar</strong>.
                <br />
                3. Choose <strong>All events</strong> & <strong>Recent and next 60 days</strong>.
                <br />
                4. Click <strong>Get calendar URL</strong> and paste the link above.
              </p>
            </div>
          </div>

          {/* Auto-Sync Configuration Controls */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoSync"
                checked={autoSyncEnabled}
                onChange={e => setAutoSyncEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="autoSync" className="text-slate-300 font-medium cursor-pointer">
                Enable Background Periodic Auto-Sync
              </label>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-[11px]">Interval:</span>
              <select
                value={syncInterval}
                onChange={e => setSyncInterval(Number(e.target.value))}
                className="bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-2 py-1 text-[11px] font-mono cursor-pointer"
              >
                <option value={5}>Every 5 mins</option>
                <option value={15}>Every 15 mins</option>
                <option value={30}>Every 30 mins</option>
                <option value={60}>Every 1 hour</option>
              </select>
            </div>
          </div>

          {/* Recent Sync Logs */}
          {status?.recentLogs && status.recentLogs.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Sync Activity Logs
              </span>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 max-h-36 overflow-y-auto space-y-1.5 font-mono text-[10.5px]">
                {status.recentLogs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-slate-600 shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span
                      className={`font-semibold shrink-0 ${
                        log.level === 'success'
                          ? 'text-emerald-400'
                          : log.level === 'error'
                          ? 'text-rose-400'
                          : log.level === 'warn'
                          ? 'text-amber-400'
                          : 'text-indigo-400'
                      }`}
                    >
                      [{log.level.toUpperCase()}]
                    </span>
                    <span className="text-slate-300 font-sans leading-tight">
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 text-xs">
          <button
            type="button"
            onClick={handleSaveConfig}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors cursor-pointer"
          >
            Save URL & Settings
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-emerald-600/20 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
