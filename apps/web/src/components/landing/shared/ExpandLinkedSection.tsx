"use client";

import { useEffect } from "react";

export default function ExpandLinkedSection(){
  useEffect(()=>{
    const open=()=>{
      const section=document.getElementById(window.location.hash.slice(1));
      if(section instanceof HTMLDetailsElement){section.open=true;section.scrollIntoView({block:"start"});}
    };
    const frame=requestAnimationFrame(open);
    window.addEventListener("hashchange",open);
    return()=>{cancelAnimationFrame(frame);window.removeEventListener("hashchange",open);};
  },[]);
  return null;
}
