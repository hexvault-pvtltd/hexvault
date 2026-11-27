import { strFromU8 } from "fflate";

const crcTable=Uint32Array.from({length:256},(_,index)=>{let value=index;for(let bit=0;bit<8;bit++)value=(value>>>1)^((value&1)?0xedb88320:0);return value>>>0;});
export function crc32(bytes:Uint8Array) {
  let crc=0xffffffff;
  for(const byte of bytes)crc=(crc>>>8)^crcTable[(crc^byte)&255];
  return (crc^0xffffffff)>>>0;
}
export function archiveChecksums(bytes:Uint8Array,maxEntries=500) {
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  let end=-1;
  for(let offset=bytes.length-22;offset>=Math.max(0,bytes.length-65557);offset--) {
    if(view.getUint32(offset,true)===0x06054b50&&offset+22+view.getUint16(offset+20,true)===bytes.length){end=offset;break;}
  }
  if(end<0||view.getUint16(end+4,true)||view.getUint16(end+6,true))throw new Error("Use a standard, single-part ZIP archive.");
  const count=view.getUint16(end+10,true);
  let offset=view.getUint32(end+16,true);
  if(count>maxEntries||offset+view.getUint32(end+12,true)!==end)throw new Error("The ZIP directory is invalid or too large.");
  const checksums=new Map<string,{crc:number;size:number}>();
  for(let index=0;index<count;index++) {
    if(offset+46>end||view.getUint32(offset,true)!==0x02014b50)throw new Error("The ZIP directory is incomplete.");
    const flags=view.getUint16(offset+8,true);
    if(flags&1)throw new Error("Use a ZIP without a password to open it inside HEXVAULT.");
    const nameLength=view.getUint16(offset+28,true);
    const next=offset+46+nameLength+view.getUint16(offset+30,true)+view.getUint16(offset+32,true);
    if(next>end)throw new Error("The ZIP directory is incomplete.");
    const name=strFromU8(bytes.subarray(offset+46,offset+46+nameLength),!(flags&2048));
    if(checksums.has(name))throw new Error("The ZIP contains duplicate file paths.");
    checksums.set(name,{crc:view.getUint32(offset+16,true),size:view.getUint32(offset+24,true)});
    offset=next;
  }
  if(offset!==end)throw new Error("The ZIP directory is invalid.");
  return checksums;
}

