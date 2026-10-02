export interface Course {
  id: string;
  code: string; // e.g. "CS-402"
  title: string; // e.g. "Artificial Intelligence"
  semester: string; // e.g. "Fall 2026"
  description?: string;
  lecturer?: string;
}

export interface SlideEmbedding {
  id: number;
  course_id: string;
  course_code: string;
  document_name: string; // e.g. "Lecture_04_Trees.pdf"
  page_number: number; // exact slide number
  title: string;
  content: string; // slide text chunk
  tags: string[];
  embedding: number[]; // 768-dim vector
}

export interface AcademicTask {
  id: string;
  course_id: string;
  course_code: string;
  task_type: 'quiz' | 'assignment' | 'exam' | 'study_session';
  title: string;
  slide_start: number | null;
  slide_end: number | null;
  due_at: string; // ISO 8601 string
  status: 'pending' | 'completed';
  created_at: string;
}

export interface AlertDispatch {
  id: string;
  task_id: string;
  task_title?: string;
  course_code?: string;
  channel: 'whatsapp' | 'email';
  scheduled_for: string; // ISO 8601 string
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

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  react_steps?: ReActStep[];
  citations?: Array<{
    slide_number: number;
    course_code: string;
    document_name: string;
    snippet: string;
  }>;
  created_tasks?: AcademicTask[];
  created_alerts?: AlertDispatch[];
}
