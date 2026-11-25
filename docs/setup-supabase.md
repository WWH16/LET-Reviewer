# Setting up accounts and sync

The app runs without any of this: with no keys set, the Account section is hidden and everything stays on the device. Do these steps once to turn accounts on. Design: `docs/superpowers/specs/2026-11-17-accounts-sync-design.md`.

Menu names below are the Supabase dashboard's at the time of writing; if one has moved, search the dashboard for the setting's name.

## 1. Create the project

1. Sign up at supabase.com and create a new project (the free plan is enough). Pick the region closest to your users; Singapore for the Philippines.
2. Save the database password it asks for in a password manager. The app never uses it.

## 2. Create the table

1. Open **SQL Editor**, choose **New query**.
2. Paste the whole of `supabase/migrations/20261117000000_docs.sql` and press **Run**. It should finish with "Success. No rows returned".
3. Open **Advisors → Security**. There should be no warning about `public.docs` or `delete_my_account`.

## 3. Sign-in settings

Under **Authentication → Sign In / Providers**:

- **Email** provider: on.
- **Confirm email**: on.
- **Minimum password length**: 8.
- **Email OTP length**: 6. The app's code field accepts exactly six digits.
- **Allow anonymous sign-ins**: off.

Under **Authentication → Emails → Templates**, change two templates so they show a code and no link. The app has no page for a link to open. The code sits alone in a large box, the way GitHub's verification emails show it. Gmail recognises an email like this as a verification code and puts its own **Copy code** button above it; an email cannot carry a working copy button of its own, since email clients do not run scripts.

Set each template's subject too: `Your LET Prep code` for both.

**Confirm signup**

```html
<div style="max-width:480px;margin:0 auto;padding:24px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#2b261d">
  <h2 style="margin:0 0 8px">Confirm your email</h2>
  <p style="margin:0 0 16px">Your LET Prep verification code is:</p>
  <p style="margin:0 0 16px;padding:16px 20px;border-radius:12px;background:#eff1f5;text-align:center;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:10px">{{ .Token }}</p>
  <p style="margin:0;color:#5c564b">Type it into LET Prep to finish creating your account.</p>
</div>
```

**Reset password**

```html
<div style="max-width:480px;margin:0 auto;padding:24px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#2b261d">
  <h2 style="margin:0 0 8px">Reset your password</h2>
  <p style="margin:0 0 16px">Your LET Prep verification code is:</p>
  <p style="margin:0 0 16px;padding:16px 20px;border-radius:12px;background:#eff1f5;text-align:center;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:10px">{{ .Token }}</p>
  <p style="margin:0;color:#5c564b">Type it into LET Prep with your new password. If you did not ask for this, ignore this email.</p>
</div>
```

## 4. Give the app its two keys

1. Open **Project Settings → API Keys** (the project URL is under **Project Settings → Data API**).
2. Copy the **Project URL** and the **Publishable key** (it starts with `sb_publishable_`). Do not copy the secret key; the app must never have it.
3. In the project folder, create a file named `.env.local` (it is already ignored by git):

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx
```

4. Restart the dev server. Settings now shows an **Account** section.

## 5. Check it works

Use two browsers (or one normal window and one private window) so each has its own data.

1. In the first, create an account, type the code from the email, and answer a Quick 10.
2. In the second, sign in with the same email. The answers appear in Stats.
3. Edit a question in the second, press **Sync now** in both, and see the edit in the first.
4. In **Table Editor → docs**, the rows belong to your user. With sample answers loaded, no row id starts with `demo-`.

## 6. Before other people use it

- **Email sender.** Supabase's built-in sender allows only a few emails an hour and is meant for testing. Under **Authentication → Emails → SMTP Settings**, connect your own sender (Resend, Brevo, or any SMTP service).
- **Host keys.** Add the same two variables to your host's environment settings (on Vercel: Project → Settings → Environment Variables), then redeploy.
- **Site URL.** Under **Authentication → URL Configuration**, set it to the production address.
- **Free plan pause.** A free project pauses after about a week with no activity. Data is kept, but sync fails until it is resumed from the dashboard. The app keeps working on each device meanwhile.

## What is stored

One row per question, answer, mock exam and settings record, each tied to the account that wrote it. Row-level security lets an account read and write only its own rows. Sample answers and device-only values (last backup date, last drill) never leave the device. Deleting an account from Settings removes its rows.
