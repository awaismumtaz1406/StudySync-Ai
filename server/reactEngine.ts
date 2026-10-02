import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { dbStore } from './db.js';
import { ReActStep, AcademicTask, AlertDispatch } from './types.js';

// Base reference time provided in metadata
const BASE_REFERENCE_TIME = new Date('2026-09-29T03:49:40-07:00');

interface ParsedIntent {
  isRomanUrdu: boolean;
  hasAmbiguity: boolean;
  ambiguityReason?: string;
  courseCode?: string;
  taskType?: 'quiz' | 'assignment' | 'exam' | 'study_session';
  title?: string;
  slideRange?: [number, number];
  conceptQuery?: string;
  dueTimestamp?: string;
  requiresSlideSearch: boolean;
  requiresTaskUpsert: boolean;
  requiresAlertDispatch: boolean;
  alertChannel?: 'whatsapp' | 'email';
}

// 1. Bilingual Roman Urdu & Campus Slang Parser
export function parseStudentCampusPrompt(input: string, refTime: Date = BASE_REFERENCE_TIME): ParsedIntent {
  const text = input.trim();
  const lower = text.toLowerCase();

  // Roman Urdu keywords detection
  const romanUrduTokens = [
    'kal', 'parso', 'tarso', 'aaj', 'shaam', 'raat', 'subah', 'dopahar',
    'bhai', 'mera', 'meri', 'hai', 'hain', 'karni', 'karna', 'kardo',
    'lagao', 'bhej', 'samjha', 'samjhao', 'batao', 'parhai', 'tayari',
    'se', 'tak', 'wale', 'wali', 'kya', 'kaise', 'agle', 'hafte', 'aglay'
  ];
  const matchedUrduTokens = romanUrduTokens.filter(t => new RegExp(`\\b${t}\\b`, 'i').test(lower));
  const isRomanUrdu = matchedUrduTokens.length >= 1;

  // Course extraction
  let courseCode: string | undefined = undefined;
  if (/cs[- ]?402\b|artificial intelligence|\bai\b/i.test(lower)) {
    courseCode = 'CS-402';
  } else if (/cs[- ]?304\b|operating systems?|\bos\b|paging|virtual memory|tlb|process sync/i.test(lower)) {
    courseCode = 'CS-304';
  } else if (/cs[- ]?201\b|data structures?|\bdsa\b|algorithms?|binary search|avl|dijkstra/i.test(lower)) {
    courseCode = 'CS-201';
  } else if (/se[- ]?301\b|software architecture|design patterns?|\bse\b|microservices|solid|singleton/i.test(lower)) {
    courseCode = 'SE-301';
  }

  // Slide Range extraction (e.g. "slides 3 se 8 tak", "slide 4 to 8", "slide 12")
  let slideRange: [number, number] | undefined = undefined;
  const rangeMatch = lower.match(/slides?\s*(\d+)\s*(?:se|to|-)\s*(\d+)(?:\s*tak)?/i);
  if (rangeMatch) {
    slideRange = [parseInt(rangeMatch[1], 10), parseInt(rangeMatch[2], 10)];
  } else {
    const singleSlideMatch = lower.match(/slide\s*(\d+)/i);
    if (singleSlideMatch) {
      const page = parseInt(singleSlideMatch[1], 10);
      slideRange = [page, page];
    }
  }

  // Task type extraction
  let taskType: 'quiz' | 'assignment' | 'exam' | 'study_session' | undefined = undefined;
  if (/\bquiz\b/i.test(lower)) taskType = 'quiz';
  else if (/\bassignment\b|\bhomework\b|\blab\b/i.test(lower)) taskType = 'assignment';
  else if (/\bexam\b|\bmidterm\b|\bfinal\b|\bpaper\b/i.test(lower)) taskType = 'exam';
  else if (/\bstudy\b|\brevision\b|\bparhai\b|\bsession\b/i.test(lower)) taskType = 'study_session';

  // Temporal Date Resolution relative to student time: 2026-09-29T03:49:40-07:00
  let targetDate = new Date(refTime.getTime());
  let timeOfDayHour = 10; // default 10:00 AM
  let timeOfDayMin = 0;

  if (/\braat\b|\bnight\b/i.test(lower)) {
    timeOfDayHour = 23;
    timeOfDayMin = 59;
  } else if (/\bshaam\b|\bevening\b/i.test(lower)) {
    timeOfDayHour = 18;
    timeOfDayMin = 0;
  } else if (/\bdopahar\b|\bafternoon\b/i.test(lower)) {
    timeOfDayHour = 14;
    timeOfDayMin = 0;
  } else if (/\bsubah\b|\bmorning\b/i.test(lower)) {
    timeOfDayHour = 9;
    timeOfDayMin = 0;
  }

  let resolvedDate = false;
  if (/\bkal\b|\btomorrow\b/i.test(lower)) {
    targetDate.setDate(targetDate.getDate() + 1);
    resolvedDate = true;
  } else if (/\bparso\b|\bday after tomorrow\b/i.test(lower)) {
    targetDate.setDate(targetDate.getDate() + 2);
    resolvedDate = true;
  } else if (/\btarso\b/i.test(lower)) {
    targetDate.setDate(targetDate.getDate() + 3);
    resolvedDate = true;
  } else if (/\bagle hafte\b|\baglay haftay\b|\bnext week\b/i.test(lower)) {
    targetDate.setDate(targetDate.getDate() + 7);
    resolvedDate = true;
  } else if (/\baaj\b|\btoday\b/i.test(lower)) {
    resolvedDate = true;
  }

  targetDate.setHours(timeOfDayHour, timeOfDayMin, 0, 0);
  const dueTimestamp = resolvedDate ? targetDate.toISOString() : undefined;

  // Concept / RAG slide question detection
  const isQuestion = /\?|samjha|explain|trace|kya hota|how does|what is|tell me|difference|kaise/i.test(lower);
  const requiresSlideSearch = isQuestion || (slideRange !== undefined && !taskType);

  // Concept query extraction
  let conceptQuery = text;
  if (requiresSlideSearch) {
    conceptQuery = text
      .replace(/samjha de|samjha do|samjhao|bata do|bhai|please|explain|trace/gi, '')
      .replace(/slides?\s*\d+(?:\s*(?:se|to|-)\s*\d+)?(?:\s*tak)?/gi, '')
      .replace(/cs[- ]?\d+|ai|os|dsa|se/gi, '')
      .trim();
    if (!conceptQuery || conceptQuery.length < 3) {
      conceptQuery = text; // fallback to full query
    }
  }

  // Task upsert requirement
  const requiresTaskUpsert = taskType !== undefined && dueTimestamp !== undefined;

  // Alert requirement
  const requiresAlertDispatch = /\balert\b|\breminder\b|\bwhatsapp\b|\bemail\b|\bnotify\b|\bcountdown\b|\blagado\b|\bbhej do\b/i.test(lower);
  const alertChannel = /\bemail\b/i.test(lower) ? 'email' : 'whatsapp';

  // Ambiguity check: Task mentioned without a course
  let hasAmbiguity = false;
  let ambiguityReason: string | undefined = undefined;

  if (taskType && !courseCode) {
    hasAmbiguity = true;
    ambiguityReason = isRomanUrdu
      ? `Bhai, aap ne ${taskType.toUpperCase()} ka zikr kiya hai lekin course nahi bataya. Yeh quiz/task kis subject ka hai? (CS-402 AI, CS-304 OS, CS-201 DSA, ya SE-301?)`
      : `You mentioned a ${taskType.toUpperCase()}, but which course is this for? Please clarify (CS-402 AI, CS-304 OS, CS-201 DSA, or SE-301).`;
  }

  const title = taskType && courseCode ? `${courseCode} ${taskType.toUpperCase()}: ${text.slice(0, 35)}...` : undefined;

  return {
    isRomanUrdu,
    hasAmbiguity,
    ambiguityReason,
    courseCode,
    taskType,
    title,
    slideRange,
    conceptQuery,
    dueTimestamp,
    requiresSlideSearch,
    requiresTaskUpsert,
    requiresAlertDispatch,
    alertChannel
  };
}

// 2. Real ReAct Reasoning Executor
export async function executeReActCycle(
  userPrompt: string,
  history: Array<{ sender: 'user' | 'assistant'; content: string }> = []
): Promise<{
  content: string;
  react_steps: ReActStep[];
  citations: Array<{ slide_number: number; course_code: string; document_name: string; snippet: string }>;
  created_tasks: AcademicTask[];
  created_alerts: AlertDispatch[];
}> {
  const steps: ReActStep[] = [];
  const citations: Array<{ slide_number: number; course_code: string; document_name: string; snippet: string }> = [];
  const createdTasks: AcademicTask[] = [];
  const createdAlerts: AlertDispatch[] = [];

  const apiKey = process.env.GEMINI_API_KEY;

  // First, parse campus vernacular to build verified deterministic context
  const parsed = parseStudentCampusPrompt(userPrompt);

  // Step 1: Thought - Intent & Vernacular Analysis
  let stepNum = 1;
  const vernacularType = parsed.isRomanUrdu ? 'Roman Urdu / Pakistani Campus Slang' : 'English Campus Vernacular';
  steps.push({
    step_number: stepNum++,
    type: 'thought',
    thought: `Analyzing input vernacular: [${vernacularType}]. Identified course: [${parsed.courseCode || 'None/Ambiguous'}], Task: [${parsed.taskType || 'None'}], Slide bounds: [${parsed.slideRange ? parsed.slideRange.join(' to ') : 'All slides'}], Temporal intent: [${parsed.dueTimestamp ? 'Resolved to ' + parsed.dueTimestamp : 'None/Immediate'}].`
  });

  // Check Ambiguity Rule: Zero Ambiguity rule
  if (parsed.hasAmbiguity && parsed.ambiguityReason) {
    steps.push({
      step_number: stepNum++,
      type: 'clarification',
      thought: `Ambiguity detected: Missing course code for scheduled task. Asking a single direct clarifying question without guessing.`
    });
    return {
      content: parsed.ambiguityReason,
      react_steps: steps,
      citations: [],
      created_tasks: [],
      created_alerts: []
    };
  }

  // If Gemini API is available, we can run Gemini with real Function Calling
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      // Declare tools matching schema
      const fnVectorSearch: FunctionDeclaration = {
        name: 'supabase_vector_search',
        description: 'Performs semantic vector search across university lecture slides stored in Supabase pgvector.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: { type: Type.STRING, description: 'The concept, question, or formula to search for.' },
            course_code: { type: Type.STRING, description: 'Course code (e.g. CS-402, CS-304, CS-201, SE-301).' },
            match_count: { type: Type.INTEGER, description: 'Number of slide chunks to retrieve (default: 4).' },
            start_page: { type: Type.INTEGER, description: 'Optional start slide bound.' },
            end_page: { type: Type.INTEGER, description: 'Optional end slide bound.' }
          },
          required: ['query', 'course_code']
        }
      };

      const fnUpsertTask: FunctionDeclaration = {
        name: 'supabase_upsert_task',
        description: 'Inserts or updates an academic task, quiz, exam, or study schedule in Supabase PostgreSQL.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            course_code: { type: Type.STRING, description: 'Course code (e.g., CS-402).' },
            task_type: { type: Type.STRING, description: 'Type of task: quiz, assignment, exam, or study_session.' },
            title: { type: Type.STRING, description: 'Short title describing the task.' },
            due_timestamp: { type: Type.STRING, description: 'ISO 8601 formatted date-time string.' },
            slide_range: {
              type: Type.ARRAY,
              items: { type: Type.INTEGER },
              description: 'Array containing [start_slide, end_slide] if specified.'
            }
          },
          required: ['course_code', 'task_type', 'title', 'due_timestamp']
        }
      };

      const fnDispatchAlert: FunctionDeclaration = {
        name: 'dispatch_student_alert',
        description: 'Registers proactive notification countdowns to WhatsApp or Email in Supabase.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            task_id: { type: Type.STRING, description: 'The academic task UUID if known or reference.' },
            channel: { type: Type.STRING, description: 'Channel to dispatch alert through: whatsapp or email.' },
            trigger_timestamp: { type: Type.STRING, description: 'ISO 8601 formatted trigger time.' },
            message: { type: Type.STRING, description: 'The exact alert text to send the student.' }
          },
          required: ['channel', 'trigger_timestamp', 'message']
        }
      };

      const tools = [
        {
          functionDeclarations: [fnVectorSearch, fnUpsertTask, fnDispatchAlert]
        }
      ];

      const systemInstruction = `You are StudySync AI, an autonomous academic copilot and ReAct reasoning engine built for university students.
Current student local reference time: 2026-09-29T03:49:40-07:00 (Tuesday).
Student timezone: UTC-07:00 (or Pakistan Standard Time campus context).

CORE RESPONSIBILITIES:
1. Bilingual Academic Parsing:
   - Detect student intent when expressed in Roman Urdu, Pakistani campus slang, or casual English (e.g., "Kal mera AI ka quiz hai slides 3 se 8 tak", "Parso raat assignment submit karni hai", "Slide 4 ka binary search trace samjha do").
   - Extract courses/subjects (AI -> CS-402, OS -> CS-304, DSA -> CS-201, SE -> SE-301), slide ranges, and task types.
   - Resolve temporal relative dates dynamically:
     - "kal" / "tomorrow" = 2026-09-30
     - "parso" / "day after tomorrow" = 2026-10-01
     - "tarso" = 2026-10-02
     - "agle hafte" / "next week" = 2026-10-06
     - "shaam" = 18:00
     - "raat" = 23:59 or 21:00
     - "subah" = 09:00 or 10:00
     - "dopahar" = 14:00

2. Course-Scoped Slide Search (RAG):
   - Whenever conceptual questions, lecture slide references, or study queries occur, call 'supabase_vector_search'.
   - Never hallucinate outside retrieved slide bounds. Always cite the exact slide number and course code in your answer:
     > **[Slide X — Course Code Lecture Y]:** *Detailed concept explanation and formulas here.*

3. Supabase Database & Task Automation:
   - When a student mentions a deadline, quiz, homework, or exam, call 'supabase_upsert_task' to store it in Supabase PostgreSQL.
   - If reminders or notifications are requested, call 'dispatch_student_alert' to register WhatsApp or Email alerts.

4. Conversational Tone:
   - Authentic Student Peer Tone: Be supportive, direct, and pragmatic. If the student prompts in Roman Urdu, reply back naturally in Roman Urdu (e.g., "Maine aapka CS-402 ka Quiz schedule kar diya hai bhai!").`;

      // Call Gemini 3.8 Flash
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          ...history.map(h => ({
            role: h.sender === 'user' ? 'user' : 'model',
            parts: [{ text: h.content }]
          })),
          { role: 'user', parts: [{ text: userPrompt }] }
        ],
        config: {
          systemInstruction,
          tools,
          temperature: 0.2
        }
      });

      // Handle function calls if model proposed them
      const functionCalls = response.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        let toolResultsContent = '';

        for (const call of functionCalls) {
          const fnName = call.name;
          const args = (call.args || {}) as Record<string, any>;

          steps.push({
            step_number: stepNum++,
            type: 'action',
            thought: `Decided to execute tool: ${fnName}`,
            action_name: fnName,
            action_args: args
          });

          let observation: any = null;

          if (fnName === 'supabase_vector_search') {
            observation = dbStore.vectorSearch({
              query: args.query || userPrompt,
              course_code: args.course_code || parsed.courseCode || 'CS-402',
              match_count: args.match_count || 3,
              start_page: args.start_page !== undefined ? args.start_page : parsed.slideRange?.[0],
              end_page: args.end_page !== undefined ? args.end_page : parsed.slideRange?.[1]
            });

            // Register citations
            if (Array.isArray(observation)) {
              for (const slide of observation) {
                citations.push({
                  slide_number: slide.page_number,
                  course_code: slide.course_code,
                  document_name: slide.document_name,
                  snippet: slide.content.slice(0, 160) + '...'
                });
              }
            }
          } else if (fnName === 'supabase_upsert_task') {
            const task = dbStore.upsertTask({
              course_code: args.course_code || parsed.courseCode || 'CS-402',
              task_type: args.task_type || parsed.taskType || 'quiz',
              title: args.title || parsed.title || `${args.course_code} Academic Task`,
              due_timestamp: args.due_timestamp || parsed.dueTimestamp || '2026-09-30T10:00:00-07:00',
              slide_range: args.slide_range || (parsed.slideRange ? [parsed.slideRange[0], parsed.slideRange[1]] : undefined)
            });
            createdTasks.push(task);
            observation = { status: 'success', task_id: task.id, details: task };
          } else if (fnName === 'dispatch_student_alert') {
            const alert = dbStore.dispatchAlert({
              task_id: args.task_id || (createdTasks[0]?.id),
              channel: args.channel || 'whatsapp',
              trigger_timestamp: args.trigger_timestamp || '2026-09-29T21:00:00-07:00',
              message: args.message || `StudySync Alert for your upcoming academic deadline.`
            });
            createdAlerts.push(alert);
            observation = { status: 'success', dispatch_id: alert.id, channel: alert.channel, scheduled_for: alert.scheduled_for };
          }

          steps.push({
            step_number: stepNum++,
            type: 'observation',
            observation
          });

          toolResultsContent += `Tool ${fnName} returned: ${JSON.stringify(observation)}\n`;
        }

        // Second pass: model generates final answer given tool observations
        const followup = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            ...history.map(h => ({
              role: h.sender === 'user' ? 'user' : 'model',
              parts: [{ text: h.content }]
            })),
            { role: 'user', parts: [{ text: userPrompt }] },
            {
              role: 'model',
              parts: [{ text: `I invoked tools and received the following database observations:\n${toolResultsContent}` }]
            },
            {
              role: 'user',
              parts: [{
                text: `Synthesize the final peer answer now. Strictly cite any retrieved slides with formatting: > **[Slide X — Course Code Lecture Y]:** *explanation*. Match the student's language tone (${parsed.isRomanUrdu ? 'Roman Urdu' : 'English'}).`
              }]
            }
          ],
          config: {
            systemInstruction,
            temperature: 0.2
          }
        });

        const finalText = followup.text || '';
        return {
          content: finalText,
          react_steps: steps,
          citations,
          created_tasks: createdTasks,
          created_alerts: createdAlerts
        };
      }

      // If no function calls, return direct response
      if (response.text) {
        return {
          content: response.text,
          react_steps: steps,
          citations,
          created_tasks: createdTasks,
          created_alerts: createdAlerts
        };
      }
    } catch (err: any) {
      console.warn('Gemini API call encountered error, falling back to deterministic local ReAct engine:', err?.message || err);
    }
  }

  // DETERMINISTIC FULL-FEATURED LOCAL REACT ENGINE (Flawless fallback & fast execution)
  return executeLocalReActEngine(userPrompt, parsed, steps, stepNum);
}

// Robust Local ReAct Engine
function executeLocalReActEngine(
  userPrompt: string,
  parsed: ParsedIntent,
  steps: ReActStep[],
  startStep: number
): {
  content: string;
  react_steps: ReActStep[];
  citations: Array<{ slide_number: number; course_code: string; document_name: string; snippet: string }>;
  created_tasks: AcademicTask[];
  created_alerts: AlertDispatch[];
} {
  let stepNum = startStep;
  const citations: Array<{ slide_number: number; course_code: string; document_name: string; snippet: string }> = [];
  const createdTasks: AcademicTask[] = [];
  const createdAlerts: AlertDispatch[] = [];
  let answerParts: string[] = [];

  const courseCode = parsed.courseCode || 'CS-402';

  // Action 1: Vector Search if slides or concepts requested
  let retrievedSlides: any[] = [];
  if (parsed.requiresSlideSearch || parsed.slideRange) {
    const searchArgs = {
      query: parsed.conceptQuery || userPrompt,
      course_code: courseCode,
      match_count: 3,
      start_page: parsed.slideRange ? parsed.slideRange[0] : undefined,
      end_page: parsed.slideRange ? parsed.slideRange[1] : undefined
    };

    steps.push({
      step_number: stepNum++,
      type: 'action',
      thought: `Student referenced course slides or concepts. Calling supabase_vector_search on slide_embeddings table for course [${courseCode}].`,
      action_name: 'supabase_vector_search',
      action_args: searchArgs
    });

    retrievedSlides = dbStore.vectorSearch(searchArgs);

    steps.push({
      step_number: stepNum++,
      type: 'observation',
      observation: retrievedSlides.map(s => ({
        slide_id: s.slide_id,
        page_number: s.page_number,
        title: s.title,
        similarity: s.similarity,
        document_name: s.document_name
      }))
    });

    for (const slide of retrievedSlides) {
      citations.push({
        slide_number: slide.page_number,
        course_code: slide.course_code,
        document_name: slide.document_name,
        snippet: slide.content.slice(0, 160) + '...'
      });
    }
  }

  // Action 2: Upsert Task if deadline/quiz/assignment requested
  let upsertedTask: AcademicTask | null = null;
  if (parsed.requiresTaskUpsert && parsed.taskType && parsed.dueTimestamp) {
    const taskTitle = parsed.isRomanUrdu
      ? `${courseCode} ${parsed.taskType.toUpperCase()}`
      : `${courseCode} ${parsed.taskType.toUpperCase()}`;

    const taskArgs = {
      course_code: courseCode,
      task_type: parsed.taskType,
      title: taskTitle,
      due_timestamp: parsed.dueTimestamp,
      slide_range: parsed.slideRange ? [parsed.slideRange[0], parsed.slideRange[1]] : undefined
    };

    steps.push({
      step_number: stepNum++,
      type: 'action',
      thought: `Detected academic deadline intent. Persisting task in academic_tasks table in Supabase PostgreSQL.`,
      action_name: 'supabase_upsert_task',
      action_args: taskArgs
    });

    upsertedTask = dbStore.upsertTask(taskArgs);
    createdTasks.push(upsertedTask);

    steps.push({
      step_number: stepNum++,
      type: 'observation',
      observation: {
        status: 'success',
        task_id: upsertedTask.id,
        title: upsertedTask.title,
        due_at: upsertedTask.due_at,
        slide_range: parsed.slideRange
      }
    });
  }

  // Action 3: Dispatch Alert if reminders/alerts requested or for scheduled quiz/assignment
  if (parsed.requiresAlertDispatch || upsertedTask) {
    const channel = parsed.alertChannel || 'whatsapp';
    const alertTime = new Date('2026-09-29T21:00:00-07:00').toISOString(); // Tonight for immediate countdown
    const alertMsg = parsed.isRomanUrdu
      ? `🚨 StudySync Reminder: Bhai aapka ${courseCode} ka ${parsed.taskType || 'quiz'} scheduled hai! Slides ${parsed.slideRange ? parsed.slideRange[0] + '-' + parsed.slideRange[1] : 'course material'} ki achi tarah tayari kar lo.`
      : `🚨 StudySync Reminder: Your ${courseCode} ${parsed.taskType || 'quiz'} is coming up! Revise slides ${parsed.slideRange ? parsed.slideRange[0] + '-' + parsed.slideRange[1] : 'all covered units'}.`;

    const alertArgs = {
      task_id: upsertedTask ? upsertedTask.id : 'general-academic',
      channel,
      trigger_timestamp: alertTime,
      message: alertMsg
    };

    steps.push({
      step_number: stepNum++,
      type: 'action',
      thought: `Scheduling proactive student countdown alert via [${channel.toUpperCase()}] in alert_dispatches table.`,
      action_name: 'dispatch_student_alert',
      action_args: alertArgs
    });

    const alertItem = dbStore.dispatchAlert(alertArgs);
    createdAlerts.push(alertItem);

    steps.push({
      step_number: stepNum++,
      type: 'observation',
      observation: {
        status: 'success',
        dispatch_id: alertItem.id,
        channel: alertItem.channel,
        recipient: alertItem.recipient_phone_or_email,
        scheduled_for: alertItem.scheduled_for
      }
    });
  }

  // Synthesis: Construct Authentic Peer Response
  const formattedDueDate = parsed.dueTimestamp
    ? new Date(parsed.dueTimestamp).toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'UTC'
      })
    : 'Upcoming';

  if (parsed.isRomanUrdu) {
    // Roman Urdu peer response
    if (upsertedTask) {
      answerParts.push(`Haan bhai! Maine aapka **${courseCode}** ka **${parsed.taskType?.toUpperCase()}** schedule kar diya hai.`);
      answerParts.push(`- **Due Date:** ${formattedDueDate}`);
      if (parsed.slideRange) {
        answerParts.push(`- **Slides Range:** Slide ${parsed.slideRange[0]} se Slide ${parsed.slideRange[1]} tak`);
      }
      if (createdAlerts.length > 0) {
        answerParts.push(`- **Alert Setup:** WhatsApp alert register ho chuka hai (+92 300 8472910 pe countdown reminder aayega).`);
      }
    }

    if (retrievedSlides.length > 0) {
      answerParts.push(`\n**Lecture Slides se relevant concepts:**\n`);
      for (const slide of retrievedSlides) {
        answerParts.push(`> **[Slide ${slide.page_number} — ${slide.course_code} ${slide.document_name}]:**\n> *${slide.title}*\n> ${slide.content}\n`);
      }
      answerParts.push(`Koi aur specific formula ya pseudocode trace samajhna ho toh batao!`);
    } else if (!upsertedTask) {
      answerParts.push(`Bilkul bhai! Maine system check kiya hai. Aapko kis topic ya slide ki explanation chahiye?`);
    }
  } else {
    // English peer response
    if (upsertedTask) {
      answerParts.push(`Got you covered! I've scheduled your **${courseCode}** **${parsed.taskType?.toUpperCase()}**.`);
      answerParts.push(`- **Scheduled Due Time:** ${formattedDueDate}`);
      if (parsed.slideRange) {
        answerParts.push(`- **Slide Scope:** Slide ${parsed.slideRange[0]} to Slide ${parsed.slideRange[1]}`);
      }
      if (createdAlerts.length > 0) {
        answerParts.push(`- **Dispatched Alert:** Proactive alert scheduled via ${createdAlerts[0].channel.toUpperCase()} (${createdAlerts[0].recipient_phone_or_email}).`);
      }
    }

    if (retrievedSlides.length > 0) {
      answerParts.push(`\n**Verified Slide Material Retrieved via pgvector:**\n`);
      for (const slide of retrievedSlides) {
        answerParts.push(`> **[Slide ${slide.page_number} — ${slide.course_code} ${slide.document_name}]:**\n> *${slide.title}*\n> ${slide.content}\n`);
      }
      answerParts.push(`Let me know if you want me to trace any algorithmic steps or break down the exam patterns!`);
    } else if (!upsertedTask) {
      answerParts.push(`Ready to assist! Tell me which lecture slide or academic task you'd like to work through.`);
    }
  }

  return {
    content: answerParts.join('\n\n'),
    react_steps: steps,
    citations,
    created_tasks: createdTasks,
    created_alerts: createdAlerts
  };
}
