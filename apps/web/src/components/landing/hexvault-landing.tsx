"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, GitBranch, Heart, Menu, X } from "lucide-react";

const navMenus = {
  Products: ["Hexvault Studio", "Shared workspaces", "Live collaboration"],
  Pricing: [],
  Resources: ["Documentation", "Community", "Updates"],
  Partners: ["Partner network", "Become a partner"],
  "Why Hexvault": ["Built for teams", "Open source", "Our principles"],
};
const repoUrl = process.env.NEXT_PUBLIC_REPOSITORY_URL;

function ParticleWaves() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", { alpha: true, antialias: false, powerPreference: "low-power" });
    if (!canvas || !gl) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = matchMedia("(max-width: 700px)").matches;
    const vertex = `attribute vec2 a_grid; uniform float u_time; uniform vec2 u_mouse; uniform float u_ratio; varying float v_light;
      void main(){ float x=a_grid.x*2.0-1.0; float d=a_grid.y; float t=u_time;
      float wave=sin(x*5.0+d*7.0+t*.46)*.11 + sin(x*10.0-d*9.0-t*.29)*.045 + cos(x*2.4+d*13.0+t*.22)*.07;
      float ridge=sin(x*3.4+d*8.0+t*.12); float z=wave + ridge*.07;
      float y=.28-d*1.16+z + u_mouse.y*.025*(1.0-d); float px=x + u_mouse.x*.025*(1.0-d);
      float depth=.38 + d*.83; gl_Position=vec4(px*depth,y,0.0,1.0);
      gl_PointSize=(1.0+d*2.1)*u_ratio*(.72+max(0.0,z)*2.4);
      v_light=clamp(.22+d*.48 + max(0.0,z)*2.5 + max(0.0,ridge)*.14, .12, 1.0); }`;
    const fragment = `precision mediump float; varying float v_light; void main(){ vec2 p=gl_PointCoord-.5; float r=length(p); if(r>.5) discard; float core=smoothstep(.5,.05,r); float halo=exp(-r*10.0)*.28; gl_FragColor=vec4(1.0,.27+.2*v_light,.045, (core*.72+halo)*v_light); }`;
    const compile = (type: number, source: string) => { const shader = gl.createShader(type)!; gl.shaderSource(shader, source); gl.compileShader(shader); return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null; };
    const vs = compile(gl.VERTEX_SHADER, vertex), fs = compile(gl.FRAGMENT_SHADER, fragment);
    if (!vs || !fs) return;
    const program = gl.createProgram()!; gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    const cols = mobile ? 108 : 176, rows = mobile ? 42 : 78;
    const points = new Float32Array(cols * rows * 2); let n = 0;
    for (let y=0; y<rows; y++) for (let x=0; x<cols; x++) { points[n++]=x/(cols-1); points[n++]=y/(rows-1); }
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);
    gl.useProgram(program); const loc=gl.getAttribLocation(program,"a_grid"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    const timeLoc=gl.getUniformLocation(program,"u_time"), mouseLoc=gl.getUniformLocation(program,"u_mouse"), ratioLoc=gl.getUniformLocation(program,"u_ratio");
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE); gl.clearColor(0,0,0,0);
    let frame=0, start=performance.now(), mx=0,my=0, tx=0,ty=0;
    const resize=()=>{ const dpr=Math.min(devicePixelRatio||1,mobile?1.25:1.7); canvas.width=Math.floor(canvas.clientWidth*dpr); canvas.height=Math.floor(canvas.clientHeight*dpr); gl.viewport(0,0,canvas.width,canvas.height); gl.uniform1f(ratioLoc,dpr); };
    const pointer=(e:PointerEvent)=>{ tx=(e.clientX/innerWidth-.5)*2; ty=(.5-e.clientY/innerHeight)*2; };
    const draw=(now:number)=>{ mx+=(tx-mx)*.025; my+=(ty-my)*.025; gl.clear(gl.COLOR_BUFFER_BIT); gl.uniform1f(timeLoc,reduced?0:(now-start)/1000); gl.uniform2f(mouseLoc,mx,my); gl.drawArrays(gl.POINTS,0,cols*rows); if(!reduced) frame=requestAnimationFrame(draw); };
    resize(); const observer=new ResizeObserver(resize); observer.observe(canvas); window.addEventListener("pointermove",pointer,{passive:true}); frame=requestAnimationFrame(draw);
    return ()=>{ cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("pointermove",pointer); gl.deleteBuffer(buffer); gl.deleteProgram(program); gl.deleteShader(vs); gl.deleteShader(fs); };
  }, []);
  return <div className="wave-scene" aria-hidden="true"><canvas ref={canvasRef}/><div className="wave-haze"/></div>;
}

export default function HexvaultLanding() {
  const [open, setOpen] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { const close=(e:KeyboardEvent)=>{if(e.key==="Escape"){setOpen(null);setMobileOpen(false);}}; window.addEventListener("keydown",close); return ()=>window.removeEventListener("keydown",close); },[]);
  return <main className="hv-shell">
    <ParticleWaves />
    <div className="hv-word" aria-hidden="true">HEXVAULT</div>
    <header className="hv-header"><nav className="hv-nav" aria-label="Main navigation">
      <Link href="/" className="hv-brand" aria-label="Hexvault home"><span className="hv-mark">H</span><span>HEXVAULT</span></Link>
      <div className="hv-links">{Object.entries(navMenus).map(([name,items])=><div className="hv-nav-item" key={name}>
        {name==="Pricing" ? <a href="#pricing">Pricing</a> : <button aria-expanded={open===name} onClick={()=>setOpen(open===name?null:name)}>{name}<ChevronDown size={13} className={open===name?"turned":""}/></button>}
        {open===name&&<div className="hv-dropdown">{items.map(item=><a href="#learn-more" key={item} onClick={()=>setOpen(null)}>{item}<ChevronRight size={13}/></a>)}</div>}
      </div>)}</div>
      <Link className="hv-nav-cta" href="/login">Sign up for free <ChevronRight size={15}/></Link>
      <button className="hv-menu-toggle" aria-label={mobileOpen?"Close menu":"Open menu"} aria-expanded={mobileOpen} onClick={()=>setMobileOpen(!mobileOpen)}>{mobileOpen?<X/>:<Menu/>}</button>
    </nav>{mobileOpen&&<div className="hv-mobile-menu">{["Products","Pricing","Resources","Partners","Why Hexvault"].map((label)=><a href={label==="Pricing"?"#pricing":"#learn-more"} key={label} onClick={()=>setMobileOpen(false)}>{label}<ChevronRight size={15}/></a>)}<Link href="/login" onClick={()=>setMobileOpen(false)}>Sign up for free <ChevronRight size={15}/></Link></div>}</header>
    <section className="hv-hero" aria-labelledby="hv-title">
      <div className="hv-copy"><p className="hv-kicker"><span/> BUILD TOGETHER, IN REAL TIME</p><h1 id="hv-title">Multiplayer mode for<br/><span>AI development</span></h1><p className="hv-subtitle">Collaborate, build, and scale AI-powered solutions together in real-time.</p>
        <div className="hv-actions"><Link className="hv-button hv-primary" href="/login">Get the app <ChevronDown size={15}/></Link>{repoUrl?<a className="hv-button hv-secondary" href={repoUrl} target="_blank" rel="noreferrer"><GitBranch size={16}/> Open the Repo</a>:<span className="hv-button hv-secondary hv-unconfigured" aria-label="Repository link not configured"><GitBranch size={16}/> Open the Repo</span>}</div>
      </div>
    </section>
    <footer className="hv-footer"><div className="hv-built">Built by <Link href="/" className="hv-footer-brand"><span className="hv-mark">H</span> HEXVAULT</Link></div><nav aria-label="Footer"><a href="#support">Support</a><a href="#terms">Terms of Service</a><a href="#privacy">Privacy Policy</a><a href="#community">Community Guidelines</a></nav><p>Hexvault is an open source project <Heart size={13} fill="currentColor"/></p></footer>
  </main>;
}
