import {useEffect,useRef,useState} from 'react';
export default function PdfPreview({bytes,label}:{bytes:Uint8Array;label:string}){
 const canvas=useRef<HTMLCanvasElement>(null);const [page,setPage]=useState(1),[count,setCount]=useState(1),[status,setStatus]=useState('Rendering PDF page…'),[ready,setReady]=useState(false);
 useEffect(()=>{let cancelled=false,task:any,render:any;setReady(false);setStatus('Rendering PDF page…');
  void (async()=>{
   // @ts-expect-error upstream module path lacks declarations
   const pdfjs=await import('pdfjs-dist/build/pdf.mjs');if(cancelled)return;pdfjs.GlobalWorkerOptions.workerSrc='/pdf.worker.min.mjs';
   task=pdfjs.getDocument({data:new Uint8Array(bytes),isEvalSupported:false});const pdf=await task.promise;if(cancelled)return;setCount(pdf.numPages);const n=Math.min(page,pdf.numPages);if(n!==page){setPage(n);return;}const source=await pdf.getPage(n);if(cancelled||!canvas.current)return;const viewport=source.getViewport({scale:1.25}),element=canvas.current,context=element.getContext('2d');if(!context)throw new Error('Canvas unavailable');element.width=Math.ceil(viewport.width);element.height=Math.ceil(viewport.height);render=source.render({canvasContext:context,viewport});await render.promise;if(!cancelled){setReady(true);setStatus('PDF page rendered.');}
  })().catch(()=>{if(!cancelled){setReady(false);setStatus('PDF preview unavailable. Plain-text preview and validated downloads remain available.');}});
  return()=>{cancelled=true;render?.cancel();if(task)void task.destroy().catch(()=>{});};
 },[bytes,page]);
 return <div className="flex flex-col gap-2 min-w-0"><label>{label} preview page<select aria-label={`${label} preview page`} value={page} onChange={e=>setPage(Number(e.target.value))}>{Array.from({length:count},(_,i)=><option key={i} value={i+1}>{i+1} / {count}</option>)}</select></label><p className="text-sm">{status} Selectable text is available in the plain-text preview and PDF download.</p><canvas ref={canvas} role="img" aria-label={`${label} PDF page preview`} data-pdf-ready={ready?'true':'false'} style={{maxWidth:'100%',height:'auto',background:'white'}} className="border rounded"/></div>;
}
