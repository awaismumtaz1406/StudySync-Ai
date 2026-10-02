# StudySync AI 🎓⚡
> **An Autonomous Bilingual Academic Copilot & ReAct Reasoning Engine for University Students**

StudySync AI bridges the gap between how university students naturally communicate (mixed Roman Urdu, campus vernacular, and casual English) and how academic tools operate. It combines a ReAct (Reasoning + Acting) agent, course-scoped slide vector search via Supabase `pgvector`, and automated scheduling triggers for WhatsApp and Email notifications.

---

## 📌 Problem Statement

- **The Vernacular & Context Gap:** Standard LLM assistants expect clean, formal English. University students frequently communicate deadlines in code-switching vernacular (e.g., *"Kal mera AI ka quiz hai slides 3 se 8 tak"*), leading to broken intent recognition and missed dates.
- **Academic Hallucinations:** Generic AI models answer queries from generalized web corpora rather than the student's actual professor-provided lecture slides, missing exact syllabus bounds, page numbers, and custom definitions.
- **Fragmented Academic Workflows:** Deadlines live in chat groups, slides live on learning management portals, and calendars require manual data entry. There is no unified system tying lecture slide content directly to schedule alerts.

---

## 🚀 Key Features

- **🗣️ Bilingual Campus Vernacular Parser:** Comprehends Roman Urdu and English code-switching. Automatically resolves relative temporal expressions (*"kal"*, *"parso"*, *"agle hafte"*) into ISO 8601 timestamps.
- **📑 Course-Scoped Slide RAG (`pgvector`):** Ingests PDF lecture decks, indexes 768-dimensional text embeddings, and executes cosine similarity searches constrained strictly to course codes and slide page boundaries.
- **🤖 Autonomous ReAct Engine:** Utilizes function calling to reason across user intent, query vector slides, write tasks to PostgreSQL, and stage multi-channel alert payloads.
- **📲 Automated Alert Dispatching:** Registers proactive countdown alerts targeted for student communication channels (WhatsApp and Email).

---

## 🏗️ Architecture & Data Flow

```
[ Student Prompt (Roman Urdu / English) ]
                   │
                   ▼
┌────────────────────────────────────────────────────────┐
│  Agent Brain: Gemini Flash / ReAct Engine              │
│  - Intent Recognition & Roman Urdu Parsing             │
│  - Relative Time Resolution ("kal" -> ISO Timestamp)   │
│  - Structured Function Calling                         │
└──────────┬───────────────────┬─────────────────────────┘
           │                   │
           ▼                   ▼
┌──────────────────────┐  ┌──────────────────────────────┐
│  Vector Search (RAG) │  │  Structured Tool Calling     │
│  - 768-dim Embeddings│  │  - Task Upsert (PostgreSQL)  │
│  - pgvector HNSW     │  │  - Alert Dispatch (WhatsApp) │
└──────────┬───────────┘  └──────────────┬───────────────┘
           │                             │
           ▼                             ▼
┌────────────────────────────────────────────────────────┐
│  Supabase (pgvector + PostgreSQL Relational Store)     │
└────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

- **AI & Reasoning:** Google Gemini (`gemini-1.5-flash`), ReAct Pattern, Function Calling
- **Embeddings:** `text-embedding-004` (768 dimensions)
- **Database & Storage:** Supabase (PostgreSQL with `pgvector` & HNSW indexing)
- **Backend / Routing:** Node.js / Express, Base64 JSON Payload Pipeline
- **Frontend / Client:** React, Vite, Tailwind CSS

---

## 🗄️ Database Schema (Supabase)

```sql
-- 1. Vector Search Extension
create extension if not exists vector;

-- 2. Slide Embeddings Table
create table slide_embeddings (
  id bigserial primary key,
  course_code text not null,
  document_name text not null,
  page_number int not null,
  content text not null,
  embedding vector(768)
);

create index on slide_embeddings using hnsw (embedding vector_cosine_ops);

-- 3. Academic Tasks Table
create table academic_tasks (
  id uuid primary key default gen_random_uuid(),
  course_code text not null,
  task_type text not null check (task_type in ('quiz', 'assignment', 'exam', 'study_session')),
  title text not null,
  slide_start int,
  slide_end int,
  due_at timestamptz not null,
  status text default 'pending',
  created_at timestamptz default now()
);

-- 4. Alerts Dispatch Table
create table alert_dispatches (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('whatsapp', 'email')),
  scheduled_for timestamptz not null,
  message text not null,
  status text default 'scheduled',
  created_at timestamptz default now()
);

-- 5. RPC Similarity Match Function
create or replace function match_slides (
  query_embedding vector(768),
  filter_course text,
  match_count int default 4
)
returns table (
  id bigint,
  page_number int,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    slide_embeddings.id,
    slide_embeddings.page_number,
    slide_embeddings.content,
    1 - (slide_embeddings.embedding <=> query_embedding) as similarity
  from slide_embeddings
  where slide_embeddings.course_code = filter_course
  order by slide_embeddings.embedding <=> query_embedding
  limit match_count;
end;
$$;
```

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory:

```env
# Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key

# Supabase Credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Server Port
PORT=5000
```

---

## 🚦 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/studysync-ai.git
cd studysync-ai
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Database
Run the SQL queries in the `Database Schema` section directly inside your **Supabase SQL Editor**.

### 4. Run Development Server
```bash
npm run dev
```

---

## 🧪 Example Test Prompts

1. **Bilingual Task Scheduling:**
   > *"Sir ne bola hai kal subah 10 baje CS-402 ka quiz hai slides 4 se 9 tak. Schedule bana do aur reminder set karo."*
   - **Agent Action:** Extracts `CS-402`, sets task for tomorrow at `10:00 AM`, assigns slide bounds `[4, 9]`, and calls `supabase_upsert_task`.

2. **Scoped Slide Q&A (RAG):**
   > *"CS-402 ke Lecture 3 ki slide 6 pe jo Binary Search Tree ki time complexity di hai wo explain karo."*
   - **Agent Action:** Invokes `supabase_vector_search`, extracts the slide chunk, and explains the concept with verifiable citation tags.

---

## 💡 Engineering Highlights

- **Robust Large File Pipeline:** Replaced fragile multi-part proxy uploads with buffered base64 streaming and explicit 50MB payload limits, preventing unexpected SPA fallback errors during lecture deck ingestion.
- **Unified Relational & Vector Architecture:** Combined slide embeddings and relational task rows in a single PostgreSQL instance, eliminating the overhead and cost of standalone vector providers.