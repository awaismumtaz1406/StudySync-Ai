import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Citation, SlideEmbedding } from '../types.js';
import { ReActStepViewer } from './ReActStepViewer.js';
import {
  Send,
  Sparkles,
  Bot,
  User,
  MessageSquare,
  Mail,
  BookOpen,
  ArrowRight,
  HelpCircle,
  Clock,
  Layers,
  CheckCircle2,
  CalendarCheck
} from 'lucide-react';

interface ChatWorkspaceProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, channel: 'whatsapp' | 'email') => void;
  isLoading: boolean;
  onCitationClick: (courseCode: string, slideNumber: number) => void;
}

const CAMPUS_PRESET_PROMPTS = [
  {
    label: 'AI Quiz & WhatsApp Alert',
    text: 'Kal mera AI ka quiz hai slides 3 se 8 tak, WhatsApp reminder lagao',
    category: 'Urdu + Scheduling'
  },
  {
    label: 'OS Slide 12 Paging Trace',
    text: 'Bhai OS ki slide 12 samjha de paging wali, kal exam hai',
    category: 'Urdu + RAG'
  },
  {
    label: 'SE-301 Assignment Deadline',
    text: 'Parso raat SE-301 assignment submit karni hai, email alert bhej do',
    category: 'Urdu + Email'
  },
  {
    label: 'Binary Search Trace (DSA)',
    text: 'Slide 4 ka binary search trace samjha do CS-201 mein',
    category: 'DSA + Slide RAG'
  },
  {
    label: 'Zero-Ambiguity Clarification Test',
    text: 'Quiz hai parso lekin course batana bhool gaya',
    category: 'Ambiguity Test'
  }
];

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  messages,
  onSendMessage,
  isLoading,
  onCitationClick
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText.trim(), selectedChannel);
    setInputText('');
  };

  const handlePresetClick = (text: string) => {
    onSendMessage(text, selectedChannel);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/60 rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl">
      {/* Top Bar with Language Vernacular Badge */}
      <div className="p-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="font-semibold text-slate-200">
            StudySync Academic Conversation Workspace
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
          <span className="hidden sm:inline">Vernacular:</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
            Roman Urdu + English
          </span>
        </div>
      </div>

      {/* Campus Presets Fast Chips */}
      <div className="px-4 py-2.5 bg-slate-900/40 border-b border-slate-800/60 overflow-x-auto flex items-center gap-2 text-xs">
        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Quick Campus Prompts:</span>
        </span>
        {CAMPUS_PRESET_PROMPTS.map((preset, idx) => (
          <button
            key={idx}
            onClick={() => handlePresetClick(preset.text)}
            disabled={isLoading}
            className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-indigo-950/60 hover:border-indigo-500/50 border border-slate-700/60 text-slate-300 hover:text-indigo-200 text-[11px] transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
            title={preset.text}
          >
            <span>{preset.label}</span>
          </button>
        ))}
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                  isUser
                    ? 'bg-gradient-to-tr from-slate-700 to-slate-600 text-white'
                    : 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble Container */}
              <div
                className={`max-w-[88%] sm:max-w-[80%] space-y-2 ${
                  isUser ? 'items-end text-right' : 'items-start text-left'
                }`}
              >
                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-tr-xs font-sans text-left'
                      : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-xs text-left'
                  }`}
                >
                  {/* Clean text representation */}
                  <div className="whitespace-pre-wrap font-sans space-y-2">
                    {msg.content}
                  </div>

                  {/* Verifiable Citations clickable pill badges */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5">
                      <div className="text-[11px] font-bold text-indigo-400 flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Verifiable Slide Citations (Supabase pgvector):</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.citations.map((cite, cIdx) => (
                          <button
                            key={cIdx}
                            onClick={() => onCitationClick(cite.course_code, cite.slide_number)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 font-mono text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                            title={`Inspect Slide ${cite.slide_number} of ${cite.course_code}`}
                          >
                            <span>
                              Slide {cite.slide_number} — {cite.course_code}
                            </span>
                            <ArrowRight className="w-3 h-3 text-indigo-400" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Scheduled Tasks Created Pill */}
                  {msg.created_tasks && msg.created_tasks.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CalendarCheck className="w-3.5 h-3.5" />
                        <span>Stored in academic_tasks:</span>
                      </span>
                      {msg.created_tasks.map(t => (
                        <span
                          key={t.id}
                          className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 font-mono text-[10.5px]"
                        >
                          {t.title} ({new Date(t.due_at).toLocaleDateString()})
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* ReAct Step Viewer (Thought -> Action -> Observation) */}
                {msg.react_steps && msg.react_steps.length > 0 && (
                  <ReActStepViewer steps={msg.react_steps} />
                )}

                <div className="text-[10px] text-slate-500 font-mono px-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Spinner with ReAct status */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-tl-xs space-y-2">
              <div className="flex items-center gap-2 text-indigo-400 font-medium">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>StudySync ReAct Engine Running...</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Parsing Roman Urdu vernacular • Querying pgvector slide embeddings • Resolving schedule
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSubmit} className="p-3 bg-slate-900/90 border-t border-slate-800 space-y-2">
        {/* Channel Selector for Proactive Alerts */}
        <div className="flex items-center justify-between text-xs px-1">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">Dispatch Channel:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSelectedChannel('whatsapp')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                  selectedChannel === 'whatsapp'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-3 h-3 text-emerald-400" />
                <span>WhatsApp (+92 300 8472910)</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedChannel('email')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                  selectedChannel === 'email'
                    ? 'bg-blue-950 text-blue-300 border border-blue-700'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Mail className="w-3 h-3 text-blue-400" />
                <span>Email</span>
              </button>
            </div>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            Press Enter to Send
          </span>
        </div>

        {/* Input box & Send button */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Type in Roman Urdu or English (e.g., 'Kal mera AI ka quiz hai slides 3 se 8 tak')..."
            disabled={isLoading}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-600/20"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Reason & Run</span>
          </button>
        </div>
      </form>
    </div>
  );
};
