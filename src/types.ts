export interface Course {
  id: string;
  code: string;
  title: string;
  semester: string;
  description?: string;
  lecturer?: string;
}

export interface SlideEmbedding {
  id: number;
  course_id: string;
  course_code: string;
  document_name: string;
  page_number: number;
  title: string;
  content: string;
  tags: string[];
  embedding?: number[];
  similarity?: number;
}

export interface AcademicTask {
  id: string;
  course_id: string;
  course_code: string;
  task_type: 'quiz' | 'assignment' | 'exam' | 'study_session';
  title: string;
  slide_start: number | null;
  slide_end: number | null;
  due_at: string;
  status: 'pending' | 'completed';
  created_at: string;
}

export interface AlertDispatch {
  id: string;
  task_id: string;
  task_title?: string;
  course_code?: string;
  channel: 'whatsapp' | 'email';
  scheduled_for: string;
  recipient_phone_or_email: string;
  payload_text: string;
  status: 'scheduled' | 'dispatched';
  created_at: string;
}

export interface ReActStep {
  step_number: number;
  type: 'thought' | 'action' | 'observation' | 'clarification';
  thought?: string;
  action_name?: string;
  action_args?: Record<string, any>;
  observation?: any;
}

export interface Citation {
  slide_number: number;
  course_code: string;
  document_name: string;
  snippet: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  react_steps?: ReActStep[];
  citations?: Citation[];
  created_tasks?: AcademicTask[];
  created_alerts?: AlertDispatch[];
}

export interface SupabaseStatus {
  connected: boolean;
  url: string;
  lastSync: string;
  tables: {
    courses: number;
    slide_embeddings: number;
    academic_tasks: number;
    alert_dispatches: number;
  };
}

export interface DatabaseState {
  courses: Course[];
  slides: SlideEmbedding[];
  tasks: AcademicTask[];
  dispatches: AlertDispatch[];
  supabase?: SupabaseStatus;
}

export interface UmtSyncLog {
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

export interface UmtSyncStatus {
  config: {
    icalUrl: string;
    autoSyncEnabled: boolean;
    syncIntervalMinutes: number;
  };
  lastSyncTime: string | null;
  lastSyncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastSyncMessage: string | null;
  totalEventsSynced: number;
  newTasksAddedLastSync: number;
  recentLogs: UmtSyncLog[];
}

