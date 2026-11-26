// The app's places, shared by the sidebar, the phone tab bar, the jump menu and the Settings list.

import { syncAvailable } from '../sync/trigger';
import type { IconName } from '../ui/Icon';

export interface Place {
  to: string;
  label: string;
  /** The phone tab bar's shorter label. */
  short?: string;
  icon: IconName;
  /** True on the screens it leads to, so the tab stays lit there. */
  here: (path: string, search: string) => boolean;
  /** Sidebar only: on phones it is reached from Home instead. */
  wideOnly?: boolean;
  /** Phone tab bar only: the sidebar lists the Settings pages themselves. */
  narrowOnly?: boolean;
}

const session = (path: string, search: string, mode: string) => path === '/session' && new URLSearchParams(search).get('mode') === mode;

export const PLACES: Place[] = [
  { to: '/', label: 'Home', icon: 'home', here: (p) => p === '/' },
  {
    to: '/quizzes',
    label: 'Quizzes',
    icon: 'practice',
    here: (p, s) => p.startsWith('/quiz') || p.startsWith('/question/') || session(p, s, 'quiz'),
  },
  { to: '/mock', label: 'Mock exams', short: 'Mock', icon: 'mock', here: (p) => p.startsWith('/mock') },
  { to: '/unfinished', label: 'Unfinished', icon: 'clock', wideOnly: true, here: (p) => p === '/unfinished' },
  { to: '/progress', label: 'Stats', icon: 'stats', here: (p) => p.startsWith('/progress') },
  { to: '/settings', label: 'Settings', icon: 'settings', narrowOnly: true, here: (p) => p.startsWith('/settings') },
];

export interface SettingsPage {
  id: string;
  label: string;
  /** What is on the page, for the Settings list. */
  line: string;
}

export const SETTINGS_PAGES: SettingsPage[] = [
  { id: 'profile', label: 'Profile', line: 'Your name and avatar.' },
  { id: 'exam', label: 'Exam', line: 'Level, major, exam date and the mock timer.' },
  { id: 'subjects', label: 'Subjects', line: 'The subjects in each part, for your quizzes and mocks.' },
  ...(syncAvailable ? [{ id: 'account', label: 'Account', line: 'Your sign-in, syncing, and deleting your account.' }] : []),
  { id: 'data', label: 'Data', line: 'Back up, restore, sample answers, and erase this device.' },
];
