# Letters and certificates

Open **HR & hiring > Records > Letters & certificates** (`/hr/letters`).

HR, owners, department heads, team leads, and active project managers can prepare
documents. Project managers are active project owners or active project members
with a `LEAD`, `MANAGER`, or `PROJECT_MANAGER` role. Managers can access their own
documents; HR and owners can review all documents.

## Design and approve

Write any letter or certificate, insert recipient and date details, and optionally
apply a reusable template. Upload a PDF, PNG, or JPEG background using the designer.
PDF templates retain their page dimensions, including mixed sizes. Use A3, A4, A5,
Letter, Legal, custom dimensions, portrait, or landscape. Upload PNG/JPEG signature
images, or use custom text blocks for signatory names and titles.

Select a block on the page or in the block list. Drag its arrow handle, use arrow
keys (Shift for 10-point steps), use the directional buttons, or enter exact
positions. The grid snaps dragging to 5 points; Alt temporarily disables snapping.
Text supports font, size, bold, italic, line spacing, and left/center/right/justified
alignment. Position blocks against the left, center, or right of the page.

### Letterheads and long letters

Uploading a letterhead initially arranges editable blocks inside a suggested blank
area. Set **Header space**, **Footer space**, and the left/right borders in mm to
match your artwork, then choose **Arrange letter inside letterhead**. Green guides
show this area in the editor. Generated text stays inside it on continuation pages;
signatures and their name/title follow the final text and stay together when possible.
The letterhead artwork itself is not analyzed to find blank space, so check these
margins against the preview once for each new design. The automatic arrangement
removes the separate company-name block because branding is normally already on
the letterhead; add it as a custom text block if needed.
Artwork and signatures keep their original proportions. Changing to a different
page aspect ratio centers the artwork without stretching it; recheck the printable
area in the preview after changing paper size or orientation.

Choose whether to repeat the letterhead on every page or use it only on the first
page. Save the adjusted layout as a reusable template for later letters. Manual
adjustments remain available; Arrange letter restores the automatic following order.

Use **Follow block** for flowing layouts. The default signature follows the body.
Long text continues onto new pages, and following signature blocks move after the
last line. Small signatures are kept together. Dragging a following block switches
it to manual positioning; select Follow block again to restore automatic placement.
Add explicit pages or assign a block to a later page when needed. Undo keeps the
last 20 layout changes. The preview uses the same PDF generator as export.

Save a draft, then request owner approval. The owner reviews the exact layout,
recipient, email copy, and WhatsApp copy and approves or returns it with feedback.
Any edit to text, layout, signatures, recipient, or sharing copy clears approval.
Only HR can prepare external sharing after owner approval.

## Share without connecting an email account

**Gmail**, **Email app**, and **WhatsApp** download the approved PDF and open a
composer with the prepared text. Attach the downloaded PDF in the selected app,
then send from that app. WhatsApp numbers use international format.

**Prepare file sharing** loads the approved PDF. On browsers supporting file
sharing, **Share PDF with file** opens the device share sheet with the PDF included.
Choose Gmail, WhatsApp, or another supported target. Available targets and whether
the target accepts both file and text depend on the device and installed apps.

A website cannot attach a local file through a Gmail compose, mailto, or WhatsApp
link. No Gmail credentials, SMTP, OAuth, or email-provider setup is used by this
workflow. The app records `letter.share_prepared`; opening a composer is not proof
of sending. Existing SENT records from older server delivery are left intact.

## Reusable templates and limits

Save backgrounds, page setup, blocks, signature images, body, and email/WhatsApp copy as a
reusable template. Supported placeholders are `{{candidate_name}}`, `{{date}}`,
`{{job_title}}`, `{{start_date}}`, `{{end_date}}`, `{{company_name}}`,
`{{project_name}}`, and `{{custom_details}}`. Inserting a template resolves these
in text and custom layout blocks. Existing documents are independent snapshots.
Empty `{{custom_details}}` is omitted. Remaining required placeholders are named
before saving so the author can fill or remove them without an unexplained 422.
Owner/HR templates are available to managers; manager-created templates are private
to their creator and visible to HR/owner. Signature images are part of the saved
template, so include them only in templates intended for those users.

Templates accept up to 30 explicit pages; text can flow up to 100 generated pages.
Custom dimensions range from 25.4 to 1058 mm. Template uploads are limited to 3 MB,
signature images to 2 MB, and total layout data to 7.5 MB. Latin PDF text is
supported. DOCX import, OCR, editing text already baked into a PDF/image background,
non-Latin fonts, and cryptographic signatures are not included. Use an unfilled
letterhead template when you want all variable text editable.

## Deployment

Run `npm run db:generate`, then `npm run db:migrate` against the intended database.
Apply both letter migrations if the original feature has not been deployed.
On Windows, stop the project's dev processes before generating if Prisma reports
a locked engine DLL. Restart the app after generation and migration.

Other application features may still use company SMTP/provider settings; letter
sharing does not. The existing offboarding certificate registry and ID/DOB
verification remain separate; generated PDFs are not automatically registered.
Drafts are marked unapproved. App approval controls preparing a release from this
workflow; it cannot restrict editing or sending once a file leaves the app.
