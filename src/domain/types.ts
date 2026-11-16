// Record shapes (plan §4, §8.5). This layer imports nothing from the rest of the app.

export type Area = 'GenEd' | 'ProfEd' | 'Major';
export type Key = 'A' | 'B' | 'C' | 'D';
export const KEYS: readonly Key[] = ['A', 'B', 'C', 'D'];
export type QuestionStatus = 'verified' | 'unverified' | 'needs-key' | 'flagged';
export type Source = 'review-center' | 'ai';
export type Lang = 'en' | 'fil';

export interface Choice {
  key: Key;
  text: string;
}

export interface Question {
  /** Assigned by the app at import (`ids.ts`), never taken from the pasted JSON. */
  id: string;
  area: Area;
  /** Sub-area id from `let-config.ts`. */
  subarea: string;
  topic: string;
  lang: Lang;
  stem: string;
  choices: Choice[];
  answer: Key | null;
  explanation: string;
  source: Source;
  sourceRef: string;
  status: QuestionStatus;
  media: { src?: string; alt: string } | null;
  tags: string[];
  /** Set from practice ("Flag", "Key looks wrong"). Kept apart from `status` so clearing it restores nothing. */
  flag: { reason: string; at: string } | null;
  importBatchId: string;
  /** True once she edits the item in the app. Re-importing never overwrites it. */
  edited: boolean;
  updatedAt: string;
  deleted: boolean;
}

export type Mode = 'drill' | 'review' | 'quick' | 'qotd' | 'timed' | 'mock-digital' | 'mock-printed';

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

export type PaperSize = 'a4' | 'letter' | 'folio';

export interface MockExam {
  id: string;
  /** The Exam ID she sees and that gets printed, e.g. `GE-1115-A`. */
  label: string;
  form: 'digital' | 'printed';
  part: Area;
  itemIds: string[];
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
  examDate: string | null;
  timer: TimerSetting;
  theme: 'system' | 'light' | 'dark';
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
  examDate: null,
  timer: 'real',
  theme: 'light',
  textSize: 100,
  shortcuts: true,
  strictSheet: false,
  oneAtATime: false,
  updatedAt: '1970-01-01T00:00:00.000Z',
  deleted: false,
};

export const SCHEMA_VERSION = 1;

export interface Backup {
  type: 'backup';
  schemaVersion: number;
  exportedAt: string;
  questions: Question[];
  attempts: Attempt[];
  mockExams: MockExam[];
  settings: Settings | null;
}
