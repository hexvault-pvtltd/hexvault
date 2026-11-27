import { archiveChecksums, crc32 } from "./zip-integrity";
import { readDocxDocument } from "./docx";
import { DOCX_MIME } from "./formats";
import { unzip, zip, strFromU8, strToU8 } from "fflate";
import { z } from "zod";

export const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;
export const MAX_ARCHIVE_FILES = 100;
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const manifestName = "hexvault-documents.json";
const metadataSchema = z.object({ path: z.string(), filename: z.string().min(1).max(180), category: z.string().min(2).max(80), visibility: z.enum(["SELF", "HR", "OWNER"]), expiresAt: z.string().refine(value=>Number.isFinite(Date.parse(value)),"Invalid expiry date").nullable().optional() });
export type ArchiveMetadata = z.infer<typeof metadataSchema>;
export type ArchiveDocument = { path: string; filename: string; bytes: Uint8Array; mimeType: string; metadata?: ArchiveMetadata };

export function archiveVisibility(visibility:string[]) {
  return visibility.includes("OWNER")?"OWNER":visibility.includes("HR")?"HR":"SELF";
}
export function documentMimeType(filename: string, bytes: Uint8Array) {
  const extension = filename.split(".").pop()?.toLowerCase();
  if(extension==="docx"&&bytes[0]===0x50&&bytes[1]===0x4b&&bytes[2]===3&&bytes[3]===4)return DOCX_MIME;
  if (extension === "pdf" && strFromU8(bytes.subarray(0, 5)) === "%PDF-") return "application/pdf";
  if (extension === "png" && [137,80,78,71,13,10,26,10].every((value,index)=>bytes[index]===value)) return "image/png";
  if (["jpg","jpeg"].includes(extension??"") && bytes[0]===255 && bytes[1]===216 && bytes[2]===255) return "image/jpeg";
  if (extension === "webp" && strFromU8(bytes.subarray(0,4)) === "RIFF" && strFromU8(bytes.subarray(8,12)) === "WEBP") return "image/webp";
  throw new Error(`${filename}: ZIP entries must be valid PDF, DOCX, JPEG, PNG, or WebP documents.`);
}

export async function readDocumentArchive(bytes: Uint8Array): Promise<ArchiveDocument[]> {
  if (!bytes.length || bytes.length > MAX_ARCHIVE_BYTES) throw new Error("ZIP files must be no larger than 100 MB.");
  const checksums=archiveChecksums(bytes);
  const seen = new Set<string>();
  let total = 0;
  const files = await new Promise<Record<string,Uint8Array>>((resolve,reject)=> {
    try {
      unzip(bytes,{filter:entry=>{
        const path=entry.name;
        if (path.includes("\\") || path.startsWith("/") || path.split("/").some(part=>part===".."||part===".") || /[\u0000-\u001f\u007f:]/.test(path)) throw new Error("The ZIP contains an invalid file path.");
        if (path.endsWith("/") || path.startsWith("__MACOSX/") || path.split("/").pop()===".DS_Store") return false;
        if (seen.has(path)) throw new Error("The ZIP contains duplicate file paths.");
        seen.add(path);
        if (seen.size>MAX_ARCHIVE_FILES+1) throw new Error("A ZIP can contain up to 100 documents.");
        const limit=path===manifestName?128*1024:MAX_DOCUMENT_BYTES;
        if (entry.originalSize<1 || entry.originalSize>limit) throw new Error(`${path}: each document must be no larger than 10 MB.`);
        total+=entry.originalSize;
        if(total>MAX_ARCHIVE_BYTES) throw new Error("The extracted ZIP exceeds 100 MB.");
        if(![0,8].includes(entry.compression)) throw new Error("This ZIP compression method is not supported.");
        return true;
      }},(error,result)=>error?reject(new Error("Unable to open ZIP. Use an unencrypted ZIP containing PDF, DOCX, or image documents.")):resolve(result));
    } catch(error) { reject(error); }
  });
  for(const [path,data] of Object.entries(files)) {
    const expected=checksums.get(path);
    if(!expected||expected.size!==data.length||expected.crc!==crc32(data))throw new Error(`${path}: the ZIP file failed its checksum check.`);
  }
  const metadata = new Map<string,ArchiveMetadata>();
  if(files[manifestName]) {
    const manifest=z.object({format:z.literal("hexvault-employee-documents"),version:z.literal(1),documents:z.array(metadataSchema).max(MAX_ARCHIVE_FILES)}).parse(JSON.parse(strFromU8(files[manifestName])));
    for(const item of manifest.documents) {
      if(metadata.has(item.path)||!files[item.path]||item.path===manifestName) throw new Error("The ZIP document manifest is invalid.");
      metadata.set(item.path,item);
    }
  }
  const documents=Object.entries(files).filter(([path])=>path!==manifestName).map(([path,data])=>{
    if(!data.length||data.length>MAX_DOCUMENT_BYTES) throw new Error("An extracted document exceeds 10 MB.");
    const filename=path.split("/").pop()!;
    const details=metadata.get(path);
    if(details && (details.filename.includes("/")||details.filename.includes("\\")||/[\u0000-\u001f\u007f]/.test(details.filename))) throw new Error("The ZIP contains an invalid document name.");
    const mimeType=documentMimeType(filename,data);
    if(details&&documentMimeType(details.filename,data)!==mimeType)throw new Error("The ZIP manifest file extension does not match its contents.");
    return {path,filename:details?.filename??filename,bytes:data,mimeType,metadata:details};
  });
  if(!documents.length||documents.length>MAX_ARCHIVE_FILES) throw new Error("Choose a ZIP containing 1 to 100 documents.");
  for(const document of documents)if(document.mimeType===DOCX_MIME)await readDocxDocument(document.bytes);
  return documents;
}

export async function createDocumentArchive(documents: { filename:string; bytes:Uint8Array; category:string; visibility:"SELF"|"HR"|"OWNER"; expiresAt?:string|null }[]) {
  if(!documents.length||documents.length>MAX_ARCHIVE_FILES) throw new Error("Select 1 to 100 documents for the ZIP.");
  const files:Record<string,Uint8Array>={};
  const metadata:ArchiveMetadata[]=[];
  let total=0;
  for(const [index,document] of documents.entries()) {
    if(!document.bytes.length||document.bytes.length>MAX_DOCUMENT_BYTES) throw new Error("Each document must be no larger than 10 MB.");
    total+=document.bytes.length;
    if(total>MAX_ARCHIVE_BYTES) throw new Error("The documents exceed the 100 MB ZIP limit.");
    const filename=document.filename.replace(/[\\/\u0000-\u001f\u007f:]/g,"_").slice(-180);
    if(documentMimeType(filename,document.bytes)===DOCX_MIME)await readDocxDocument(document.bytes);
    const path=`documents/${String(index+1).padStart(3,"0")}-${filename}`;
    files[path]=document.bytes;
    metadata.push(metadataSchema.parse({path,filename,category:document.category,visibility:document.visibility,expiresAt:document.expiresAt}));
  }
  files[manifestName]=strToU8(JSON.stringify({format:"hexvault-employee-documents",version:1,documents:metadata}));
  if(total+files[manifestName].length>MAX_ARCHIVE_BYTES)throw new Error("The documents and archive metadata exceed 100 MB.");
  return new Promise<Uint8Array>((resolve,reject)=>zip(files,{level:6},(error,data)=>error?reject(error):data.length>MAX_ARCHIVE_BYTES?reject(new Error("The ZIP exceeds 100 MB.")):resolve(data)));
}
