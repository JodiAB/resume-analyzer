// @vitest-environment node
import {expect,it} from 'vitest';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {profileFixture,jobFixture,asOf} from './fixtures/matching';
import {assessMatch,defaultMatchConfig} from '../app/features/matching/engine';
import {createDraft,documentLines} from '../app/features/preparation/model';
import {renderDocuments} from '../app/features/preparation/render';
const require=createRequire(import.meta.url);const {DOMMatrix,ImageData,Path2D}=require('@napi-rs/canvas');Object.assign(globalThis,{DOMMatrix,ImageData,Path2D});
const font=()=>readFile('node_modules/@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff');
async function setup(){const p=profileFixture(),j=jobFixture(),d=createDraft(p,j,assessMatch(p,j,defaultMatchConfig(),asOf));d.contact={name:'José Synthetic',email:'safe@example.com',phone:'',location:'South Africa',website:'',confirmed:true};return {p,j,d};}
it('creates genuine editable DOCX and selectable PDF with intended text/dates in reading order',async()=>{
 const {p,j,d}=await setup();const out=await renderDocuments(d,p,j,'cv',await font());expect(out.pdf.slice(0,5)).toEqual(new TextEncoder().encode('%PDF-'));expect([...out.docx.slice(0,2)]).toEqual([80,75]);
 const {unzipSync}=await import('fflate');const zip=unzipSync(out.docx);const xml=new TextDecoder().decode(zip['word/document.xml']);expect(xml).toContain('José Synthetic');expect(xml).toContain('2020-01-01');expect(xml).not.toMatch(/w:vanish|w:drawing|w:tbl/);
 const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');const pdf=await pdfjs.getDocument({data:new Uint8Array(out.pdf),useSystemFonts:true}).promise;let text='';for(let n=1;n<=pdf.numPages;n++){text+=(await (await pdf.getPage(n)).getTextContent()).items.map((i:any)=>i.str||'').join(' ');}
 expect(text).toContain('José Synthetic');for(const line of documentLines(d,p,j,'cv'))expect(text.replace(/\s/g,'')).toContain(line.text.replace(/\s/g,''));await pdf.destroy();expect(out.pdfHash).toMatch(/^[a-f0-9]{64}$/);expect(out.docxHash).toMatch(/^[a-f0-9]{64}$/);
},20000);
it('blocks unsupported font glyphs rather than dropping personal information or replacing characters',async()=>{
 const {p,j,d}=await setup();d.contact.name='Synthetic 漢字';await expect(renderDocuments(d,p,j,'cv',await font())).rejects.toThrow(/glyph/i);
});
it('rejects unsupported/unconfirmed edits and preserves source draft when rendering fails',async()=>{
 const {p,j,d}=await setup();d.edits=[{claimId:'claim-0',text:'Expert in Rust',confirmed:false,reason:''}];const before=JSON.stringify(d);await expect(renderDocuments(d,p,j,'cv',await font())).rejects.toThrow();expect(JSON.stringify(d)).toBe(before);
});
it('renders identical bytes for the same immutable revision rather than silently changing download hashes',async()=>{
 const {p,j,d}=await setup();const a=await renderDocuments(d,p,j,'cv',await font());await new Promise(r=>setTimeout(r,1100));const b=await renderDocuments(d,p,j,'cv',await font());expect(a.pdfHash).toBe(b.pdfHash);expect(a.docxHash).toBe(b.docxHash);
});


it('paginates long CV content without dropping the final source evidence',async()=>{
 const {p,j,d}=await setup();const base=p.claims.find(c=>c.kind==='project')!;for(let i=0;i<12;i++){const label=`Project ${i}: `+'Documented React TypeScript interface work. '.repeat(24)+'2023-01-01 to 2025-12-31';const page=p.source.pages.length+1;p.source.pages.push({page,text:label});p.claims.push({...structuredClone(base),id:`long-${i}`,values:{...base.values,label},evidence:{page,start:0,end:label.length,quote:label}});d.parts.push({claimId:`long-${i}`,excerpt:label});}
 const result=await renderDocuments(d,p,j,'cv',await font());expect(result.pages).toBeGreaterThan(1);expect(result.pages).toBeLessThan(40);expect(result.plainText).toContain('Project 11:');
 const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');const pdf=await pdfjs.getDocument({data:new Uint8Array(result.pdf)}).promise;const last=await (await pdf.getPage(pdf.numPages)).getTextContent();expect(last.items.map((i:any)=>i.str||'').join(' ')).toContain('2025-12-31');await pdf.destroy();
},20000);
