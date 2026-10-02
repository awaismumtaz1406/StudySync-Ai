import React from 'react';
import { Sparkles, Database, Clock, RefreshCw, Cpu, BookOpen, BellRing, CheckCircle2, GraduationCap, CalendarSync } from 'lucide-react';
import { SupabaseStatus } from '../types.js';

interface HeaderProps {
  onResetData: () => void;
  isResetting: boolean;
  tasksCount: number;
  dispatchesCount: number;
  onOpenAlertPreview: () => void;
  supabaseStatus?: SupabaseStatus;
  onOpenUmtSync: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onResetData,
  isResetting,
  tasksCount,
  dispatchesCount,
  onOpenAlertPreview,
  supabaseStatus,
  onOpenUmtSync
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-6 py-3">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-emerald-500 p-0.5 shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                StudySync AI
              </h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                ReAct Copilot
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
              <span>Autonomous University Copilot</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                Roman Urdu & English Vernacular
              </span>
            </p>
          </div>
        </div>

        {/* Badges & Clock */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Reference Time */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono text-[11px]">Tue, Sep 29, 2026 (03:49 AM)</span>
          </div>

          {/* Supabase pgvector Status */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono text-[11px]">
              {supabaseStatus?.url ? supabaseStatus.url.replace('https://', '') : 'hyavrykjefoqntqycywp.supabase.co'}
            </span>
          </div>

          {/* Quick Counter */}
          <button
            onClick={onOpenAlertPreview}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-950/50 hover:bg-indigo-900/50 border border-indigo-700/50 text-indigo-300 transition-colors cursor-pointer"
            title="View Proactive Alerts"
          >
            <BellRing className="w-3.5 h-3.5 text-indigo-400" />
            <span>{dispatchesCount} Alerts</span>
          </button>

          {/* UMT LMS Calendar Sync Button */}
          <button
            onClick={onOpenUmtSync}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/60 text-emerald-300 text-xs font-medium transition-colors cursor-pointer shadow-sm shadow-emerald-900/20"
            title="Configure UMT LMS Calendar iCal sync"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
            <span>UMT Sync</span>
          </button>

          {/* Reset database button */}
          <button
            onClick={onResetData}
            disabled={isResetting}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Reset to default course catalog"
          >
            <RefreshCw className={`w-3 h-3 ${isResetting ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Reset DB</span>
          </button>
        </div>
      </div>
    </header>
  );
};
