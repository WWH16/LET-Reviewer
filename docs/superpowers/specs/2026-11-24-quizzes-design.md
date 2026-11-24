# Quizzes and part mock exams: design

## Intent

Questions stop living in one shared bank. They are made inside a **quiz** on one subject
(e.g. Gen Ed › English), and a **mock exam** draws from those quiz questions. There is no
verified / unverified / needs-key check any more. The sidebar is regrouped around this, and
Settings is split into its own pages.

## Decided with the user

- **Quiz** = one part and one subject. Making it creates its questions: copy the prompt to Claude,
  paste the reply. A quiz can be retaken (shuffled) and more quizzes can be made on the same subject.
- **Mock exam** = one part. Pick the subjects and the length. Items are split evenly across the
  picked subjects and drawn from your quiz questions in them. No pasting. A subject that is short
  blocks the start and says how many it has.
- **Choice order is shuffled** on every quiz take and every mock. Questions with "all of the above",
  "both A and B" and the like keep their order.
- **After a mock**: score plus a breakdown by subject. **Retake**: the whole mock or chosen subjects,
  reshuffled.
- **Missed questions** and **Stats** stay, grouped by subject. Stats combines each part's recent
  answers into the LET rating, as today.
- **Sidebar**: Study, Quizzes, Mock exams, Missed questions, Stats; then Settings pages: Profile,
  Exam, Display, Account, Data, About. Phones: bottom bar of Study, Quizzes, Mock, Stats, Settings.
- Review (the bank screen), Quick 10, Timed quiz, Build your own and Question of the Day are removed.
  Count and timer become options when making a quiz.

## Approaches considered

1. **Quiz as a derived group (chosen).** Each question gets a `quizId`. A quiz's subject, size and
   date come from its questions; its name ("Quiz 2") from its order within the subject. No new table,
   no sync or Supabase change: questions already sync.
2. **Quiz as its own table.** Cleaner names and metadata, but needs a new synced collection, a
   Supabase migration to widen the `collection` check, and backup changes. Nothing a quiz needs
   today requires it.
3. **Keep the bank, hide it.** Least code, but keeps the verified/source machinery the user asked to
   remove, and mocks could still draw questions that belong to no quiz.

## Data

- `Question`: adds `quizId`. Drops `status`, `source`, `sourceRef`, `flag`, `importBatchId`, `edited`.
  A question counts when it is not deleted and has an answer key.
- Ids: `quiz-<ISO time>` for a quiz (sorts by creation); `<quizId>~<hash of stem>` for its questions,
  so the same stem in two quizzes stays two questions.
- Old questions (Dexie upgrade, v1 backups, rows pulled from an older device) go through one
  `upgradeQuestion`: each old import batch and subject becomes one quiz. Unkeyed questions are dropped
  from quizzes by the "counts" rule, not deleted.
- `MockExam`: adds `orders` (each item's shown choice order, as original keys) and `subjects`.
  `answers` stay in the letters she saw; grading converts them to the original keys.
- `Attempt.chosen` is always the original key, so history and Missed questions are unaffected by shuffling.
- Schema version 2 for backups.

## Left to the builder

Screen copy, layout inside the existing bento and tile styles, and test coverage of the domain
functions (draw, choice order, upgrade).

## Tasks (one commit each)

1. Data model: `quizId`, the upgrade function, Dexie v2, backup v2, sync normalising pulled questions.
2. Shuffled choices: order helper, quiz sessions and mocks show shuffled letters, grading maps back.
3. Quizzes screens: list by part and subject, new quiz (prompt, paste, preview), take, retake, fix or
   delete a question.
4. Mock exams: subject picks, even split from quiz questions preferring ones not in an earlier mock,
   subject breakdown on results, retake by subject.
5. Missed questions grouped by subject; Stats without bank references.
6. Sidebar and Settings pages; Study and the jump menu updated.
7. Remove the bank, drill, Quick 10, Timed, Question of the Day and their dead code.
