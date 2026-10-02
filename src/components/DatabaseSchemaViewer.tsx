import React, { useState } from 'react';
import { DatabaseState } from '../types.js';
import { Database, Table, Key, HardDrive, CheckCircle2, ChevronRight, FileCode } from 'lucide-react';

interface DatabaseSchemaViewerProps {
  database: DatabaseState;
}

export const DatabaseSchemaViewer: React.FC<DatabaseSchemaViewerProps> = ({ database }) => {
  const [activeTable, setActiveTable] = useState<'courses' | 'slide_embeddings' | 'academic_tasks' | 'alert_dispatches'>('slide_embeddings');

  const tablesMeta = [
    {
      name: 'courses',
      count: database.courses.length,
      description: 'University courses catalog (code, title, semester, lecturer)',
      columns: [
        { name: 'id', type: 'uuid', key: true },
        { name: 'code', type: 'text', key: false },
        { name: 'title', type: 'text', key: false },
        { name: 'semester', type: 'text', key: false }
      ]
    },
    {
      name: 'slide_embeddings',
      count: database.slides.length,
      description: 'Lecture slide chunks indexed with pgvector 768-dim embeddings',
      columns: [
        { name: 'id', type: 'bigint', key: true },
        { name: 'course_id', type: 'uuid (FK)', key: false },
        { name: 'document_name', type: 'text', key: false },
        { name: 'page_number', type: 'integer', key: false },
        { name: 'content', type: 'text', key: false },
        { name: 'embedding', type: 'vector(768)', key: false }
      ]
    },
    {
      name: 'academic_tasks',
      count: database.tasks.length,
      description: 'Student deadlines, quizzes, assignments, and study sessions',
      columns: [
        { name: 'id', type: 'uuid', key: true },
        { name: 'course_id', type: 'uuid (FK)', key: false },
        { name: 'task_type', type: 'text (enum)', key: false },
        { name: 'title', type: 'text', key: false },
        { name: 'slide_start', type: 'integer', key: false },
        { name: 'slide_end', type: 'integer', key: false },
        { name: 'due_at', type: 'timestamptz', key: false },
        { name: 'status', type: 'text', key: false }
      ]
    },
    {
      name: 'alert_dispatches',
      count: database.dispatches.length,
      description: 'Scheduled notification countdowns dispatched to WhatsApp or Email',
      columns: [
        { name: 'id', type: 'uuid', key: true },
        { name: 'task_id', type: 'uuid (FK)', key: false },
        { name: 'channel', type: 'text (enum)', key: false },
        { name: 'scheduled_for', type: 'timestamptz', key: false },
        { name: 'recipient_phone_or_email', type: 'text', key: false },
        { name: 'payload_text', type: 'text', key: false }
      ]
    }
  ];

  return (
    <div className="h-full flex flex-col space-y-4 text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Database className="w-4 h-4 text-emerald-400" />
            <span>Supabase PostgreSQL Schema Contract</span>
          </h3>
          <p className="text-[11px] text-slate-400">
            Connected to <span className="text-emerald-400 font-mono">hyavrykjefoqntqycywp.supabase.co</span> with pgvector
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          <HardDrive className="w-3 h-3" />
          <span>Live Instance</span>
        </div>
      </div>

      {/* Table selector pills */}
      <div className="grid grid-cols-2 gap-2">
        {tablesMeta.map(t => (
          <button
            key={t.name}
            onClick={() => setActiveTable(t.name as any)}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              activeTable === t.name
                ? 'bg-indigo-950/40 border-indigo-500/50 shadow-sm'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-slate-100">{t.name}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                {t.count} rows
              </span>
            </div>
            <div className="text-[10px] text-slate-400 line-clamp-1 mt-1">
              {t.description}
            </div>
          </button>
        ))}
      </div>

      {/* Selected Table Schema & Records Preview */}
      <div className="flex-1 overflow-y-auto space-y-3">
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
            <Table className="w-3.5 h-3.5 text-indigo-400" />
            <span>Schema Columns for `{activeTable}`</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-mono text-[11px]">
            {tablesMeta
              .find(t => t.name === activeTable)
              ?.columns.map(col => (
                <div
                  key={col.name}
                  className="p-1.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between"
                >
                  <div className="flex items-center gap-1 text-slate-200">
                    {col.key && <Key className="w-3 h-3 text-amber-400" />}
                    <span>{col.name}</span>
                  </div>
                  <span className="text-slate-500 text-[10px]">{col.type}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Live Records JSON inspection */}
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>Live Database Records</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Displaying {(database as any)[activeTable]?.length || 0} entities
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 font-mono text-[10.5px] text-slate-300">
            <pre className="whitespace-pre-wrap">
              {JSON.stringify((database as any)[activeTable], null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
