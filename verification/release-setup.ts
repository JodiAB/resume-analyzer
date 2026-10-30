import type {Application} from '../app/features/applications/model';
import type {currentApplicationService} from '../app/features/applications/service';
interface Dependencies {load:()=>Promise<Application>;service:()=>ReturnType<typeof currentApplicationService>;captureWrites:()=>Promise<void>;prepId:string;destination:string;applicationId:string}
export async function prepareReleaseApplication(d:Dependencies):Promise<Application>{
 const app=await d.load();if(app.id!==d.applicationId)throw new Error('Synthetic application changed');
 // Repeated setup must never silently invalidate an existing approval.
 if(app.state==='READY_FOR_REVIEW'||app.state==='APPROVED')return app;
 if(app.state!=='DRAFT')throw new Error('Unsupported setup state');
 const service=d.service(),pending=await service.preparePackage(d.prepId,[],d.destination,{confirmed:false,reason:''},app.id,app.headId);
 let next=(await service.persist(pending)).applications.find(a=>a.id===app.id);if(!next)throw new Error('Setup revision unconfirmed');await d.captureWrites();
 // captureWrites performs SDK identity revalidation; acquire a fresh guard.
 const fresh=d.service();next=(await fresh.persist(fresh.prepareAction(next.id,next.headId,{type:'READY'}))).applications.find(a=>a.id===app.id);if(!next)throw new Error('Ready state unconfirmed');await d.captureWrites();return next;
}
