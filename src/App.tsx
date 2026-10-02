import React, { useState, useEffect } from 'react';
import { safeFetchJson } from './api.js';
import { Header } from './components/Header.js';
import { ChatWorkspace } from './components/ChatWorkspace.js';
import { SlideViewer } from './components/SlideViewer.js';
import { VectorSearchExplorer } from './components/VectorSearchExplorer.js';
import { AcademicTasksPanel } from './components/AcademicTasksPanel.js';
import { AlertDispatchesPanel } from './components/AlertDispatchesPanel.js';
import { DatabaseSchemaViewer } from './components/DatabaseSchemaViewer.js';
import { UmtSyncModal } from './components/UmtSyncModal.js';
import {
  ChatMessage,
  SlideEmbedding,
  AcademicTask,
  AlertDispatch,
  DatabaseState
} from './types.js';
import { BookOpen, Search, CheckSquare, Bell, Database, Sparkles, Layers } from 'lucide-react';

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      content: `Salam bhai! Main hoon aapka StudySync AI academic copilot aur ReAct reasoning engine. 🎓\n\nAap Roman Urdu ya English campus vernacular mein koi bhi sawal pooch sakte hain:\n• "Kal mera AI ka quiz hai slides 3 se 8 tak, WhatsApp reminder lagao"\n• "Bhai OS ki slide 12 samjha de paging wali"\n• "Parso raat assignment submit karni hai"\n\nMaine aapke lecture slides ke 768-dim embeddings Supabase pgvector mein load kiye hue hain. Boliye, kis course se shuru karein?`,
      timestamp: '2026-09-29T03:49:40-07:00'
    }
  ]);

  const [database, setDatabase] = useState<DatabaseState>({
    courses: [],
    slides: [],
    tasks: [],
    dispatches: []
  });

  const [selectedSlide, setSelectedSlide] = useState<SlideEmbedding | null>(null);
  const [activeTab, setActiveTab] = useState<'viewer' | 'search' | 'tasks' | 'alerts' | 'schema'>('viewer');
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isUmtModalOpen, setIsUmtModalOpen] = useState(false);

  // Fetch initial database state from backend
  const fetchDatabaseState = async () => {
    try {
      const data = await safeFetchJson('/api/database');
      if (data && data.courses) {
        setDatabase(data);
        if (data.slides && data.slides.length > 0 && !selectedSlide) {
          // Default to Slide 5 of CS-402 (Minimax & Adversarial Search)
          const defaultSlide = data.slides.find((s: SlideEmbedding) => s.page_number === 5 && s.course_code === 'CS-402') || data.slides[0];
          setSelectedSlide(defaultSlide);
        }
      }
    } catch (err) {
      console.error('Failed to load database state:', err);
    }
  };

  useEffect(() => {
    fetchDatabaseState();
  }, []);

  // Handle student message submission
  const handleSendMessage = async (userText: string, channel: 'whatsapp' | 'email' = 'whatsapp') => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      content: userText,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const data = await safeFetchJson('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          history: messages.map(m => ({ sender: m.sender, content: m.content }))
        })
      });

      if (data && data.success) {
        const assistantMsg: ChatMessage = {
          id: `msg-${Date.now()}-ai`,
          sender: 'assistant',
          content: data.message,
          timestamp: new Date().toISOString(),
          react_steps: data.react_steps,
          citations: data.citations,
          created_tasks: data.created_tasks,
          created_alerts: data.created_alerts
        };

        setMessages(prev => [...prev, assistantMsg]);

        // Update database state if returned
        if (data.database) {
          setDatabase(data.database);
        } else {
          fetchDatabaseState();
        }

        // If citations returned, auto-focus on the first cited slide in Slide Viewer
        if (data.citations && data.citations.length > 0) {
          const firstCite = data.citations[0];
          const matched = database.slides.find(
            s => s.course_code === firstCite.course_code && s.page_number === firstCite.slide_number
          );
          if (matched) {
            setSelectedSlide(matched);
            setActiveTab('viewer');
          }
        }
      } else {
        const errorMsg: ChatMessage = {
          id: `msg-${Date.now()}-err`,
          sender: 'assistant',
          content: data.error || 'Bhai system mein masla aa gaya. Dobara try karein.',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-err`,
        sender: 'assistant',
        content: `Error: ${err?.message || 'Could not connect to StudySync backend server.'}`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle citation click from chat
  const handleCitationClick = (courseCode: string, slideNumber: number) => {
    const matched = database.slides.find(
      s => s.course_code === courseCode && s.page_number === slideNumber
    );
    if (matched) {
      setSelectedSlide(matched);
      setActiveTab('viewer');
    }
  };

  // Reset database handler
  const handleResetData = async () => {
    setIsResetting(true);
    try {
      const data = await safeFetchJson('/api/reset-data', { method: 'POST' });
      if (data && data.database) {
        setDatabase(data.database);
        if (data.database.slides.length > 0) {
          setSelectedSlide(data.database.slides[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsResetting(false);
    }
  };

  // Toggle task status
  const handleToggleTaskStatus = async (taskId: string) => {
    try {
      const data = await safeFetchJson(`/api/tasks/${taskId}/toggle`, { method: 'PATCH' });
      if (data && data.success && data.task) {
        setDatabase(prev => ({
          ...prev,
          tasks: prev.tasks.map(t => (t.id === taskId ? data.task : t))
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add task manually
  const handleAddTask = async (taskData: {
    course_code: string;
    task_type: 'quiz' | 'assignment' | 'exam' | 'study_session';
    title: string;
    due_timestamp: string;
    slide_range?: number[];
  }) => {
    try {
      const data = await safeFetchJson('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      if (data && data.success && data.task) {
        setDatabase(prev => ({
          ...prev,
          tasks: [data.task, ...prev.tasks]
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger dispatch alert
  const handleTriggerDispatch = async (dispatchId: string) => {
    try {
      const data = await safeFetchJson('/api/dispatches/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: dispatchId })
      });
      if (data && data.success && data.dispatch) {
        setDatabase(prev => ({
          ...prev,
          dispatches: prev.dispatches.map(d => (d.id === dispatchId ? data.dispatch : d))
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Header */}
      <Header
        onResetData={handleResetData}
        isResetting={isResetting}
        tasksCount={database.tasks.length}
        dispatchesCount={database.dispatches.length}
        onOpenAlertPreview={() => setActiveTab('alerts')}
        supabaseStatus={database.supabase}
        onOpenUmtSync={() => setIsUmtModalOpen(true)}
      />

      {/* UMT LMS Calendar Sync Modal */}
      <UmtSyncModal
        isOpen={isUmtModalOpen}
        onClose={() => setIsUmtModalOpen(false)}
        onSyncComplete={fetchDatabaseState}
      />

      {/* Main Dual-Column Academic Cockpit */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 min-h-0">
        {/* Left Column: ReAct Copilot & Campus Chat (7 cols on lg) */}
        <section className="lg:col-span-7 flex flex-col h-[750px] lg:h-[calc(100vh-100px)] min-h-[580px]">
          <ChatWorkspace
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            onCitationClick={handleCitationClick}
          />
        </section>

        {/* Right Column: Supabase pgvector & Academic Dashboard (5 cols on lg) */}
        <section className="lg:col-span-5 flex flex-col h-[750px] lg:h-[calc(100vh-100px)] min-h-[580px] bg-slate-900/60 rounded-2xl border border-slate-800/80 p-4 overflow-hidden shadow-xl">
          {/* Panel Tab Navigation Bar */}
          <div className="flex items-center gap-1 p-1 bg-slate-950/80 rounded-xl border border-slate-800/80 mb-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('viewer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 ${
                activeTab === 'viewer'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Slide Viewer</span>
            </button>

            <button
              onClick={() => setActiveTab('search')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 ${
                activeTab === 'search'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>pgvector Search</span>
            </button>

            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 ${
                activeTab === 'tasks'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Tasks ({database.tasks.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('alerts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 ${
                activeTab === 'alerts'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Alerts ({database.dispatches.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('schema')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 ${
                activeTab === 'schema'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Schema</span>
            </button>
          </div>

          {/* Tab Content Display Area */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'viewer' && (
              <SlideViewer
                slides={database.slides}
                selectedSlide={selectedSlide}
                onSelectSlide={slide => setSelectedSlide(slide)}
                onUploadSuccess={(newSlides, newDb) => {
                  if (newDb) {
                    setDatabase(newDb);
                  } else {
                    setDatabase(prev => ({
                      ...prev,
                      slides: [...newSlides, ...prev.slides.filter(s => !newSlides.some(n => n.id === s.id))]
                    }));
                  }
                }}
                onAskAboutSlide={slide => {
                  handleSendMessage(`Bhai ye slide samjha de: "${slide.title}" (${slide.course_code}, Slide #${slide.page_number})`);
                }}
              />
            )}

            {activeTab === 'search' && (
              <VectorSearchExplorer
                courses={database.courses}
                slides={database.slides}
                onSelectSlide={slide => {
                  setSelectedSlide(slide);
                  setActiveTab('viewer');
                }}
                selectedSlideId={selectedSlide?.id}
              />
            )}

            {activeTab === 'tasks' && (
              <AcademicTasksPanel
                tasks={database.tasks}
                courses={database.courses}
                onToggleStatus={handleToggleTaskStatus}
                onAddTask={handleAddTask}
              />
            )}

            {activeTab === 'alerts' && (
              <AlertDispatchesPanel
                dispatches={database.dispatches}
                onTriggerDispatch={handleTriggerDispatch}
              />
            )}

            {activeTab === 'schema' && (
              <DatabaseSchemaViewer database={database} />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
