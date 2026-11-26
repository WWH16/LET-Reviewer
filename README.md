<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="brand/logo/let-prep-horizontal-white-1200.png">
    <img src="brand/logo/let-prep-horizontal-black-1200.png" alt="LET Prep" width="360">
  </picture>
</p>

# LET Prep

An offline-first practice app for the Philippine **Licensure Examination for Teachers (LET)**. It keeps one question bank, offers several ways to practise, and reports progress the way the LET is scored.

Built with React, TypeScript and Vite. It installs as a Progressive Web App and works without an internet connection. Cloud sync is optional.

## Features

- **Quizzes by subject.** Pick a part (General Education, Professional Education, Specialization) and a subject, then build a quiz of 10 to 150 questions.
- **AI-assisted question creation, with no API key.** The app writes a prompt for you to send to Claude in a normal chat. You paste the reply back, and the app checks every item before saving it. AI-written questions stay marked *Unverified* until you check them.
- **Review of mistakes.** Every session ends with a list of the questions you missed, each with its correct answer and explanation. Unfinished quizzes are kept so you can resume them.
- **Mock exams in LET format.** Questions are drawn in proportion to the exam's weights, and the exam runs on a timer that auto-saves. You can take a mock on screen with an answer sheet, or print it on A4, Letter or Folio paper and enter the answers by tap afterwards.
- **Stats.** Accuracy by part and subject, a projected LET rating, warnings for the 75% passing rule and the 50% floor per part, and your weakest topics.
- **Offline and private by default.** All data lives in the browser (IndexedDB). You can export a versioned backup file and restore it.
- **Optional accounts and sync.** If Supabase keys are set, users can sign in with an email code and keep their progress on several devices.
- **Accessible.** Keyboard shortcuts, real form controls, screen-reader announcements, 44 px tap targets, and colour contrast checked by tests.

## Tech stack

| Area | Choice |
|---|---|
| UI | React 19, React Router 7 (hash routes), Cloudflare Kumo components, Phosphor icons |
| Language and build | TypeScript, Vite, `vite-plugin-pwa` |
| Local data | Dexie (IndexedDB), the source of truth |
| Sync (optional) | Supabase Auth and one `docs` table protected by row-level security |
| Tests | Vitest |

## Getting started

You need Node.js 22 or later and npm.

```bash
git clone https://github.com/<your-username>/LET-Reviewer.git
cd LET-Reviewer
npm install
npm run dev
```

Open http://localhost:5173. The app runs fully offline with no further setup. To try it with data, open **Settings → Data** and load the sample answers, or create a quiz.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts the dev server |
| `npm run build` | Type-checks and builds the production bundle into `dist/` |
| `npm run preview` | Serves the production build locally |
| `npm test` | Runs the test suite once |

## Optional: accounts and sync

Without keys, the Account section is hidden and everything stays on the device. To turn on accounts:

1. Create a Supabase project and run `supabase/migrations/20261117000000_docs.sql` in its SQL editor.
2. Copy `.env.example` to `.env.local` and fill in the two values:

   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx
   ```

3. Restart the dev server.

Use only the **publishable** key. Never put the secret key in the app. The full guide, including email templates and production settings, is in [docs/setup-supabase.md](docs/setup-supabase.md).

## Importing questions

Questions are imported as a JSON array. Each item looks like this:

```json
{
  "area": "GenEd",
  "subarea": "English",
  "topic": "Vocabulary in Context",
  "lang": "en",
  "stem": "The speaker's argument was so cogent that even her critics agreed with her. In this sentence, cogent most nearly means:",
  "choices": [
    { "key": "A", "text": "confusing" },
    { "key": "B", "text": "convincing" },
    { "key": "C", "text": "lengthy" },
    { "key": "D", "text": "emotional" }
  ],
  "answer": "B",
  "explanation": "A cogent argument is clear and persuasive.",
  "source": "ai",
  "sourceRef": "Claude GenEd set, #1",
  "status": "unverified",
  "media": null,
  "tags": []
}
```

The importer is tolerant. It strips code fences, recovers a list that was cut off, and shows a preview of new, skipped and invalid items before anything is saved. The app assigns question IDs itself. [imports/general-education-30.json](imports/general-education-30.json) is a full example.

## Project structure

```
src/
  app/        App shell, routes, navigation, sign-in screen
  domain/     Pure logic: types, LET config, validation, scoring, exam draw, prompts (imports nothing)
  db/         Dexie database, repository functions, backup and restore
  ui/         Shared components and stylesheets
  features/   Screens: home, quizzes, practice, mock, progress, settings
  sync/       Supabase client, auth and sync (the only place that imports Supabase)
supabase/     SQL migrations
brand/        Logo masters, variants, web icons and usage guide
docs/         Product plan, design specs and audits
```

The import direction is one way: `domain` ← `db` ← `features`, and `ui` uses only `domain` types. A test checks this boundary.

## Deployment

The build output is a static site, and hash routing means no rewrite rules are needed. Deploy `dist/` to any static host, such as Vercel, Netlify or GitHub Pages. If you use sync, add the two `VITE_SUPABASE_*` variables to the host's environment settings before building.

## Content and disclaimer

The repository ships only original sample questions. Do not commit questions from review centres or other copyrighted sources: import them on your own device instead.

This project is not affiliated with the Professional Regulation Commission (PRC). The subject weights in `src/domain/let-config.ts` are placeholders until checked against the official Table of Specifications. A projected rating is an estimate, not a guarantee of an exam result.

## License

[MIT](LICENSE) © 2026 John Ansley Rocel
