export const DOCX_MIME="application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const DOCUMENT_MIMES=["application/pdf","image/jpeg","image/png","image/webp",DOCX_MIME] as const;
export const DOCUMENT_ACCEPT=".pdf,.jpg,.jpeg,.png,.webp,.docx,"+DOCUMENT_MIMES.join(",");
const extensions:Record<string,string>={pdf:"application/pdf",jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp",docx:DOCX_MIME};
export function documentUploadMime(filename:string,fallback="") {
  return extensions[filename.split(".").pop()?.toLowerCase()??""]??fallback;
}
