import React, { useState } from 'react';
import { AcademicTask, Course } from '../types.js';
import { Calendar, CheckSquare, Clock, Plus, BookOpen, Layers, AlertCircle, Sparkles } from 'lucide-react';

interface AcademicTasksPanelProps {
  tasks: AcademicTask[];
  courses: Course[];
  onToggleStatus: (taskId: string) => void;
  onAddTask: (task: {
    course_code: string;
    task_type: 'quiz' | 'assignment' | 'exam' | 'study_session';
    title: string;
    due_timestamp: string;
    slide_range?: number[];
  }) => void;
}

export const AcademicTasksPanel: React.FC<AcademicTasksPanelProps> = ({
  tasks,
  courses,
  onToggleStatus,
  onAddTask
}) => {
  const [selectedCourse, setSelectedCourse] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // New task form state
  const [formCourse, setFormCourse] = useState<string>('CS-402');
  const [formType, setFormType] = useState<'quiz' | 'assignment' | 'exam' | 'study_session'>('quiz');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDueDate, setFormDueDate] = useState<string>('2026-09-30T10:00');
  const [formSlideStart, setFormSlideStart] = useState<string>('3');
  const [formSlideEnd, setFormSlideEnd] = useState<string>('8');

  // Student base time
  const BASE_TIME = new Date('2026-09-29T03:49:40-07:00').getTime();

  const filteredTasks = tasks.filter(t => {
    if (selectedCourse !== 'ALL' && t.course_code !== selectedCourse) return false;
    return true;
  });

  const formatCountdown = (dueIso: string) => {
    const diffMs = new Date(dueIso).getTime() - BASE_TIME;
    if (diffMs <= 0) return 'Deadline Passed';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    if (days > 0) return `${days}d ${remHours}h remaining`;
    return `${hours}h remaining`;
  };

  const getTaskTypeBadge = (type: string) => {
    switch (type) {
      case 'quiz':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 'assignment':
        return 'bg-blue-500/10 text-blue-300 border-blue-500/30';
      case 'exam':
        return 'bg-rose-500/10 text-rose-300 border-rose-500/30';
      default:
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const start = parseInt(formSlideStart, 10);
    const end = parseInt(formSlideEnd, 10);
    const slideRange = !isNaN(start) ? [start, !isNaN(end) ? end : start] : undefined;

    onAddTask({
      course_code: formCourse,
      task_type: formType,
      title: formTitle,
      due_timestamp: new Date(formDueDate).toISOString(),
      slide_range: slideRange
    });

    setFormTitle('');
    setShowAddModal(false);
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Top Filter and Add Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <button
            onClick={() => setSelectedCourse('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              selectedCourse === 'ALL'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            All Courses ({tasks.length})
          </button>
          {courses.map(c => {
            const count = tasks.filter(t => t.course_code === c.code).length;
            return (
              <button
                key={c.code}
                onClick={() => setSelectedCourse(c.code)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                  selectedCourse === c.code
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {c.code} ({count})
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors cursor-pointer shadow-sm shadow-indigo-600/20"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No academic tasks found for this filter.
          </div>
        ) : (
          filteredTasks.map(task => {
            const isCompleted = task.status === 'completed';
            const countdown = formatCountdown(task.due_at);

            return (
              <div
                key={task.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isCompleted
                    ? 'bg-slate-900/40 border-slate-800/60 opacity-60'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <button
                      onClick={() => onToggleStatus(task.id)}
                      className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-colors ${
                        isCompleted
                          ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                          : 'border-slate-600 hover:border-slate-400'
                      }`}
                    >
                      {isCompleted && <CheckSquare className="w-3.5 h-3.5" />}
                    </button>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[11px] font-bold text-indigo-400 px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                          {task.course_code}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getTaskTypeBadge(
                            task.task_type
                          )}`}
                        >
                          {task.task_type}
                        </span>
                        {task.slide_start !== null && (
                          <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded flex items-center gap-1">
                            <Layers className="w-3 h-3 text-slate-500" />
                            Slides {task.slide_start}
                            {task.slide_end && task.slide_end !== task.slide_start ? ` - ${task.slide_end}` : ''}
                          </span>
                        )}
                      </div>
                      <h4
                        className={`text-sm font-semibold mt-1 ${
                          isCompleted ? 'line-through text-slate-500' : 'text-slate-100'
                        }`}
                      >
                        {task.title}
                      </h4>
                    </div>
                  </div>

                  {/* Due Countdown */}
                  <div className="text-right shrink-0">
                    <div className="text-[11px] font-mono font-medium text-amber-400 flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      <span>{countdown}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                      {new Date(task.due_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Manual Task Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-3">Add Academic Task to Supabase</h3>
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Course</label>
                <select
                  value={formCourse}
                  onChange={e => setFormCourse(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                >
                  {courses.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Task Type</label>
                  <select
                    value={formType}
                    onChange={e => setFormType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  >
                    <option value="quiz">Quiz</option>
                    <option value="assignment">Assignment</option>
                    <option value="exam">Exam</option>
                    <option value="study_session">Study Session</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Due Date & Time</label>
                  <input
                    type="datetime-local"
                    value={formDueDate}
                    onChange={e => setFormDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. AI Quiz 2: Minimax & Alpha-Beta"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Slide Start</label>
                  <input
                    type="number"
                    value={formSlideStart}
                    onChange={e => setFormSlideStart(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Slide End</label>
                  <input
                    type="number"
                    value={formSlideEnd}
                    onChange={e => setFormSlideEnd(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 font-medium cursor-pointer"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
