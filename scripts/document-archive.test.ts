import assert from "node:assert/strict";
import { test } from "node:test";
import { zipSync, strToU8 } from "fflate";
import { createDocumentArchive, readDocumentArchive, archiveVisibility } from "../packages/core/src/features/documents/archive";

const pdf=strToU8("%PDF-original-document\n".repeat(100));
test("ZIP round-trip preserves original bytes, duplicate filenames, categories, visibility, and expiry",async()=>{
  const original=[{filename:"certificate.pdf",bytes:pdf,category:"Certificate",visibility:"OWNER" as const,expiresAt:"2027-01-01T00:00:00.000Z"},{filename:"certificate.pdf",bytes:strToU8("%PDF-another"),category:"NDA",visibility:"SELF" as const,expiresAt:null}];
  const packed=await createDocumentArchive(original);
  const unpacked=await readDocumentArchive(packed);
  assert.equal(unpacked.length,2);
  for(const [index,file] of unpacked.entries()){
    assert.equal(file.filename,original[index].filename);
    assert.deepEqual(file.bytes,original[index].bytes);
    assert.equal(file.metadata?.category,original[index].category);
    assert.equal(file.metadata?.visibility,original[index].visibility);
    assert.equal(file.metadata?.expiresAt,original[index].expiresAt);
  }
  assert.equal(archiveVisibility(["SELF","HR","OWNER"]),"OWNER");
  assert.equal(archiveVisibility(["SELF","HR"]),"HR");
  assert.equal(archiveVisibility(["SELF"]),"SELF");
});

test("standard ZIP files open without a HEXVAULT manifest",async()=>{
  const documents=await readDocumentArchive(zipSync({"folder/letter.pdf":pdf}));
  assert.equal(documents[0].filename,"letter.pdf");
  assert.equal(documents[0].mimeType,"application/pdf");
  assert.equal(documents[0].metadata,undefined);
});

test("ZIP import rejects traversal, nested archives, invalid types, oversized entries, and modified bytes",async()=>{
  await assert.rejects(readDocumentArchive(zipSync({"../letter.pdf":pdf})),/invalid file path/);
  await assert.rejects(readDocumentArchive(zipSync({"nested.zip":zipSync({"letter.pdf":pdf})})),/PDF, JPEG, PNG, or WebP/);
  await assert.rejects(readDocumentArchive(zipSync({"fake.pdf":strToU8("not a PDF")})),/valid PDF/);
  await assert.rejects(readDocumentArchive(zipSync({"large.pdf":new Uint8Array(10*1024*1024+1)})),/no larger than 10 MB/);
  const tampered=zipSync({"letter.pdf":[pdf,{level:0}]});
  // Change a stored document byte without updating the ZIP CRC32.
  const position=30+new DataView(tampered.buffer).getUint16(26,true);
  tampered[position+10]^=1;
  await assert.rejects(readDocumentArchive(tampered),/checksum/);
  await assert.rejects(readDocumentArchive(strToU8("not a zip")),/standard, single-part ZIP/);
});

test("archive export rejects empty or oversized collections",async()=>{
  await assert.rejects(createDocumentArchive([]),/1 to 100/);
  await assert.rejects(createDocumentArchive(Array.from({length:101},()=>({filename:"letter.pdf",bytes:pdf,category:"General",visibility:"SELF" as const}))),/1 to 100/);
});
