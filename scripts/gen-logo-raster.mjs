import fs from "fs";
import zlib from "zlib";

const buf = fs.readFileSync("public/warbul-logo.png");
// --- PNG decode (8-bit, non-interlaced) ---
if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not png");
let off = 8, width=0, height=0, bitDepth=0, colorType=0;
const idat = [];
while (off < buf.length) {
  const len = buf.readUInt32BE(off); const type = buf.toString("ascii", off+4, off+8);
  const data = buf.subarray(off+8, off+8+len);
  if (type === "IHDR") { width=data.readUInt32BE(0); height=data.readUInt32BE(4); bitDepth=data[8]; colorType=data[9]; }
  else if (type === "IDAT") idat.push(data);
  else if (type === "IEND") break;
  off += 12 + len;
}
if (bitDepth !== 8) throw new Error("bitDepth "+bitDepth);
const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : (()=>{throw new Error("colorType "+colorType)})();
const raw = zlib.inflateSync(Buffer.concat(idat));
const stride = width*channels;
const rgba = Buffer.alloc(width*height*4);
const prev = Buffer.alloc(stride);
let cur = Buffer.alloc(stride);
let p = 0;
const paeth=(a,b,c)=>{const pp=a+b-c,pa=Math.abs(pp-a),pb=Math.abs(pp-b),pc=Math.abs(pp-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
for (let y=0;y<height;y++){
  const f = raw[p++];
  for (let i=0;i<stride;i++){
    const x = raw[p++];
    const a = i>=channels ? cur[i-channels] : 0;
    const b = prev[i];
    const c = i>=channels ? prev[i-channels] : 0;
    let v;
    switch(f){case 0:v=x;break;case 1:v=x+a;break;case 2:v=x+b;break;case 3:v=x+((a+b)>>1);break;case 4:v=x+paeth(a,b,c);break;default:throw new Error("filter "+f);}
    cur[i]=v&0xff;
  }
  for (let x=0;x<width;x++){
    const si=x*channels, di=(y*width+x)*4;
    if (channels===4){rgba[di]=cur[si];rgba[di+1]=cur[si+1];rgba[di+2]=cur[si+2];rgba[di+3]=cur[si+3];}
    else if (channels===3){rgba[di]=cur[si];rgba[di+1]=cur[si+1];rgba[di+2]=cur[si+2];rgba[di+3]=255;}
    else {rgba[di]=rgba[di+1]=rgba[di+2]=cur[si];rgba[di+3]=255;}
  }
  prev.set(cur); 
}

// --- crop transparent/near-white margins to maximize logo size ---
// treat pixel as content if alpha>20
let minX=width,minY=height,maxX=0,maxY=0;
for(let y=0;y<height;y++)for(let x=0;x<width;x++){const a=rgba[(y*width+x)*4+3];if(a>20){if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}}
if(maxX<minX){minX=0;minY=0;maxX=width-1;maxY=height-1;}
const cw=maxX-minX+1, ch=maxY-minY+1;

// --- scale (area average over white) to target width ---
const TW = 240;                       // printed dots wide (must be mult of 8)
const TH = Math.round(TW*ch/cw/8)*8;  // keep aspect, round height to 8
const gray = new Float32Array(TW*TH);
for(let ty=0;ty<TH;ty++)for(let tx=0;tx<TW;tx++){
  const sx0=minX+Math.floor(tx*cw/TW), sx1=minX+Math.max(Math.floor((tx+1)*cw/TW),Math.floor(tx*cw/TW)+1);
  const sy0=minY+Math.floor(ty*ch/TH), sy1=minY+Math.max(Math.floor((ty+1)*ch/TH),Math.floor(ty*ch/TH)+1);
  let sum=0,n=0;
  for(let sy=sy0;sy<sy1;sy++)for(let sx=sx0;sx<sx1;sx++){
    const i=(sy*width+sx)*4, a=rgba[i+3]/255;
    // composite over white
    const r=rgba[i]*a+255*(1-a), g=rgba[i+1]*a+255*(1-a), b=rgba[i+2]*a+255*(1-a);
    const lum=0.299*r+0.587*g+0.114*b;
    sum+=lum;n++;
  }
  gray[ty*TW+tx]=n?sum/n:255;
}

// --- Floyd–Steinberg dithering -> 1 = black dot ---
const bits=new Uint8Array(TW*TH);
for(let y=0;y<TH;y++)for(let x=0;x<TW;x++){
  const idx=y*TW+x; const old=gray[idx]; const nv=old<128?0:255; bits[idx]=old<128?1:0;
  const err=old-nv;
  const add=(xx,yy,f)=>{if(xx>=0&&xx<TW&&yy>=0&&yy<TH)gray[yy*TW+xx]+=err*f/16;};
  add(x+1,y,7);add(x-1,y+1,3);add(x,y+1,5);add(x+1,y+1,1);
}

// --- pack to ESC/POS GS v 0 raster (MSB first) ---
const bytesPerRow=TW/8;
const packed=Buffer.alloc(bytesPerRow*TH);
for(let y=0;y<TH;y++)for(let x=0;x<TW;x++){if(bits[y*TW+x])packed[y*bytesPerRow+(x>>3)]|=(0x80>>(x&7));}
const b64=packed.toString("base64");
console.log("TW",TW,"TH",TH,"bytesPerRow",bytesPerRow,"packedLen",packed.length,"b64Len",b64.length);

const out=`// AUTO-GENERATED from public/warbul-logo.png — do not edit by hand.
// Run scripts/gen-logo-raster.mjs to regenerate.
// 1-bpp monochrome (Floyd–Steinberg dithered) logo for ESC/POS GS v 0 raster printing.
// Bits are packed MSB-first, left-to-right, top-to-bottom; 1 = black dot.

export const LOGO_WIDTH = ${TW};
export const LOGO_HEIGHT = ${TH};
export const LOGO_BYTES_PER_ROW = ${bytesPerRow};

const LOGO_BASE64 =
  "${b64}";

/** Packed 1-bpp logo bitmap (${packed.length} bytes). */
export const LOGO_BITMAP: Uint8Array = Uint8Array.from(
  typeof atob === "function"
    ? atob(LOGO_BASE64).split("").map((c) => c.charCodeAt(0))
    : Buffer.from(LOGO_BASE64, "base64"),
);
`;
fs.writeFileSync("src/lib/logoRaster.ts", out);
console.log("wrote src/lib/logoRaster.ts");

// also write a preview PGM for sanity
let pgm=`P5\n${TW} ${TH}\n255\n`;
const pbuf=Buffer.alloc(TW*TH);
for(let i=0;i<TW*TH;i++)pbuf[i]=bits[i]?0:255;
fs.writeFileSync("/tmp/logo_preview.pgm",Buffer.concat([Buffer.from(pgm,"ascii"),pbuf]));
