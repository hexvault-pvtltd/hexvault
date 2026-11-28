import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { LetterContent } from "./content";

export async function renderLetterPdf(letter: LetterContent & { id: string; approvedBy?: string | null }, draft: boolean) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  pdf.setTitle(letter.title); pdf.setAuthor(letter.companyName);
  let page = pdf.addPage([595.28, 841.89]);
  let y = 0;
  const margin = 54, width = page.getWidth() - margin * 2;
  function header() {
    page.drawRectangle({ x: margin, y: 784, width, height: 3, color: rgb(0.96, 0.39, 0.15) });
    const companySize = Math.min(11, 11 * width / Math.max(width, bold.widthOfTextAtSize(letter.companyName, 11)));
    page.drawText(letter.companyName, { x: margin, y: 800, size: companySize, font: bold, color: rgb(0.14, 0.19, 0.27) });
    if (draft) page.drawText("DRAFT - NOT APPROVED FOR RELEASE", { x: margin, y: 762, size: 10, font: bold, color: rgb(0.7, 0.22, 0.15) });
    y = draft ? 730 : 750;
  }
  function line(text: string, size = 11, font = regular, spacing = 18) {
    if (y < 85) { page = pdf.addPage([595.28, 841.89]); header(); }
    page.drawText(text, { x: margin, y, size, font, color: rgb(0.14, 0.19, 0.27) }); y -= spacing;
  }
  function paragraph(text: string, size = 11, font = regular, spacing = 18) {
    for (const source of text.replace(/\r\n?/g, "\n").split("\n")) {
      let current = "";
      for (let token of source.split(/(\s+)/)) {
        if (current && font.widthOfTextAtSize(current + token, size) > width) {
          line(current.trimEnd(), size, font, spacing); current = ""; token = token.trimStart();
        }
        // Long unbroken identifiers still have to fit within the page margins.
        for (const character of token) {
          if (font.widthOfTextAtSize(current + character, size) > width) { line(current, size, font, spacing); current = ""; }
          current += character;
        }
      }
      line(current, size, font, spacing);
    }
  }
  header();
  paragraph(letter.title, 20, bold, 27); y -= 12;
  paragraph(`Date: ${letter.documentDate}`, 10);
  paragraph(`To: ${letter.recipientName}`, 10); y -= 18;
  paragraph(letter.body);
  const pages = pdf.getPages();
  pages.forEach((item, index) => {
    item.drawText(`Reference: ${letter.id}`, { x: margin, y: 45, font: regular, size: 8, color: rgb(0.4, 0.45, 0.5) });
    item.drawText(`${index + 1} / ${pages.length}`, { x: 495, y: 45, font: regular, size: 8 });
  });
  return Buffer.from(await pdf.save());
}
