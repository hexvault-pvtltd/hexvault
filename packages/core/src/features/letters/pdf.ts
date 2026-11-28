import { PDFDocument, degrees, rgb } from "pdf-lib";
import { decodeDataUrl, documentFonts, planDocument, type DocumentFields } from "./layout";

export async function buildLetterPdf(letter: DocumentFields & { id: string; layout?: unknown }, draft: boolean) {
  const pdf = await PDFDocument.create();
  const fonts = await documentFonts(pdf);
  const plan = await planDocument(letter, letter.layout, fonts);
  pdf.setTitle(letter.title); pdf.setAuthor(letter.companyName);
  const background = plan.layout.background;
  let template: PDFDocument | undefined;
  if (background?.kind === "pdf") {
    template = await PDFDocument.load(decodeDataUrl(background.data));
    if (template.getPageCount() > 30) throw new Error("A template can contain at most 30 pages.");
  }
  const backgroundImage = background && background.kind !== "pdf"
    ? background.kind === "png" ? await pdf.embedPng(decodeDataUrl(background.data)) : await pdf.embedJpg(decodeDataUrl(background.data)) : undefined;
  const pages = [];
  for (const [index, size] of plan.pages.entries()) {
    const page = pdf.addPage([size.width, size.height]); pages.push(page);
    const showBackground = plan.layout.backgroundMode !== "FIRST" || index === 0;
    if (template && showBackground) {
      const sourceIndex = Math.min(index, template.getPageCount() - 1);
      const source = template.getPage(sourceIndex);
      // Blank PDF pages are valid backgrounds and have no content stream.
      if (source.node.Contents()) {
        const [embedded] = await pdf.embedPdf(template, [sourceIndex]);
        const angle = ((source.getRotation().angle % 360) + 360) % 360;
        const rotated = angle === 90 || angle === 270;
        const originalWidth = rotated ? source.getHeight() : source.getWidth();
        const originalHeight = rotated ? source.getWidth() : source.getHeight();
        const frame = background?.frame ?? { x: 0, y: 0, width: size.width, height: size.height };
        const scale = Math.min(frame.width / originalWidth, frame.height / originalHeight);
        const artworkWidth = background?.fit === "STRETCH" ? frame.width : originalWidth * scale;
        const artworkHeight = background?.fit === "STRETCH" ? frame.height : originalHeight * scale;
        const left = frame.x + (frame.width - artworkWidth) / 2, top = frame.y + (frame.height - artworkHeight) / 2;
        const bottom = size.height - top - artworkHeight;
        plan.backgrounds.push({ page: index, x: left, y: top, width: artworkWidth, height: artworkHeight });
        page.drawPage(embedded, {
          x: left + (angle === 180 || angle === 270 ? artworkWidth : 0),
          y: bottom + (angle === 90 || angle === 180 ? artworkHeight : 0),
          width: rotated ? artworkHeight : artworkWidth, height: rotated ? artworkWidth : artworkHeight,
          rotate: degrees((360 - angle) % 360),
        });
      }
    }
    if (backgroundImage && showBackground) {
      const frame = background?.frame ?? { x: 0, y: 0, width: size.width, height: size.height };
      const scale = Math.min(frame.width / backgroundImage.width, frame.height / backgroundImage.height);
      const width = background?.fit === "STRETCH" ? frame.width : backgroundImage.width * scale;
      const height = background?.fit === "STRETCH" ? frame.height : backgroundImage.height * scale;
      const x = frame.x + (frame.width - width) / 2, y = frame.y + (frame.height - height) / 2;
      plan.backgrounds.push({ page: index, x, y, width, height });
      page.drawImage(backgroundImage, { x, y: size.height - y - height, width, height });
    }
  }
  for (const region of plan.regions) {
    const page = pages[region.page], height = page.getHeight();
    if (region.kind === "image" && region.image) {
      const embedded = region.image.startsWith("data:image/png") ? await pdf.embedPng(decodeDataUrl(region.image)) : await pdf.embedJpg(decodeDataUrl(region.image));
      const source = plan.layout.blocks.find(block => block.id === region.id)!;
      const scale = Math.min(region.width / embedded.width, region.height / embedded.height);
      const imageWidth = source.lockAspectRatio === false ? region.width : embedded.width * scale;
      const imageHeight = source.lockAspectRatio === false ? region.height : embedded.height * scale;
      page.drawImage(embedded, { x: region.x, y: height - region.y - imageHeight, width: imageWidth, height: imageHeight });
    }
    for (const line of region.lines) {
      const options = { y: height - line.y - line.size, size: line.size, font: fonts[line.font], color: rgb(0.12, 0.17, 0.23) };
      if (line.wordSpacing) {
        let x = line.x;
        for (const word of line.text.split(" ")) {
          page.drawText(word, { ...options, x });
          x += fonts[line.font].widthOfTextAtSize(word + " ", line.size) + line.wordSpacing;
        }
      } else page.drawText(line.text, { ...options, x: line.x });
    }
  }
  pages.forEach((page, index) => {
    if (draft) {
      const fontSize = Math.min(10, page.getWidth() / 40);
      page.drawRectangle({ x: 0, y: page.getHeight() - 22, width: page.getWidth(), height: 22, color: rgb(1, 0.94, 0.88), opacity: 0.96 });
      page.drawText("DRAFT - NOT APPROVED FOR RELEASE", { x: 12, y: page.getHeight() - 15, size: fontSize, font: fonts["Helvetica-Bold"], color: rgb(0.7, 0.2, 0.1) });
    }
    const footerSize = Math.min(7, page.getWidth() / 85);
    page.drawText(`Ref: ${letter.id} | ${index + 1}/${pages.length}`, { x: 12, y: 12, size: footerSize, font: fonts.Helvetica, color: rgb(0.4, 0.45, 0.5) });
  });
  return { bytes: await pdf.save(), plan };
}
export async function renderLetterPdf(letter: DocumentFields & { id: string; approvedBy?: string | null; layout?: unknown }, draft: boolean) {
  return (await buildLetterPdf(letter, draft)).bytes;
}
