import { Router, Request, Response } from 'express';
import { dbStore } from './db.js';
import { executeReActCycle } from './reactEngine.js';
import { umtSyncService } from './umtSync.js';

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

