import React, { useState } from 'react';
import { AlertDispatch } from '../types.js';
import { MessageSquare, Mail, Bell, Play, CheckCircle2, Clock, Smartphone, ShieldCheck, X } from 'lucide-react';

interface AlertDispatchesPanelProps {
  dispatches: AlertDispatch[];
  onTriggerDispatch: (id: string) => void;
}

export const AlertDispatchesPanel: React.FC<AlertDispatchesPanelProps> = ({
  dispatches,
  onTriggerDispatch
}) => {
  const [activePreview, setActivePreview] = useState<AlertDispatch | null>(null);

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-indigo-400" />
            <span>Alert Dispatches</span>
          </h3>
          <p className="text-[11px] text-slate-400">
            Proactive WhatsApp & Email study countdowns registered in Supabase
          </p>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 font-mono text-[11px] border border-indigo-500/20">
          {dispatches.length} Alerts
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {dispatches.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No alerts scheduled yet. Ask StudySync AI to schedule a reminder!
          </div>
        ) : (
          dispatches.map(item => {
            const isWhatsApp = item.channel === 'whatsapp';
            return (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/90 hover:border-slate-700 transition-all space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        isWhatsApp
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}
                    >
                      {isWhatsApp ? <MessageSquare className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-200 uppercase tracking-wider">
                          {item.channel} Alert
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {item.recipient_phone_or_email}
                        </span>
                      </div>
                      <div className="text-[11px] text-indigo-400 font-mono">
                        {item.course_code || 'CS-402'} • {item.task_title || 'Academic Deadline'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border ${
                        item.status === 'dispatched'
                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                          : 'bg-amber-950/60 text-amber-300 border-amber-800'
                      }`}
                    >
                      {item.status.toUpperCase()}
                    </span>
                    <button
                      onClick={() => {
                        onTriggerDispatch(item.id);
                        setActivePreview(item);
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                      title="Simulate dispatch notification"
                    >
                      <Play className="w-3 h-3 text-indigo-400" />
                      <span>Preview</span>
                    </button>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 font-sans leading-relaxed">
                  "{item.payload_text}"
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-800/60">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Scheduled for: {new Date(item.scheduled_for).toLocaleString()}</span>
                  </div>
                  <span>ID: {item.id.slice(0, 10)}...</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Realistic Simulated Dispatch Modal (WhatsApp / University Webmail) */}
      {activePreview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-slate-200">
                  Live Dispatch Simulation
                </span>
              </div>
              <button
                onClick={() => setActivePreview(null)}
                className="w-6 h-6 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Simulated Notification Container */}
            {activePreview.channel === 'whatsapp' ? (
              // WhatsApp Chat Preview
              <div className="bg-[#0b141a] text-slate-100 flex flex-col h-80">
                <div className="px-4 py-2.5 bg-[#202c33] flex items-center justify-between border-b border-[#222e35]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center text-white font-bold text-xs">
                      SS
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-white">StudySync AI Bot</div>
                      <div className="text-[10px] text-emerald-400">Online • Academic Alert Channel</div>
                    </div>
                  </div>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-2 bg-[radial-gradient(#1f2c34_1px,transparent_1px)] [background-size:16px_16px]">
                  <div className="flex justify-center">
                    <span className="px-2 py-0.5 rounded bg-[#182229] text-[10px] text-[#8696a0] font-mono shadow-xs">
                      Today • Proactive Countdown
                    </span>
                  </div>

                  <div className="max-w-[85%] ml-auto bg-[#005c4b] p-3 rounded-2xl rounded-tr-xs shadow-md text-xs text-white leading-relaxed">
                    <div className="font-bold text-[11px] text-emerald-200 mb-1">
                      📚 {activePreview.course_code || 'CAMPUS'} STUDY ALERT
                    </div>
                    <p>{activePreview.payload_text}</p>
                    <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-emerald-200/80 font-mono">
                      <span>3:49 AM</span>
                      <span className="text-cyan-300">✓✓</span>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 bg-[#202c33] text-[11px] text-[#8696a0] text-center border-t border-[#222e35]">
                  Dispatched to {activePreview.recipient_phone_or_email}
                </div>
              </div>
            ) : (
              // University Email Preview
              <div className="bg-slate-950 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-semibold text-slate-200">
                      University Mail Notification
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">Inbox</span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="text-slate-400">
                    <span className="text-slate-500">From:</span> alerts@studysync.university.edu
                  </div>
                  <div className="text-slate-400">
                    <span className="text-slate-500">To:</span> {activePreview.recipient_phone_or_email}
                  </div>
                  <div className="text-white font-semibold pt-1">
                    [StudySync Urgent] {activePreview.task_title || 'Academic Countdown'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans">
                  {activePreview.payload_text}
                </div>

                <div className="text-[10px] text-slate-500 text-center font-mono pt-1">
                  Sent via StudySync AI Notification Gateway
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
