import assert from "node:assert/strict";
import { test } from "node:test";
import { strToU8,zipSync } from "fflate";
import { readDocxDocument } from "../packages/core/src/features/documents/docx";
import { DOCX_MIME,DOCUMENT_MIMES,documentUploadMime } from "../packages/core/src/features/documents/formats";
import { createDocumentArchive,readDocumentArchive } from "../packages/core/src/features/documents/archive";
import { ALLOWED_DOCUMENT_TYPES,hasAllowedSignature } from "../packages/core/src/lib/storage";

function wordFile(overrides:Record<string,Uint8Array>={}){
  return zipSync({
    "[Content_Types].xml":strToU8('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'),
    "_rels/.rels":strToU8('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'),
    "word/document.xml":strToU8('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Example NDA document</w:t></w:r></w:p></w:body></w:document>'),
    ...overrides,
  });
}

test("Word DOCX uploads are allowed even when the browser reports an empty or generic MIME type",async()=>{
  const bytes=wordFile();
  assert(ALLOWED_DOCUMENT_TYPES.includes(DOCX_MIME));
  assert(DOCUMENT_MIMES.includes(DOCX_MIME));
  assert.equal(documentUploadMime("Gowri NDA (1).DOCX",""),DOCX_MIME);
  assert.equal(documentUploadMime("Gowri NDA.docx","application/octet-stream"),DOCX_MIME);
  assert(hasAllowedSignature(bytes,DOCX_MIME));
  assert((await readDocxDocument(bytes)).includes("Example NDA document"));
});

test("Word files keep their original bytes when packed into and extracted from an employee ZIP",async()=>{
  const bytes=wordFile();
  const archive=await createDocumentArchive([{filename:"NDA.docx",bytes,category:"NDA",visibility:"HR"}]);
  const [document]=await readDocumentArchive(archive);
  assert.equal(document.mimeType,DOCX_MIME);
  assert.equal(document.filename,"NDA.docx");
  assert.equal(document.metadata?.visibility,"HR");
  assert.deepEqual(document.bytes,bytes);
});

test("DOCX validation rejects renamed ZIPs, macro packages, oversized XML, and unsafe XML declarations",async()=>{
  await assert.rejects(readDocxDocument(zipSync({"fake.txt":strToU8("not Word")})),/valid DOCX/);
  await assert.rejects(readDocxDocument(wordFile({"word/vbaProject.bin":strToU8("macro")})),/without macros/);
  await assert.rejects(readDocxDocument(wordFile({"word/document.xml":new Uint8Array(5*1024*1024+1)})),/valid DOCX/);
  await assert.rejects(readDocxDocument(wordFile({"word/document.xml":strToU8('<!DOCTYPE document><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>')})),/XML format/);
  const macroTypes=strToU8('<Types><Override PartName="/word/document.xml" ContentType="application/vnd.ms-word.document.macroEnabled.main+xml"/></Types>');
  await assert.rejects(readDocxDocument(wordFile({"[Content_Types].xml":macroTypes})),/valid DOCX/);
});
