import { unzip, strFromU8 } from "fflate";
import { archiveChecksums, crc32 } from "./zip-integrity";

// DOCX is an Open XML package, not an arbitrary renamed ZIP. Read only the
// document XML and package metadata, leaving embedded images compressed.
export async function readDocxDocument(bytes:Uint8Array) {
  if(!bytes.length||bytes.length>10*1024*1024)throw new Error("Word documents must be no larger than 10 MB.");
  const directory=archiveChecksums(bytes,2000);
  let expanded=0;
  for(const [path,entry] of directory) {
    if(path.includes("\\")||path.startsWith("/")||path.split("/").some(part=>part==="..")||/[\u0000-\u001f\u007f:]/.test(path))throw new Error("The Word document contains an invalid package path.");
    if(/vbaProject\.bin$/i.test(path))throw new Error("Use a DOCX document without macros.");
    expanded+=entry.size;
    if(expanded>100*1024*1024)throw new Error("The expanded Word document exceeds 100 MB.");
  }
  const required=["[Content_Types].xml","_rels/.rels","word/document.xml"];
  for(const path of required){const entry=directory.get(path);if(!entry||entry.size<1||entry.size>(path==="word/document.xml"?5*1024*1024:256*1024))throw new Error("Choose a valid DOCX Word document.");}
  const files=await new Promise<Record<string,Uint8Array>>((resolve,reject)=>{
    try{unzip(bytes,{filter:entry=>required.includes(entry.name)},(error,result)=>error?reject(new Error("Unable to read this DOCX file. Save it again as a Word document.")):resolve(result));}catch(error){reject(error);}
  });
  for(const path of required){const data=files[path],entry=directory.get(path)!;if(!data||data.length!==entry.size||crc32(data)!==entry.crc)throw new Error("The Word document is incomplete or damaged.");}
  const types=strFromU8(files["[Content_Types].xml"]),relationships=strFromU8(files["_rels/.rels"]),xml=strFromU8(files["word/document.xml"]);
  if([types,relationships,xml].some(value=>/<!DOCTYPE|<!ENTITY/i.test(value)))throw new Error("This Word XML format is not supported.");
  const main=[...types.matchAll(/<(?:[\w.-]+:)?Override\b[^>]*>/g)].some(([tag])=>/\bPartName\s*=\s*["']\/word\/document\.xml["']/.test(tag)&&/\bContentType\s*=\s*["']application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document\.main\+xml["']/.test(tag));
  if(!main||/macroenabled|vbaProject/i.test(types)||!relationships.includes("/officeDocument")||!/<(?:[\w.-]+:)?document(?:\s|>)/.test(xml)||!/(?:schemas\.openxmlformats\.org\/wordprocessingml\/2006\/main|purl\.oclc\.org\/ooxml\/wordprocessingml\/main)/.test(xml))throw new Error("Choose a valid DOCX Word document.");
  return xml;
}
