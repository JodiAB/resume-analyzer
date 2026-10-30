import {Document,Packer,Paragraph,TextRun,HeadingLevel} from 'docx';
import {PDFDocument,rgb,type PDFFont} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {unzipSync,zipSync,strFromU8,strToU8} from 'fflate';
import {sha256} from '../profile/extract';
import type {ProfileRevision} from '../profile/schema';
import type {Job} from '../jobs/model';
import {documentLines,validateDraft,type Draft} from './model';
export interface RenderedDocuments {pdf:Uint8Array;docx:Uint8Array;plainText:string;pdfHash:string;docxHash:string;pages:number}
export async function renderDocuments(input:Draft,profile:ProfileRevision,job:Job,kind:'cv'|'cover',fontBytes:Uint8Array|Uint8Array[],generatedAt=profile.createdAt):Promise<RenderedDocuments>{
 const draft=validateDraft(input,profile,true);const lines=documentLines(draft,profile,job,kind);if(lines.length>1500||lines.reduce((n,l)=>n+l.text.length,0)>150000)throw new Error('Document content limit');
 const date=new Date(generatedAt);if(!Number.isFinite(date.getTime()))throw new Error('Invalid generation timestamp');const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);pdf.setTitle(kind==='cv'?'Curriculum Vitae':'Cover Letter');pdf.setAuthor(draft.contact.name);pdf.setCreator('JobPilot AI deterministic renderer');pdf.setCreationDate(date);pdf.setModificationDate(date);
 const fonts:PDFFont[]=[];for(const bytes of Array.isArray(fontBytes)?fontBytes:[fontBytes])fonts.push(await pdf.embedFont(new Uint8Array(bytes),{subset:true}));if(!fonts.length)throw new Error('Font required');const sets=fonts.map(f=>new Set(f.getCharacterSet()));
 const fontFor=(character:string)=>{const n=sets.findIndex(s=>s.has(character.codePointAt(0)!));if(n<0)throw new Error(`Unsupported font glyph U+${character.codePointAt(0)!.toString(16)}; export stopped without replacing text`);return fonts[n];};
 const width=(s:string,size:number)=>[...s].reduce((n,c)=>n+fontFor(c).widthOfTextAtSize(c,size),0);
 const margin=54,pageWidth=595.28,pageHeight=841.89,usable=pageWidth-2*margin;let page=pdf.addPage([pageWidth,pageHeight]),y=pageHeight-margin;
 const addPage=()=>{if(pdf.getPageCount()>=40)throw new Error('Document pagination limit');page=pdf.addPage([pageWidth,pageHeight]);y=pageHeight-margin;};
 for(const line of lines){const size=line.style==='title'?20:line.style==='heading'?12:draft.template==='compact'?10:11;const leading=size*1.45;const fragments:string[]=[];let current='';
  for(const word of line.text.split(/\s+/)){const joined=current?current+' '+word:word;if(width(joined,size)<=usable){current=joined;continue;}if(current){fragments.push(current);current='';}for(const c of word){if(width(current+c,size)>usable){fragments.push(current);current='';}current+=c;}}
  if(current)fragments.push(current);if(y-margin<(line.style==='heading'?leading*3:leading))addPage();
  for(const fragment of fragments){if(y-margin<leading)addPage();let x=margin,run='',active:PDFFont|undefined;
   const flush=()=>{if(!run||!active)return;page.drawText(run,{x,y,size,font:active,color:line.style==='heading'&&draft.template==='classic'?rgb(.12,.2,.3):rgb(.08,.08,.08)});x+=active.widthOfTextAtSize(run,size);run='';};
   for(const c of fragment){const f=fontFor(c);if(f!==active){flush();active=f;}run+=c;}flush();y-=leading;
  }y-=line.style==='heading'?6:line.style==='title'?10:5;
 }
 const doc=new Document({creator:'JobPilot AI',title:kind==='cv'?'Curriculum Vitae':'Cover Letter',description:'Candidate review required. Prepared locally; no application submitted.',styles:{default:{document:{run:{font:'Noto Sans',size:draft.template==='compact'?20:22},paragraph:{spacing:{after:100}}}}},sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1080,bottom:1080,left:1080,right:1080}}},children:lines.map(l=>new Paragraph({heading:l.style==='title'?HeadingLevel.TITLE:l.style==='heading'?HeadingLevel.HEADING_1:undefined,keepNext:l.style!=='body',children:[new TextRun({text:l.text,bold:l.style!=='body',size:l.style==='title'?40:l.style==='heading'?24:draft.template==='compact'?20:22,font:'Noto Sans'})]}))}]});
 const archive=unzipSync(new Uint8Array(await Packer.toArrayBuffer(doc)));const core=archive['docProps/core.xml'];if(!core)throw new Error('DOCX metadata missing');archive['docProps/core.xml']=strToU8(strFromU8(core).replace(/(<dcterms:(?:created|modified)\b[^>]*>)[^<]*(<\/dcterms:(?:created|modified)>)/g,`$1${date.toISOString()}$2`));
 const docx=zipSync(archive,{level:6,mtime:date}),pdfBytes=await pdf.save({useObjectStreams:false});const [pdfHash,docxHash]=await Promise.all([sha256(pdfBytes),sha256(docx)]);
 return {pdf:pdfBytes,docx,plainText:lines.map(l=>l.text).join('\n'),pdfHash,docxHash,pages:pdf.getPageCount()};
}
