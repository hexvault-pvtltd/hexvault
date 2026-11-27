"use client";

import { useEffect, useState } from "react";
import { readDocxDocument } from "@core/features/documents/docx";

export function DocxPreview({url}:{url:string}) {
  const [text,setText]=useState<string|null>(null);
  const [error,setError]=useState("");
  useEffect(()=>{
    const controller=new AbortController();
    async function load(){
      try{
        const response=await fetch(url,{signal:controller.signal});
        if(!response.ok)throw new Error("Unable to load the Word document.");
        const xml=await readDocxDocument(new Uint8Array(await response.arrayBuffer()));
        if(controller.signal.aborted)return;
        const document=new DOMParser().parseFromString(xml,"application/xml");
        if(document.getElementsByTagName("parsererror").length)throw new Error("The Word document text could not be read. Download the original to open it in Word.");
        const paragraphs=Array.from(document.getElementsByTagNameNS("*","p")).map(paragraph=>Array.from(paragraph.getElementsByTagNameNS("*","t")).map(run=>run.textContent??"").join(""));
        setText(paragraphs.join("\n\n").trim()||"This document contains no text to preview. Download the original to see its images and layout.");
      }catch(error){if(!controller.signal.aborted)setError(error instanceof Error?error.message:"Word preview unavailable.");}
    }
    load();return()=>controller.abort();
  },[url]);
  return <div className="w-full rounded-lg bg-white p-5 text-neutral-900"><p className="mb-4 text-xs text-slate-500">Word text preview. Download the original to view its full formatting, images, and signatures.</p>{error?<p role="alert" className="text-sm text-rose-600">{error}</p>:text===null?<p role="status" className="text-sm text-slate-500">Opening Word document...</p>:<pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7">{text}</pre>}</div>;
}
