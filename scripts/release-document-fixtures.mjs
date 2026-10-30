// Existing production renderer; synthetic declared evidence for native QA.
import {createServer} from 'vite';
import {readFile,writeFile} from 'node:fs/promises';
const server=await createServer({configFile:false,server:{middlewareMode:true},appType:'custom'});
try{
 const {profileFixture,jobFixture,asOf}=await server.ssrLoadModule('/tests/fixtures/matching.ts');
 const {createDraft}=await server.ssrLoadModule('/app/features/preparation/model.ts');
 const {assessMatch,defaultMatchConfig}=await server.ssrLoadModule('/app/features/matching/engine.ts');
 const {renderDocuments}=await server.ssrLoadModule('/app/features/preparation/render.ts');
 const p=profileFixture(),j=jobFixture(),d=createDraft(p,j,assessMatch(p,j,defaultMatchConfig(),asOf)),font=await readFile('node_modules/@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff');
 d.contact={name:'Synthetic Candidate',email:'synthetic@example.test',phone:'+27 00 000 0000',location:'South Africa',website:'https://portfolio.example.test',confirmed:true};d.cover=true;
 const evidence=[];async function save(label,kind){const r=await renderDocuments(d,p,j,kind,font);for(const format of ['pdf','docx'])await writeFile(`../../outputs/${label}.${format}`,r[format]);evidence.push({label,pages:r.pages,pdfHash:r.pdfHash,docxHash:r.docxHash,plainText:r.plainText});}
 await save('milestone-6-short-cv','cv');await save('milestone-6-native-cover','cover');
 const base=p.claims.find(c=>c.kind==='project');for(let i=0;i<12;i++){const label=`Synthetic project ${i}: `+'Documented React TypeScript interface work. '.repeat(24)+'2023-01-01 to 2025-12-31';const page=p.source.pages.length+1;p.source.pages.push({page,text:label});p.claims.push({...structuredClone(base),id:`long-${i}`,values:{...base.values,label},evidence:{page,start:0,end:label.length,quote:label}});d.parts.push({claimId:`long-${i}`,excerpt:label});}
 await save('milestone-6-native-cv','cv');await writeFile('../../outputs/milestone-6-native-fixtures.json',JSON.stringify({scope:'Synthetic acceptance fixtures, NOT native rendering results',documents:evidence},null,2));console.log(evidence.map(({plainText,...r})=>r));
}finally{await server.close();}
