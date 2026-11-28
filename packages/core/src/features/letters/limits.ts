// Shared by validation and JSON samples. Limits in imported JSON are descriptive;
// only these application constants control what the editor accepts.
export const LETTER_LIMITS = {
  text: { title: 120, companyName: 120, recipientName: 120, recipientEmail: 254, body: 16000, emailSubject: 180, emailBody: 8000, whatsappText: 8000, templateName: 100, templateBody: 12000, templateEmailBody: 6000 },
  minimumText: { title: 1, companyName: 1, recipientName: 1, body: 1, emailSubject: 1, emailBody: 10, whatsappTextWhenProvided: 1, templateName: 1 },
  formats: { documentDate: "YYYY-MM-DD", recipientEmail: "Valid email or empty string", recipientPhone: "Optional + followed by 7 to 15 digits, beginning with a nonzero digit", pageIndex: "0 to 99", documentJsonVersion: 1, layoutVersion: 1, templateFieldCharacters: 2000, backgroundNameCharacters: 160 },
  pages: { explicit: 30, generated: 100, units: "points", pointsPerInch: 72, minDimension: 72, maxDimension: 3000 },
  margins: { top: { min: 12, max: 250 }, bottom: { min: 24, max: 250 }, printableArea: { max: 1000, minTop: 12, minBottom: 24, minContentWidth: 24, minContentHeight: 30 } },
  blocks: { count: 80, idLength: 80, minPosition: 0, maxPosition: 3000, minWidth: 12, maxWidth: 3000, minHeight: 8, maxHeight: 1500, minFontSize: 6, maxFontSize: 120, minLineHeight: 1, maxLineHeight: 2.5, maxGap: 300, maxText: 16000 },
  uploads: { templateBytes: 3000000, signatureBytes: 2000000, backgroundDataUrlCharacters: 4200000, signatureDataUrlCharacters: 2800000, layoutJsonCharacters: 7500000, requestJsonCharacters: 8500000 },
  fonts: ["Helvetica", "Times", "Courier"], alignments: ["left", "center", "right", "justify"],
  resizing: { textSizing: ["FLOW", "FIT"], artworkFit: ["CONTAIN", "STRETCH"], coordinateUnits: ["pt", "mm"], backgroundFrameMaxHeight: 3000, minimumFittedFontSize: 6 },
  templateFormats: ["PDF", "PNG", "JPEG"], signatureFormats: ["PNG", "JPEG"],
  notes: ["PDF text currently supports Latin characters.", "Phone numbers need their international country code.", "afterId must refer to an earlier block; following blocks move when text grows.", "Text and signatures must fit inside the printable area when enabled.", "All changes require owner approval again before the owner or HR can share.", "FLOW text uses automatic height; FIT text shrinks within the saved width and height without clipping.", "Background frame uses top-left page coordinates in points and applies to each page.", "The limits object is documentation and cannot increase application limits."],
} as const;
