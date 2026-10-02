import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Course, SlideEmbedding, AcademicTask, AlertDispatch } from './types.js';

// Helper to ensure Supabase URL is always a valid HTTP/HTTPS URL
function sanitizeSupabaseUrl(rawUrl?: string): string {
  const defaultUrl = 'https://hyavrykjefoqntqycywp.supabase.co';
  if (!rawUrl || typeof rawUrl !== 'string') return defaultUrl;
  let trimmed = rawUrl.trim();
  if (trimmed.startsWith('ttps://')) {
    trimmed = 'h' + trimmed;
  }
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    trimmed = 'https://' + trimmed.replace(/^\/+/, '');
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return defaultUrl;
    }
    return trimmed;
  } catch {
    return defaultUrl;
  }
}

// Real Supabase Instance Configuration
export const SUPABASE_URL = sanitizeSupabaseUrl(process.env.SUPABASE_URL);
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5YXZyeWtqZWZvcW50cXljeXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2Nzc0NTEsImV4cCI6MjEwNjI1MzQ1MX0.SDM27Gka7IAfDAd2g_oq-IqIBTegZyhid_N2naaxBwg';

// Real Supabase client connection (safely initialized)
function initSupabaseClient(): SupabaseClient {
  try {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  } catch (err) {
    console.warn('Failed to initialize Supabase with configured URL, falling back to default:', err);
    return createClient('https://hyavrykjefoqntqycywp.supabase.co', SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }
}

export const supabase: SupabaseClient = initSupabaseClient();

// Helper to generate a 768-dimensional normalized pseudo-vector based on text tokens
function createEmbedding(text: string): number[] {
  const dim = 768;
  const vector = new Array(dim).fill(0);
  const clean = text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
  const words = clean.split(/\s+/).filter(w => w.length > 2);

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 0;
    for (let j = 0; j < word.length; j++) {
      hash = (hash << 5) - hash + word.charCodeAt(j);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dim;
    vector[idx] += 1.0;
    // Disperse to neighboring dimensions for semantic smoothing
    vector[(idx + 7) % dim] += 0.5;
    vector[(idx + 13) % dim] += 0.25;
  }

  // Normalize vector to unit length for cosine similarity
  let norm = 0;
  for (let i = 0; i < dim; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < dim; i++) {
    vector[i] /= norm;
  }
  return vector;
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(vecA.length, vecB.length);
  for (let i = 0; i < len; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Initial Mock Seed Data according to Supabase Schema Contract
export const INITIAL_COURSES: Course[] = [
  {
    id: 'c1-cs402',
    code: 'CS-402',
    title: 'Artificial Intelligence',
    semester: 'Fall 2026',
    description: 'Autonomous agents, heuristic search, adversarial minimax, constraint satisfaction, and machine learning.',
    lecturer: 'Dr. Tariq Mahmood'
  },
  {
    id: 'c2-cs304',
    code: 'CS-304',
    title: 'Operating Systems',
    semester: 'Fall 2026',
    description: 'Process management, synchronization, CPU scheduling, virtual memory, paging, and file systems.',
    lecturer: 'Prof. Ayesha Siddiqua'
  },
  {
    id: 'c3-cs201',
    code: 'CS-201',
    title: 'Data Structures & Algorithms',
    semester: 'Fall 2026',
    description: 'Algorithmic complexity, trees, graphs, sorting, searching, dynamic programming, and greedy algorithms.',
    lecturer: 'Dr. Usman Farooq'
  },
  {
    id: 'c4-se301',
    code: 'SE-301',
    title: 'Software Architecture & Design Patterns',
    semester: 'Fall 2026',
    description: 'Architectural styles, Gang of Four (GoF) design patterns, SOLID principles, and microservices.',
    lecturer: 'Engr. Bilal Hashmi'
  }
];

const RAW_SLIDES = [
  // CS-402: Artificial Intelligence
  {
    id: 101,
    course_id: 'c1-cs402',
    course_code: 'CS-402',
    document_name: 'Lecture_01_Introduction_Agents.pdf',
    page_number: 1,
    title: 'Rational Agents & PEAS Framework',
    tags: ['PEAS', 'Agent Architecture', 'Rationality', 'Environment'],
    content: 'An intelligent agent perceives its environment via sensors and acts through actuators. Rationality is measured by the performance measure, environment, actuators, and sensors (PEAS). Types of environments include fully vs partially observable, deterministic vs stochastic, episodic vs sequential, static vs dynamic, and discrete vs continuous.'
  },
  {
    id: 102,
    course_id: 'c1-cs402',
    course_code: 'CS-402',
    document_name: 'Lecture_02_Search_Algorithms.pdf',
    page_number: 2,
    title: 'Uninformed Search: BFS, DFS, and Uniform Cost Search',
    tags: ['BFS', 'DFS', 'Uniform Cost Search', 'Completeness', 'Time Complexity'],
    content: 'Breadth-First Search (BFS) expands the shallowest nodes first using a FIFO queue. Time complexity O(b^d), space complexity O(b^d). BFS is complete and optimal if step costs are equal. Depth-First Search (DFS) uses a LIFO stack with space complexity O(b*m). Uniform Cost Search (UCS) expands node n with lowest path cost g(n) using a priority queue, guaranteeing optimality for positive step costs.'
  },
  {
    id: 103,
    course_id: 'c1-cs402',
    course_code: 'CS-402',
    document_name: 'Lecture_03_Heuristics_AStar.pdf',
    page_number: 3,
    title: 'Heuristics & Admissibility Criteria',
    tags: ['Heuristics', 'Admissibility', 'Consistency', 'Straight Line Distance'],
    content: 'A heuristic function h(n) estimates the cheapest cost from node n to the goal. Definition: A heuristic h(n) is admissible if h(n) <= h*(n) for all n, where h*(n) is the true optimal cost to reach the goal. Admissible heuristics never overestimate the cost. A heuristic is consistent (monotonic) if h(n) <= c(n, a, n\') + h(n\'). Consistency implies admissibility.'
  },
  {
    id: 104,
    course_id: 'c1-cs402',
    course_code: 'CS-402',
    document_name: 'Lecture_03_Heuristics_AStar.pdf',
    page_number: 4,
    title: 'A* Search Algorithm & Evaluation Function f(n) = g(n) + h(n)',
    tags: ['A* Search', 'Evaluation Function', 'Optimality', 'Path Cost'],
    content: 'A* Search evaluates nodes using f(n) = g(n) + h(n), where g(n) is the exact cost from the start node to n, and h(n) is the estimated cost from n to the goal. A* with tree search is optimal if h(n) is admissible. A* with graph search (with explored set) is optimal if h(n) is consistent. It terminates when the goal node is dequeued from the priority queue, not merely generated.'
  },
  {
    id: 105,
    course_id: 'c1-cs402',
    course_code: 'CS-402',
    document_name: 'Lecture_04_Adversarial_Search.pdf',
    page_number: 5,
    title: 'Adversarial Games & Minimax Algorithm',
    tags: ['Minimax', 'Zero-Sum Game', 'Max Node', 'Min Node', 'Game Tree'],
    content: 'In zero-sum two-player games (e.g., Chess, Tic-Tac-Toe), MAX maximizes the payoff while MIN minimizes it. Minimax Decision: Value(n) = Utility(n) if Terminal(n); max_{s in Successors(n)} Value(s) if Player(n) = MAX; min_{s in Successors(n)} Value(s) if Player(n) = MIN. Time complexity is O(b^m) and space complexity is O(b*m). Complete for finite trees.'
  },
  {
    id: 106,
    course_id: 'c1-cs402',
    course_code: 'CS-402',
    document_name: 'Lecture_04_Adversarial_Search.pdf',
    page_number: 6,
    title: 'Alpha-Beta Pruning Optimization',
    tags: ['Alpha-Beta Pruning', 'Cutoff', 'Alpha Value', 'Beta Value', 'Pruning Condition'],
    content: 'Alpha-Beta Pruning eliminates subtrees that cannot influence the final decision without altering the minimax result. Alpha (alpha): Highest-value choice found so far at any choice point along the path for MAX (initially -infinity). Beta (beta): Lowest-value choice found so far for MIN (initially +infinity). Pruning Condition: If alpha >= beta, prune the remaining children of the current node (alpha-cutoff / beta-cutoff). In ideal move ordering, time complexity reduces from O(b^m) to O(b^(m/2)).'
  },
  {
    id: 107,
    course_id: 'c1-cs402',
    course_code: 'CS-402',
    document_name: 'Lecture_04_Adversarial_Search.pdf',
    page_number: 7,
    title: 'Heuristic Evaluation Functions & Horizon Effect',
    tags: ['Evaluation Functions', 'Weighted Linear Sum', 'Horizon Effect', 'Quiescence Search'],
    content: 'When search cannot reach terminal states due to depth limits, a cutoff test replaces the terminal test, and an evaluation function Eval(s) estimates state utility. Weighted linear evaluation function: Eval(s) = w1*f1(s) + w2*f2(s) + ... + wn*fn(s). Horizon effect occurs when an inevitable damaging move is delayed beyond the search depth by making stalling moves. Quiescence search mitigates this by continuing search in turbulent states.'
  },
  {
    id: 108,
    course_id: 'c1-cs402',
    course_code: 'CS-402',
    document_name: 'Lecture_05_Local_Search.pdf',
    page_number: 8,
    title: 'Genetic Algorithms & Hill Climbing',
    tags: ['Genetic Algorithm', 'Crossover', 'Mutation', 'Hill Climbing', 'Fitness Function'],
    content: 'Local search operates using a single current state rather than multiple paths. Hill-climbing continuously moves towards higher elevation (state with best value) but suffers from local maxima, ridges, and plateaus. Genetic Algorithms (GA) mimic biological evolution: maintains a population of states represented as strings. Steps: Fitness function evaluation, Selection, Crossover (recombination of parent chromosomes), and Mutation (random bit flips).'
  },

  // CS-304: Operating Systems
  {
    id: 201,
    course_id: 'c2-cs304',
    course_code: 'CS-304',
    document_name: 'Lecture_03_Synchronization.pdf',
    page_number: 3,
    title: 'Process Synchronization & The Critical Section Problem',
    tags: ['Race Condition', 'Critical Section', 'Mutual Exclusion', 'Progress', 'Bounded Waiting'],
    content: 'A race condition occurs when multiple processes access and manipulate shared data concurrently, and the outcome depends on the order of execution. Critical Section Solution Requirements: 1. Mutual Exclusion: If process Pi is executing in its critical section, no other process can be executing in its critical section. 2. Progress: If no process is executing, only processes not in remainder section can participate in deciding who enters next. 3. Bounded Waiting: A bound exists on how many times others can enter before a request is granted.'
  },
  {
    id: 202,
    course_id: 'c2-cs304',
    course_code: 'CS-304',
    document_name: 'Lecture_03_Synchronization.pdf',
    page_number: 5,
    title: 'Semaphores & Mutex Locks',
    tags: ['Semaphore', 'Mutex', 'wait()', 'signal()', 'Counting Semaphore'],
    content: 'A Semaphore S is an integer variable accessed only through atomic operations: wait(S) [or P(S)]: decrement S, if S <= 0, process blocks. signal(S) [or V(S)]: increment S, if S <= 0, awaken a blocked process. Counting semaphores control access to a finite number of resources. Binary semaphores act as mutex locks (values 0 or 1). Classical synchronization problems include Bounded-Buffer (Producer-Consumer), Readers-Writers, and Dining Philosophers.'
  },
  {
    id: 203,
    course_id: 'c2-cs304',
    course_code: 'CS-304',
    document_name: 'Lecture_07_Virtual_Memory_Paging.pdf',
    page_number: 11,
    title: 'Paging Architecture & Memory Management Unit (MMU)',
    tags: ['Paging', 'MMU', 'Logical Address', 'Physical Address', 'Page Table', 'Frames'],
    content: 'Paging is a memory management scheme eliminating contiguous allocation needs. Physical memory is divided into fixed-size blocks called Frames. Logical memory is divided into same-sized blocks called Pages. The CPU generates a logical address divided into: Page Number (p) used as an index into the page table, and Page Offset (d). Physical Address = (Frame Number * Frame Size) + Offset.'
  },
  {
    id: 204,
    course_id: 'c2-cs304',
    course_code: 'CS-304',
    document_name: 'Lecture_07_Virtual_Memory_Paging.pdf',
    page_number: 12,
    title: 'Page Tables, TLB (Translation Lookaside Buffer) & Page Faults',
    tags: ['TLB', 'Translation Lookaside Buffer', 'Page Fault', 'Interrupt', 'Effective Access Time'],
    content: 'The Translation Lookaside Buffer (TLB) is high-speed associative hardware cache. TLB Hit: frame retrieved in ~1ns. TLB Miss: page table in main memory must be accessed (extra memory access penalty). Page Fault: Occurs when a process accesses a page marked invalid (not currently loaded into physical RAM). Page Fault Sequence: 1. CPU traps to OS kernel. 2. OS saves registers. 3. Backing store (swap space) read initiated via disk I/O. 4. Free frame allocated. 5. Page read into frame. 6. Page table entry updated (valid bit set to 1). 7. Instruction restarted.'
  },
  {
    id: 205,
    course_id: 'c2-cs304',
    course_code: 'CS-304',
    document_name: 'Lecture_07_Virtual_Memory_Paging.pdf',
    page_number: 13,
    title: 'Page Replacement Algorithms: FIFO, LRU, and Optimal',
    tags: ['FIFO', 'LRU', 'Optimal Page Replacement', 'Belady Anomaly'],
    content: 'When no free frame is available during a page fault, page replacement selects a victim frame. 1. FIFO (First-In, First-Out): Replaces oldest page; suffers from Belady\'s Anomaly (page faults can increase with more frames). 2. Optimal Algorithm (OPT): Replaces page that will not be used for longest future period; lowest fault rate but impractical (requires future knowledge). 3. Least Recently Used (LRU): Replaces page unused for longest past period; implemented via counters or stack, optimal approximation.'
  },

  // CS-201: Data Structures & Algorithms
  {
    id: 301,
    course_id: 'c3-cs201',
    course_code: 'CS-201',
    document_name: 'Lecture_04_Searching_Trees.pdf',
    page_number: 4,
    title: 'Binary Search Algorithm: Step-by-Step Trace & Complexity',
    tags: ['Binary Search', 'Divide and Conquer', 'Trace', 'Pointers', 'Logarithmic Time'],
    content: 'Binary Search operates on sorted arrays using divide-and-conquer. Trace Steps: 1. Initialize low = 0, high = n - 1. 2. While low <= high: mid = low + (high - low) / 2 (avoids integer overflow). 3. If arr[mid] == target, return mid. 4. If target < arr[mid], search left half: high = mid - 1. 5. If target > arr[mid], search right half: low = mid + 1. 6. If loop ends without match, return -1. Time Complexity: Best case O(1), Average and Worst case O(log n). Space complexity: O(1) iterative, O(log n) recursive.'
  },
  {
    id: 302,
    course_id: 'c3-cs201',
    course_code: 'CS-201',
    document_name: 'Lecture_04_Searching_Trees.pdf',
    page_number: 5,
    title: 'Binary Search Tree (BST) Properties & Operations',
    tags: ['BST', 'In-Order Traversal', 'Insertion', 'Deletion', 'Search'],
    content: 'A Binary Search Tree (BST) is a binary tree where for every node X: all keys in X\'s left subtree are strictly smaller than X.key, and all keys in X\'s right subtree are strictly greater than X.key. In-order traversal (Left, Root, Right) of a BST outputs elements in strictly sorted ascending order. Deletion cases: 1. Leaf node: delete directly. 2. One child: link parent to child. 3. Two children: replace with in-order predecessor or in-order successor.'
  },
  {
    id: 303,
    course_id: 'c3-cs201',
    course_code: 'CS-201',
    document_name: 'Lecture_05_AVL_Trees.pdf',
    page_number: 6,
    title: 'AVL Tree Balancing & Rotations (LL, RR, LR, RL)',
    tags: ['AVL Tree', 'Balance Factor', 'Rotations', 'Self-Balancing'],
    content: 'An AVL tree is a self-balancing BST where the Balance Factor (BF = height(left) - height(right)) of every node is in {-1, 0, +1}. When an insertion causes BF to become +2 or -2, rebalancing occurs via rotations: 1. Left-Left (LL) imbalance: Single Right Rotation. 2. Right-Right (RR) imbalance: Single Left Rotation. 3. Left-Right (LR) imbalance: Left rotation on left child, then Right rotation on root. 4. Right-Left (RL) imbalance: Right rotation on right child, then Left rotation on root. Guarantees O(log n) worst-case height.'
  },
  {
    id: 304,
    course_id: 'c3-cs201',
    course_code: 'CS-201',
    document_name: 'Lecture_08_Graph_Algorithms.pdf',
    page_number: 7,
    title: 'Dijkstra\'s Shortest Path Algorithm',
    tags: ['Dijkstra', 'Shortest Path', 'Priority Queue', 'Greedy', 'Relaxation'],
    content: 'Dijkstra\'s Algorithm finds shortest paths from a single source node to all other nodes in a weighted graph with non-negative edge weights. Relaxation step: If dist[u] + weight(u, v) < dist[v], update dist[v] = dist[u] + weight(u, v). Using a min-priority queue (Fibonacci or binary heap), running time is O((V + E) log V). Does not support negative weight edges (Bellman-Ford is used instead).'
  },

  // SE-301: Software Architecture & Design Patterns
  {
    id: 401,
    course_id: 'c4-se301',
    course_code: 'SE-301',
    document_name: 'Lecture_02_SOLID_Design.pdf',
    page_number: 2,
    title: 'SOLID Object-Oriented Design Principles',
    tags: ['SOLID', 'Single Responsibility', 'Open Closed', 'Liskov Substitution', 'Interface Segregation', 'Dependency Inversion'],
    content: 'S - Single Responsibility Principle (SRP): A class should have one, and only one, reason to change. O - Open/Closed Principle (OCP): Software entities should be open for extension, but closed for modification. L - Liskov Substitution Principle (LSP): Subtypes must be substitutable for their base types without altering correctness. I - Interface Segregation Principle (ISP): Many client-specific interfaces are better than one general-purpose interface. D - Dependency Inversion Principle (DIP): Depend upon abstractions, not concretions.'
  },
  {
    id: 402,
    course_id: 'c4-se301',
    course_code: 'SE-301',
    document_name: 'Lecture_05_Design_Patterns.pdf',
    page_number: 5,
    title: 'Creational Design Patterns: Singleton & Factory Method',
    tags: ['Singleton', 'Double-Checked Locking', 'Factory Method', 'Thread-Safety'],
    content: 'Singleton Pattern: Ensures a class has only one instance and provides a global point of access. Thread-safe implementation uses Double-Checked Locking with a volatile instance variable. Factory Method Pattern: Defines an interface for creating an object, but lets subclasses decide which class to instantiate. Decouples object creation from business logic.'
  },
  {
    id: 403,
    course_id: 'c4-se301',
    course_code: 'SE-301',
    document_name: 'Lecture_05_Design_Patterns.pdf',
    page_number: 6,
    title: 'Structural Design Patterns: Adapter vs Facade',
    tags: ['Adapter', 'Facade', 'Structural Patterns', 'Wrapper', 'Interface Translation'],
    content: 'Adapter Pattern: Converts the interface of an existing class into another interface clients expect, allowing incompatible classes to work together (acts as a translator). Facade Pattern: Provides a unified, high-level interface to a complex subsystem of classes to make the subsystem easier to use. Difference: Adapter changes an existing interface to match an expected one; Facade simplifies a complex set of interfaces into one simplified entry point.'
  },
  {
    id: 404,
    course_id: 'c4-se301',
    course_code: 'SE-301',
    document_name: 'Lecture_08_Architectural_Styles.pdf',
    page_number: 10,
    title: 'Microservices Architecture vs Monolithic Architecture',
    tags: ['Microservices', 'Monolith', 'Scalability', 'Event-Driven', 'API Gateway'],
    content: 'Monolithic Architecture: Entire application built as a single unified deployable unit. Advantages: Simple development and debugging, fast local method calls. Disadvantages: Tight coupling, scaling entire application, tech stack lock-in. Microservices Architecture: Collection of autonomous, independently deployable services communicating over lightweight protocols (HTTP/gRPC/Kafka). Benefits: Independent scaling, technological flexibility, fault isolation. Challenges: Distributed tracing, data consistency (Saga pattern), network latency.'
  }
];

export const INITIAL_SLIDES: SlideEmbedding[] = RAW_SLIDES.map(slide => ({
  ...slide,
  embedding: createEmbedding(slide.title + ' ' + slide.tags.join(' ') + ' ' + slide.content)
}));

// Pre-seeded academic tasks
export const INITIAL_TASKS: AcademicTask[] = [
  {
    id: 't-101',
    course_id: 'c1-cs402',
    course_code: 'CS-402',
    task_type: 'quiz',
    title: 'CS-402 Quiz 2: Adversarial Search & Minimax',
    slide_start: 3,
    slide_end: 8,
    due_at: '2026-09-30T10:00:00-07:00',
    status: 'pending',
    created_at: '2026-09-28T14:30:00-07:00'
  },
  {
    id: 't-102',
    course_id: 'c2-cs304',
    course_code: 'CS-304',
    task_type: 'assignment',
    title: 'CS-304 Assignment 3: Page Replacement Simulator in C++',
    slide_start: 11,
    slide_end: 13,
    due_at: '2026-10-01T23:59:00-07:00',
    status: 'pending',
    created_at: '2026-09-27T18:00:00-07:00'
  },
  {
    id: 't-103',
    course_id: 'c3-cs201',
    course_code: 'CS-201',
    task_type: 'exam',
    title: 'CS-201 Midterm Examination: Trees & Graphs',
    slide_start: 1,
    slide_end: 7,
    due_at: '2026-10-06T09:00:00-07:00',
    status: 'pending',
    created_at: '2026-09-25T11:00:00-07:00'
  }
];

export const INITIAL_DISPATCHES: AlertDispatch[] = [
  {
    id: 'd-101',
    task_id: 't-101',
    task_title: 'CS-402 Quiz 2: Adversarial Search & Minimax',
    course_code: 'CS-402',
    channel: 'whatsapp',
    scheduled_for: '2026-09-29T21:00:00-07:00',
    recipient_phone_or_email: '+92 300 8472910',
    payload_text: '🚨 StudySync Alert: Bhai CS-402 ka Quiz kal subah 10 baje hai! Slides 3-8 (A* Search, Minimax & Alpha-Beta) revise kar lo. Best of luck!',
    status: 'scheduled',
    created_at: '2026-09-28T14:30:00-07:00'
  },
  {
    id: 'd-102',
    task_id: 't-102',
    task_title: 'CS-304 Assignment 3: Page Replacement Simulator in C++',
    course_code: 'CS-304',
    channel: 'email',
    scheduled_for: '2026-10-01T18:00:00-07:00',
    recipient_phone_or_email: 'student@university.edu.pk',
    payload_text: '⏳ StudySync Deadline Countdown: OS Assignment 3 is due in 6 hours! Ensure your FIFO & LRU simulation logs match Slide 13 specifications.',
    status: 'scheduled',
    created_at: '2026-09-27T18:00:00-07:00'
  }
];

// Hybrid Database Store connected to Real Supabase PostgreSQL & pgvector
class SupabaseStore {
  private courses: Course[] = [...INITIAL_COURSES];
  private slides: SlideEmbedding[] = [...INITIAL_SLIDES];
  private tasks: AcademicTask[] = [...INITIAL_TASKS];
  private dispatches: AlertDispatch[] = [...INITIAL_DISPATCHES];
  private isSupabaseConnected = false;
  private lastSyncTime: string | null = null;

  constructor() {
    this.syncWithSupabase();
  }

  // Connect & Sync with Real Supabase Instance
  async syncWithSupabase() {
    try {
      console.log(`Connecting to real Supabase at ${SUPABASE_URL}...`);

      // 1. Fetch courses
      const { data: remoteCourses, error: courseErr } = await supabase.from('courses').select('*');
      if (!courseErr) {
        this.isSupabaseConnected = true;
        this.lastSyncTime = new Date().toISOString();
        if (remoteCourses && remoteCourses.length > 0) {
          this.courses = remoteCourses as Course[];
          console.log(`[Supabase] Loaded ${remoteCourses.length} remote courses from real Supabase instance.`);
        }
      } else {
        console.warn('[Supabase] Courses fetch notice:', courseErr.message);
      }

      // 2. Fetch slides
      const { data: remoteSlides, error: slideErr } = await supabase.from('slide_embeddings').select('*');
      if (!slideErr && remoteSlides && remoteSlides.length > 0) {
        this.slides = remoteSlides.map((s: any) => ({
          ...s,
          embedding: s.embedding || createEmbedding(s.title + ' ' + s.content)
        }));
        console.log(`[Supabase] Loaded ${remoteSlides.length} remote slide chunks.`);
      }

      // 3. Fetch tasks
      const { data: remoteTasks, error: taskErr } = await supabase.from('academic_tasks').select('*');
      if (!taskErr && remoteTasks && remoteTasks.length > 0) {
        this.tasks = remoteTasks as AcademicTask[];
        console.log(`[Supabase] Loaded ${remoteTasks.length} remote tasks.`);
      }

      // 4. Fetch dispatches
      const { data: remoteDispatches, error: dispErr } = await supabase.from('alert_dispatches').select('*');
      if (!dispErr && remoteDispatches && remoteDispatches.length > 0) {
        this.dispatches = remoteDispatches as AlertDispatch[];
        console.log(`[Supabase] Loaded ${remoteDispatches.length} remote dispatches.`);
      }

      console.log(`[Supabase] Active connection verified with ${SUPABASE_URL}`);
    } catch (err: any) {
      console.warn('[Supabase] Connection notice:', err?.message || err);
    }
  }

  getSupabaseStatus() {
    return {
      connected: this.isSupabaseConnected,
      url: SUPABASE_URL,
      lastSync: this.lastSyncTime || new Date().toISOString(),
      tables: {
        courses: this.courses.length,
        slide_embeddings: this.slides.length,
        academic_tasks: this.tasks.length,
        alert_dispatches: this.dispatches.length
      }
    };
  }

  getCourses(): Course[] {
    return [...this.courses];
  }

  getSlides(): SlideEmbedding[] {
    return [...this.slides];
  }

  getTasks(): AcademicTask[] {
    return [...this.tasks];
  }

  getDispatches(): AlertDispatch[] {
    return [...this.dispatches];
  }

  resetData() {
    this.courses = [...INITIAL_COURSES];
    this.slides = [...INITIAL_SLIDES];
    this.tasks = [...INITIAL_TASKS];
    this.dispatches = [...INITIAL_DISPATCHES];
    this.syncWithSupabase();
  }

  findCourse(codeOrName: string): Course | undefined {
    const term = codeOrName.trim().toLowerCase();
    return this.courses.find(c => {
      const code = c.code.toLowerCase();
      const title = c.title.toLowerCase();
      if (code === term || code.replace('-', '') === term.replace('-', '')) return true;
      if (term.includes('ai') && code === 'cs-402') return true;
      if ((term.includes('os') || term.includes('operating')) && code === 'cs-304') return true;
      if ((term.includes('dsa') || term.includes('algo') || term.includes('data structure')) && code === 'cs-201') return true;
      if ((term.includes('se') || term.includes('design pattern') || term.includes('architecture')) && code === 'se-301') return true;
      return title.includes(term) || code.includes(term);
    });
  }

  // 1. TOOL: supabase_vector_search
  vectorSearch(params: {
    query: string;
    course_code: string;
    match_count?: number;
    start_page?: number;
    end_page?: number;
  }): Array<{
    slide_id: number;
    course_code: string;
    document_name: string;
    page_number: number;
    title: string;
    content: string;
    similarity: number;
    tags: string[];
  }> {
    const { query, course_code, match_count = 4, start_page, end_page } = params;
    const queryVec = createEmbedding(query);

    // Normalize course code matching
    const targetCourse = this.findCourse(course_code);
    const targetCode = targetCourse ? targetCourse.code : course_code.toUpperCase();

    // Filter by course code and slide bounds if specified
    const filtered = this.slides.filter(slide => {
      const matchesCourse = slide.course_code.toLowerCase().replace('-', '') === targetCode.toLowerCase().replace('-', '');
      if (!matchesCourse) return false;

      if (start_page !== undefined && slide.page_number < start_page) return false;
      if (end_page !== undefined && slide.page_number > end_page) return false;

      return true;
    });

    // Score using cosine similarity + lexical boost
    const scored = filtered.map(slide => {
      const cosSim = cosineSimilarity(queryVec, slide.embedding);

      // Lexical check boost
      const qTokens = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      let lexicalHits = 0;
      const fullText = (slide.title + ' ' + slide.content + ' ' + slide.tags.join(' ')).toLowerCase();
      for (const token of qTokens) {
        if (fullText.includes(token)) lexicalHits++;
      }
      const lexicalScore = qTokens.length > 0 ? (lexicalHits / qTokens.length) * 0.4 : 0;
      const combinedScore = Math.min(1.0, (cosSim * 0.6) + lexicalScore + 0.15);

      return {
        slide_id: slide.id,
        course_code: slide.course_code,
        document_name: slide.document_name,
        page_number: slide.page_number,
        title: slide.title,
        content: slide.content,
        similarity: parseFloat(combinedScore.toFixed(4)),
        tags: slide.tags
      };
    });

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, match_count);
  }

  // 2. TOOL: supabase_upsert_task
  upsertTask(params: {
    course_code: string;
    task_type: 'quiz' | 'assignment' | 'exam' | 'study_session';
    title: string;
    due_timestamp: string;
    slide_range?: number[];
  }): AcademicTask {
    const course = this.findCourse(params.course_code);
    const course_code = course ? course.code : params.course_code.toUpperCase();
    const course_id = course ? course.id : `c-${course_code.toLowerCase()}`;

    const slide_start = params.slide_range && params.slide_range.length >= 1 ? params.slide_range[0] : null;
    const slide_end = params.slide_range && params.slide_range.length >= 2 ? params.slide_range[1] : slide_start;

    // Check if an existing task matches title and course to update
    const existingIdx = this.tasks.findIndex(t => 
      t.course_code === course_code && 
      t.task_type === params.task_type &&
      t.title.toLowerCase() === params.title.toLowerCase()
    );

    let savedTask: AcademicTask;

    if (existingIdx !== -1) {
      savedTask = {
        ...this.tasks[existingIdx],
        due_at: params.due_timestamp,
        slide_start,
        slide_end,
      };
      this.tasks[existingIdx] = savedTask;
    } else {
      savedTask = {
        id: `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        course_id,
        course_code,
        task_type: params.task_type,
        title: params.title,
        slide_start,
        slide_end,
        due_at: params.due_timestamp,
        status: 'pending',
        created_at: new Date().toISOString()
      };
      this.tasks.unshift(savedTask);
    }

    // Attempt remote Supabase insertion
    (async () => {
      try {
        const { error } = await supabase.from('academic_tasks').upsert({
          id: savedTask.id,
          course_id: savedTask.course_id,
          task_type: savedTask.task_type,
          title: savedTask.title,
          slide_start: savedTask.slide_start,
          slide_end: savedTask.slide_end,
          due_at: savedTask.due_at,
          status: savedTask.status
        });
        if (error) {
          console.log(`[Supabase] Task cached locally (Remote note: ${error.message})`);
        } else {
          console.log(`[Supabase] Synced task ${savedTask.id} to remote Supabase.`);
        }
      } catch (err: any) {
        console.warn('[Supabase] Remote task sync error:', err?.message || err);
      }
    })();

    return savedTask;
  }

  // 3. TOOL: dispatch_student_alert
  dispatchAlert(params: {
    task_id?: string;
    channel: 'whatsapp' | 'email';
    trigger_timestamp: string;
    message: string;
  }): AlertDispatch {
    const task = params.task_id ? this.tasks.find(t => t.id === params.task_id) : undefined;
    const recipient = params.channel === 'whatsapp' ? '+92 300 8472910' : 'student@university.edu.pk';

    const newDispatch: AlertDispatch = {
      id: `disp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      task_id: params.task_id || (task ? task.id : 'general-academic'),
      task_title: task ? task.title : 'StudySync Academic Alert',
      course_code: task ? task.course_code : 'CAMPUS',
      channel: params.channel,
      scheduled_for: params.trigger_timestamp,
      recipient_phone_or_email: recipient,
      payload_text: params.message,
      status: 'scheduled',
      created_at: new Date().toISOString()
    };

    this.dispatches.unshift(newDispatch);

    // Attempt remote Supabase insertion
    (async () => {
      try {
        const { error } = await supabase.from('alert_dispatches').insert({
          id: newDispatch.id,
          task_id: newDispatch.task_id,
          channel: newDispatch.channel,
          scheduled_for: newDispatch.scheduled_for,
          recipient_phone_or_email: newDispatch.recipient_phone_or_email,
          payload_text: newDispatch.payload_text
        });
        if (error) {
          console.log(`[Supabase] Dispatch cached locally (Remote note: ${error.message})`);
        } else {
          console.log(`[Supabase] Synced dispatch ${newDispatch.id} to remote Supabase.`);
        }
      } catch (err: any) {
        console.warn('[Supabase] Remote dispatch sync error:', err?.message || err);
      }
    })();

    return newDispatch;
  }

  toggleTaskStatus(taskId: string): AcademicTask | null {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return null;
    task.status = task.status === 'completed' ? 'pending' : 'completed';

    // Sync status change to remote Supabase
    (async () => {
      try {
        await supabase
          .from('academic_tasks')
          .update({ status: task.status })
          .eq('id', task.id);
      } catch {
        // silent fallback
      }
    })();

    return task;
  }

  triggerDispatchNow(dispatchId: string): AlertDispatch | null {
    const item = this.dispatches.find(d => d.id === dispatchId);
    if (!item) return null;
    item.status = 'dispatched';

    // Sync dispatch status to remote Supabase
    (async () => {
      try {
        await supabase
          .from('alert_dispatches')
          .update({ status: 'dispatched' })
          .eq('id', item.id);
      } catch {
        // silent fallback
      }
    })();

    return item;
  }
}

export const dbStore = new SupabaseStore();
