import React, { useState } from 'react';
import { ReActStep } from '../types.js';
import { Brain, Zap, Eye, HelpCircle, ChevronDown, ChevronUp, Code2, Database } from 'lucide-react';

interface ReActStepViewerProps {
  steps: ReActStep[];
}

export const ReActStepViewer: React.FC<ReActStepViewerProps> = ({ steps }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!steps || steps.length === 0) return null;

  return (
    <div className="mt-3 mb-2 rounded-xl border border-slate-700/70 bg-slate-900/60 overflow-hidden text-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2 flex items-center justify-between bg-slate-800/60 hover:bg-slate-800 transition-colors text-slate-300 font-medium cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Brain className="w-3.5 h-3.5" />
          </div>
          <span>ReAct Autonomous Reasoning Chain</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-900/40 text-indigo-300 border border-indigo-700/50">
            {steps.length} {steps.length === 1 ? 'Step' : 'Steps'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-slate-400">
          <span className="text-[11px]">{isOpen ? 'Hide trace' : 'Inspect trace'}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-3.5 space-y-3 bg-slate-950/70 divide-y divide-slate-800/60">
          {steps.map((step, idx) => (
            <div key={idx} className="pt-2 first:pt-0">
              {/* Step Title Header */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-400 font-mono text-[10px] flex items-center justify-center font-bold">
                  {step.step_number}
                </span>

                {step.type === 'thought' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 font-semibold text-[11px]">
                    <Brain className="w-3 h-3 text-purple-400" />
                    Thought
                  </span>
                )}

                {step.type === 'action' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold text-[11px]">
                    <Zap className="w-3 h-3 text-amber-400" />
                    Action: {step.action_name}
                  </span>
                )}

                {step.type === 'observation' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold text-[11px]">
                    <Eye className="w-3 h-3 text-emerald-400" />
                    Observation
                  </span>
                )}

                {step.type === 'clarification' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/20 font-semibold text-[11px]">
                    <HelpCircle className="w-3 h-3 text-rose-400" />
                    Zero-Ambiguity Check
                  </span>
                )}
              </div>

              {/* Thought text */}
              {step.thought && (
                <p className="text-slate-300 leading-relaxed font-sans pl-6 text-[11.5px] italic">
                  "{step.thought}"
                </p>
              )}

              {/* Action Arguments JSON */}
              {step.action_args && (
                <div className="pl-6 mt-1.5">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-amber-200/90 overflow-x-auto">
                    <div className="text-[10px] text-slate-400 font-sans mb-1 flex items-center gap-1">
                      <Code2 className="w-3 h-3 text-amber-400" />
                      <span>Parameters invoked:</span>
                    </div>
                    <pre className="whitespace-pre-wrap">{JSON.stringify(step.action_args, null, 2)}</pre>
                  </div>
                </div>
              )}

              {/* Observation JSON */}
              {step.observation && (
                <div className="pl-6 mt-1.5">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-300/90 overflow-x-auto">
                    <div className="text-[10px] text-slate-400 font-sans mb-1 flex items-center gap-1">
                      <Database className="w-3 h-3 text-emerald-400" />
                      <span>Database return:</span>
                    </div>
                    <pre className="whitespace-pre-wrap">
                      {typeof step.observation === 'object'
                        ? JSON.stringify(step.observation, null, 2)
                        : String(step.observation)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
