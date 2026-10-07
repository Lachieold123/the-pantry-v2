// Continue with email (D-043) signs in with a 6-digit code. Supabase's own
// sender emails a link, not a code: the code only appears once the project
// has a custom SMTP sender and email templates that print {{ .Token }}
// (docs/ACCOUNTS.md, "Email code" and setup steps 3–4). Until then the email
// path can't work, so the app hides it rather than offering a button that
// leads nowhere.

/** Flip to true once custom SMTP and the {{ .Token }} templates are live in Supabase. */
export const EMAIL_CODES_CONNECTED: boolean = false;
