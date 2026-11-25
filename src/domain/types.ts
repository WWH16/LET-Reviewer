// Record shapes (plan §4, §8.5). This layer imports nothing from the rest of the app.

export type Area = 'GenEd' | 'ProfEd' | 'Major';
export type Key = 'A' | 'B' | 'C' | 'D';
export const KEYS: readonly Key[] = ['A', 'B', 'C', 'D'];
export type Lang = 'en' | 'fil';

/** A subject in a part, named by her. The id is fixed when it is added; the name can change. */
export interface Subject {
  id: string;
  name: string;
}
export type Subjects = Record<Area, Subject[]>;

export interface Choice {
  key: Key;
  text: string;
}

export interface Question {
  /** Assigned by the app at import (`ids.ts`), never taken from the pasted JSON. */
  id: string;
  /** The quiz it was made in (`quiz.ts`). Older questions get one from their import batch. */
  quizId: string;
  area: Area;
  /** Her subject's id (`subjects.ts`). */
  subarea: string;
  lang: Lang;
  stem: string;
  choices: Choice[];
  answer: Key | null;
  explanation: string;
  media: { src?: string; alt: string } | null;
  tags: string[];
  updatedAt: string;
  deleted: boolean;
}

/** How an answer was given. 'drill', 'quick', 'qotd' and 'timed' are past modes, kept so old answers still read. */
export type Mode = 'quiz' | 'review' | 'drill' | 'quick' | 'qotd' | 'timed' | 'mock-digital' | 'mock-printed';

/** One answer. Append-only. Whether it was correct is worked out, never stored (plan §4). */
export interface Attempt {
  id: string;
  questionId: string;
  /** `null` = left blank in a mock exam. */
  chosen: Key | null;
  ms: number | null;
  mode: Mode;
  at: string;
  examId?: string;
}

/** One answer in a quiz take: the letter she picked as shown, and whether it was right. */
export interface TakeResult {
  id: string;
  chosen: Key;
  correct: boolean;
}

/** A quiz take in progress, kept on this device (meta 'quizTakes') so she can leave and continue it. */
export interface QuizTake {
  id: string;
  quizId: string;
  timed: boolean;
  /** Question ids in this take's shuffled order. */
  items: string[];
  /** Each question's shown choice order, as original keys. */
  orders: Record<string, Key[]>;
  results: TakeResult[];
  /** Time spent with the take open, for a timed quiz's clock. */
  spentMs: number;
  updatedAt: string;
}

export type PaperSize = 'a4' | 'letter' | 'folio';

export interface MockExam {
  id: string;
  /** The Exam ID she sees and that gets printed, e.g. `GE-1115-A`. */
  label: string;
  form: 'digital' | 'printed';
  part: Area;
  itemIds: string[];
  /** Each item's choice order as shown, as original keys (`choices.ts`). Absent on exams made before shuffling. */
  orders?: Key[][];
  /** The subjects she picked, as sub-area ids. Absent on exams made before subject picks. */
  subjects?: string[];
  /** Minutes allowed, after the timer setting. `null` = timer off. */
  timeLimitMin: number | null;
  paper: { size: PaperSize; columns: 1 | 2; large: boolean; answerKey: boolean } | null;
  /** Item number (1-based) to the chosen key. A missing key = not answered yet. `null` = left blank. */
  answers: Record<string, Key | null>;
  /** Item number to the exam time (ms) when it was last answered. Used for pacing. */
  answeredAt: Record<string, number>;
  flags: number[];
  /** Set when a short sub-area was filled from others at draw time. */
  drawNote: string | null;
  status: 'in-progress' | 'printed' | 'graded';
  createdAt: string;
  /** Time spent with the exam open. The clock stops while the app is closed. */
  elapsedMs: number;
  submittedAt: string | null;
  /** Printed exams: the total minutes she entered. */
  totalMin: number | null;
  updatedAt: string;
  deleted: boolean;
}

export type Level = 'elementary' | 'secondary';
export type TimerSetting = 'real' | '1.5' | '2' | 'off';

export interface Settings {
  id: 'settings';
  /** Her name, shown beside her avatar. May be empty. */
  name: string;
  /** The starting face (shown as Woman or Man) her avatar is drawn from. */
  avatarBase: 'girl' | 'boy';
  /** Avataaars parts and colours she chose herself, by the style's own names. 'none' leaves a part out. The rest follow the starting face. */
  avatarParts: Record<string, string>;
  /** False until she finishes the welcome screen. */
  onboarded: boolean;
  level: Level;
  major: string;
  /** Her subjects in each part, in her order. Empty until she adds some. */
  subjects: Subjects;
  examDate: string | null;
  timer: TimerSetting;
  textSize: 100 | 115 | 130;
  shortcuts: boolean;
  strictSheet: boolean;
  /** Digital mocks: show one item per screen instead of the whole booklet. */
  oneAtATime: boolean;
  updatedAt: string;
  deleted: false;
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  name: '',
  avatarBase: 'girl',
  avatarParts: {},
  onboarded: false,
  level: 'elementary',
  major: '',
  subjects: { GenEd: [], ProfEd: [], Major: [] },
  examDate: null,
  timer: 'real',
  textSize: 100,
  shortcuts: true,
  strictSheet: false,
  oneAtATime: false,
  updatedAt: '1970-01-01T00:00:00.000Z',
  deleted: false,
};

/** 2: questions carry `quizId`. Older backups are upgraded on restore. */
export const SCHEMA_VERSION = 2;

export interface Backup {
  type: 'backup';
  schemaVersion: number;
  exportedAt: string;
  questions: Question[];
  attempts: Attempt[];
  mockExams: MockExam[];
  settings: Settings | null;
}
