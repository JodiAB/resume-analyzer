import latinUrl from '@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff?url';
import extendedUrl from '@fontsource/noto-sans/files/noto-sans-latin-ext-400-normal.woff?url';
import type {PreparationRecord} from './records';
import type {RenderedDocuments} from './render';
export async function renderRevision(record:PreparationRecord,assertCurrent:()=>Promise<void>):Promise<{cv:RenderedDocuments;cover:RenderedDocuments|null}>{
 await assertCurrent();const {renderDocuments}=await import('./render');const fonts=await Promise.all([latinUrl,extendedUrl].map(async url=>{const response=await fetch(url);if(!response.ok)throw new Error('Local font unavailable');const bytes=new Uint8Array(await response.arrayBuffer());if(!bytes.length||bytes.length>1000000)throw new Error('Invalid local font');return bytes;}));await assertCurrent();
 const cv=await renderDocuments(record.draft,record.context.profile,record.context.job,'cv',fonts,record.createdAt);await assertCurrent();const cover=record.draft.cover?await renderDocuments(record.draft,record.context.profile,record.context.job,'cover',fonts,record.createdAt):null;await assertCurrent();return {cv,cover};
}
