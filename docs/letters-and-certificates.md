# Letters and certificates

Open **HR & hiring > Records > Letters & certificates** (`/hr/letters`).

HR, owners, department heads, team leads, and active project managers can create
letters. Project managers are employees who own an active project or have an
active project membership with `LEAD`, `MANAGER`, or `PROJECT_MANAGER` as its project role.
Managers can see their own letters; HR and owners can review all letters.

1. Choose an offer, service, or project template, or write your own content.
2. Enter the candidate's name, email, document date, and template details.
3. Insert the template, edit its contents and email message, and save a draft.
4. Request owner approval. The owner reviews the PDF, recipient, subject, and
   message and either approves or returns the letter with feedback.
5. HR opens Review details and sends the approved PDF through company email or
   Gmail. An owner needs the HR role as well to send from this workflow.

Editing an approved letter clears approval. Pending, sent, and delivery-in-progress
letters cannot be edited. Revision checks protect concurrent edits and approval;
a delivery claim prevents repeated sends. Email acceptance is recorded as SENT;
it does not prove inbox delivery. Failed or uncertain sends are not retried
automatically: check the sender's logs before preparing a new letter.

Reusable templates support `{{candidate_name}}`, `{{date}}`, `{{job_title}}`,
`{{start_date}}`, `{{end_date}}`, `{{company_name}}`, `{{project_name}}`, and
`{{custom_details}}`. Owner/HR templates are available to managers; a manager's
templates are private to them and visible to HR and owners. Template edits do
not change existing letters. This version uses text templates and supports Latin
PDF text; uploading DOCX layouts and non-Latin PDF fonts are not included.

## Deployment

Run `npm run db:generate`, then apply the migration using `npm run db:migrate`
against the intended database before deploying the application.

Company email uses the existing Resend, Brevo, or SMTP environment settings.
For the separate Gmail option, configure `GMAIL_USER` and `GMAIL_APP_PASSWORD`
on the server. Use a Google app password for an account that supports it. This
is server-side Gmail SMTP delivery; it does not open a user's Gmail compose UI.
Both delivery methods attach the generated PDF.

Draft PDFs are marked as unapproved. Approval governs sending through this app;
it is not a cryptographic signature or a restriction on external mail clients.
The existing offboarding certificate registry and ID/DOB verification remain a
separate feature; generated PDFs are not automatically registered there.
