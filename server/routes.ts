import { Router, Request, Response } from 'express';
import multer from 'multer';
import { dbStore } from './db.js';
import { executeReActCycle } from './reactEngine.js';
import { umtSyncService } from './umtSync.js';
import { processAndUploadSlideDeck } from './slideUpload.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

export const apiRouter = Router();

// Chat & ReAct Execution Endpoint
apiRouter.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message text is required' });
      return;
    }

    const result = await executeReActCycle(message, history || []);

    res.json({
      success: true,
      message: result.content,
      react_steps: result.react_steps,
      citations: result.citations,
      created_tasks: result.created_tasks,
      created_alerts: result.created_alerts,
      database: {
        courses: dbStore.getCourses(),
        slides: dbStore.getSlides(),
        tasks: dbStore.getTasks(),
        dispatches: dbStore.getDispatches(),
        supabase: dbStore.getSupabaseStatus()
      }
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Failed to process academic query',
      details: error?.message || String(error)
    });
  }
});

// Database state endpoint
apiRouter.get('/database', (req: Request, res: Response) => {
  res.json({
    courses: dbStore.getCourses(),
    slides: dbStore.getSlides(),
    tasks: dbStore.getTasks(),
    dispatches: dbStore.getDispatches(),
    supabase: dbStore.getSupabaseStatus()
  });
});

// Direct pgvector search endpoint (interactive test tool)
apiRouter.post('/vector-search', (req: Request, res: Response) => {
  try {
    const { query, course_code, match_count, start_page, end_page } = req.body;
    if (!query || !course_code) {
      res.status(400).json({ error: 'query and course_code are required' });
      return;
    }

    const matches = dbStore.vectorSearch({
      query,
      course_code,
      match_count: match_count ? parseInt(match_count, 10) : 4,
      start_page: start_page ? parseInt(start_page, 10) : undefined,
      end_page: end_page ? parseInt(end_page, 10) : undefined
    });

    res.json({ success: true, count: matches.length, matches });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Search failed' });
  }
});

// Core slide upload processing routine
async function handleSlideUploadCore(req: Request, res: Response) {
  try {
    let fileBuffer: Buffer | null = null;
    let fileName = 'Uploaded_Lecture_Slides.pdf';
    let courseCode = (req.body?.course_code || req.body?.courseCode || 'CS-402').trim();

    if (req.file && req.file.buffer) {
      fileBuffer = req.file.buffer;
      fileName = req.file.originalname || fileName;
    } else if (req.body?.fileBase64) {
      // Support base64 upload
      const base64Str = String(req.body.fileBase64).replace(/^data:.*?;base64,/, '').trim();
      fileBuffer = Buffer.from(base64Str, 'base64');
      if (req.body.fileName) fileName = req.body.fileName;
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid file provided. Please attach a PDF or PPTX file via FormData (field "file") or JSON fileBase64.'
      });
    }

    const result = await processAndUploadSlideDeck({
      buffer: fileBuffer,
      fileName,
      courseCode
    });

    return res.status(200).json({
      success: true,
      documentName: result.documentName,
      courseCode: result.courseCode,
      totalPages: result.totalPages,
      slides: result.slides,
      message: result.message,
      database: {
        courses: dbStore.getCourses(),
        slides: dbStore.getSlides(),
        tasks: dbStore.getTasks(),
        dispatches: dbStore.getDispatches(),
        supabase: dbStore.getSupabaseStatus()
      }
    });
  } catch (error: any) {
    console.error('[Slide Upload API Error]:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to process slide deck upload'
    });
  }
}

// Lecture Slides Upload Endpoint (Extracts page-by-page text, generates 768-dim embeddings via Gemini, inserts into Supabase)
apiRouter.post(['/slides/upload', '/slides/upload/'], (req: Request, res: Response) => {
  // Always guarantee JSON response header
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('application/json')) {
    // Process JSON base64 payload directly without multer
    return handleSlideUploadCore(req, res);
  }

  // Handle multipart form-data via multer with explicit error containment
  upload.single('file')(req, res, (err: any) => {
    if (err) {
      console.warn('[Multer Warning]:', err?.message || err);
      return res.status(400).json({
        success: false,
        error: `File upload error: ${err?.message || 'Invalid upload stream or file size exceeded limit'}`
      });
    }
    return handleSlideUploadCore(req, res);
  });
});

// Create task manually
apiRouter.post('/tasks', (req: Request, res: Response) => {
  try {
    const { course_code, task_type, title, due_timestamp, slide_range } = req.body;
    if (!course_code || !task_type || !title || !due_timestamp) {
      res.status(400).json({ error: 'course_code, task_type, title, and due_timestamp are required' });
      return;
    }

    const task = dbStore.upsertTask({
      course_code,
      task_type,
      title,
      due_timestamp,
      slide_range
    });

    res.json({ success: true, task });
  } catch (error: any) {
    res.status(500).json({ error: error?.message });
  }
});

// Toggle task status
apiRouter.patch('/tasks/:id/toggle', (req: Request, res: Response) => {
  const { id } = req.params;
  const task = dbStore.toggleTaskStatus(id);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  res.json({ success: true, task });
});

// Trigger dispatch alert preview
apiRouter.post('/dispatches/trigger', (req: Request, res: Response) => {
  const { id } = req.body;
  if (!id) {
    res.status(400).json({ error: 'id is required' });
    return;
  }
  const item = dbStore.triggerDispatchNow(id);
  if (!item) {
    res.status(404).json({ error: 'Dispatch not found' });
    return;
  }
  res.json({ success: true, dispatch: item });
});

// Reset database
apiRouter.post('/reset-data', (req: Request, res: Response) => {
  dbStore.resetData();
  res.json({
    success: true,
    message: 'Supabase database reset to default university course catalog',
    database: {
      courses: dbStore.getCourses(),
      slides: dbStore.getSlides(),
      tasks: dbStore.getTasks(),
      dispatches: dbStore.getDispatches(),
      supabase: dbStore.getSupabaseStatus()
    }
  });
});

// UMT LMS Sync Endpoints
apiRouter.get('/umt/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    status: umtSyncService.getStatus()
  });
});

apiRouter.post('/api/umt/config', (req: Request, res: Response) => {
  // Alias for /api/umt/config if called without router prefix
  const { icalUrl, autoSyncEnabled, syncIntervalMinutes } = req.body;
  const status = umtSyncService.saveConfig({ icalUrl, autoSyncEnabled, syncIntervalMinutes });
  res.json({ success: true, status });
});

apiRouter.post('/umt/config', async (req: Request, res: Response) => {
  try {
    const { icalUrl, autoSyncEnabled, syncIntervalMinutes, triggerSync } = req.body;
    const status = umtSyncService.saveConfig({
      icalUrl,
      autoSyncEnabled,
      syncIntervalMinutes
    });

    let syncResult = null;
    if (triggerSync || icalUrl) {
      syncResult = await umtSyncService.syncNow(icalUrl);
    }

    res.json({
      success: true,
      status: umtSyncService.getStatus(),
      syncResult,
      database: {
        tasks: dbStore.getTasks(),
        dispatches: dbStore.getDispatches()
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to update UMT LMS config' });
  }
});

apiRouter.post('/umt/sync', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    const result = await umtSyncService.syncNow(url);
    res.json({
      success: result.success,
      result,
      status: umtSyncService.getStatus(),
      database: {
        courses: dbStore.getCourses(),
        slides: dbStore.getSlides(),
        tasks: dbStore.getTasks(),
        dispatches: dbStore.getDispatches(),
        supabase: dbStore.getSupabaseStatus()
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message || 'UMT sync failed'
    });
  }
});

