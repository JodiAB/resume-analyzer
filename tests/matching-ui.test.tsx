import React from 'react';
import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor,act} from '@testing-library/react';
import {MemoryRouter,Routes,Route} from 'react-router';
import Matching from '../app/routes/match';
import Jobs from '../app/routes/jobs';
import {usePuterStore} from '../app/lib/puter';
import {currentJobsRepository,jobCommand} from '../app/features/jobs/repository';
import {makeSource} from '../app/features/profile/extract';
import {profileFixture,jobFixture} from './fixtures/matching';
const initial=usePuterStore.getState();let data:Map<string,string>;let chat:ReturnType<typeof vi.fn>;
beforeEach(async()=>{
  data=new Map();chat=vi.fn(async()=>({message:{content:JSON.stringify({version:1,links:[],unresolvedRequirementIds:[]}),refusal:null},finish_reason:'stop'}));
  Object.defineProperty(navigator,'locks',{configurable:true,value:{request:(_:string,work:()=>unknown)=>work()}});
  usePuterStore.setState({...initial,isLoading:false,auth:{...initial.auth,user:{uuid:'a',username:'Synthetic'},isAuthenticated:true},kv:{...initial.kv,list:async pattern=>[...data].filter(([k])=>k.startsWith(pattern.replace('*',''))).map(([key,value])=>({key,value})),get:async key=>data.get(key)??null,set:async(key,value)=>{data.set(key,value);return true;}},ai:{...initial.ai,chat}});
  const p=profileFixture();p.source=await makeSource('synthetic.pdf',new Uint8Array([1]),p.source.pages.map(p=>p.text));data.set('jp:v1:profile:a:profile-1',JSON.stringify(p));
  const j=jobFixture();j.checkedAt=new Date().toISOString();j.publishedAt=j.checkedAt;await currentJobsRepository().append(jobCommand({jobs:[j]}));
});
afterEach(()=>{cleanup();usePuterStore.setState(initial);});
const show=()=>render(<MemoryRouter initialEntries={['/match/ashby/Ashby/match-job']}><Routes><Route path="/match/:source/:board/:jobId" element={<Matching/>}/></Routes></MemoryRouter>);
it('does not mount or read private matching state before identity verification',()=>{
  const list=vi.fn();usePuterStore.setState({isLoading:true,kv:{...initial.kv,list}});show();expect(list).not.toHaveBeenCalled();expect(screen.queryByRole('button',{name:'Analyze evidence'})).toBeNull();
});
it('assesses a selected saved job, shows the rubric/evidence and preserves shortlist history',async()=>{
  show();await screen.findByRole('button',{name:'Analyze evidence'});fireEvent.click(screen.getByRole('button',{name:'Analyze evidence'}));
  await screen.findByText('Assessment saved privately.');expect(screen.getByText('100 / 100')).toBeTruthy();expect(screen.getByText('RECOMMENDED')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Shortlist job'}));await screen.findByText('Private job review saved.');
  expect((await currentJobsRepository().load()).jobs[0].review).toBe('SHORTLISTED');expect(chat).not.toHaveBeenCalled();
});
it('requires explicit excerpt/cost consent before a structured AI call',async()=>{
  show();await screen.findByRole('button',{name:'Analyze evidence'});const button=screen.getByRole('button',{name:'Analyze with Puter AI'}) as HTMLButtonElement;expect(button.disabled).toBe(true);
  fireEvent.click(screen.getByLabelText('I consent to send the previewed confirmed excerpts and job text to Puter AI; charges may apply.'));fireEvent.click(button);
  await screen.findByText('Assessment saved privately.');expect(chat).toHaveBeenCalledTimes(1);expect(screen.getByText('puter-ai')).toBeTruthy();
});
it('clears prior visible scores when scoring settings change',async()=>{
  show();await screen.findByRole('button',{name:'Analyze evidence'});fireEvent.click(screen.getByRole('button',{name:'Analyze evidence'}));await screen.findByText('100 / 100');
  fireEvent.change(screen.getByLabelText('skills weight'),{target:{value:'30'}});expect(screen.queryByText('100 / 100')).toBeNull();
});
it('hides old scores when a newer profile revision is detected on focus',async()=>{
  show();await screen.findByRole('button',{name:'Analyze evidence'});fireEvent.click(screen.getByRole('button',{name:'Analyze evidence'}));await screen.findByText('100 / 100');
  const p=JSON.parse(data.get('jp:v1:profile:a:profile-1')!);data.set('jp:v1:profile:a:profile-2',JSON.stringify({...p,id:'profile-2',parentId:'profile-1'}));
  act(()=>window.dispatchEvent(new Event('focus')));await waitFor(()=>expect(screen.queryByText('100 / 100')).toBeNull());await screen.findByText(/Reanalysis required/);
});
it('rejects delayed model output after sign-out without saving an assessment',async()=>{
  let finish!:(v:any)=>void;chat.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));show();await screen.findByRole('button',{name:'Analyze evidence'});
  fireEvent.click(screen.getByLabelText('I consent to send the previewed confirmed excerpts and job text to Puter AI; charges may apply.'));fireEvent.click(screen.getByRole('button',{name:'Analyze with Puter AI'}));await waitFor(()=>expect(finish).toBeTypeOf('function'));
  act(()=>usePuterStore.setState({isLoading:true,auth:{...initial.auth,user:null,isAuthenticated:false}}));await act(async()=>finish({message:{content:JSON.stringify({version:1,links:[],unresolvedRequirementIds:[]})},finish_reason:'stop'}));
  expect(screen.queryByText('100 / 100')).toBeNull();expect([...data.keys()].filter(k=>k.startsWith('jp:v1:match:'))).toEqual([]);
});
it('does not send newly added profile data when the consent preview has become stale',async()=>{
 show();await screen.findByRole('button',{name:'Analyze evidence'});const p=JSON.parse(data.get('jp:v1:profile:a:profile-1')!);data.set('jp:v1:profile:a:profile-2',JSON.stringify({...p,id:'profile-2',parentId:'profile-1'}));
 fireEvent.click(screen.getByLabelText('I consent to send the previewed confirmed excerpts and job text to Puter AI; charges may apply.'));fireEvent.click(screen.getByRole('button',{name:'Analyze with Puter AI'}));
 await screen.findByRole('alert');expect(chat).not.toHaveBeenCalled();expect(screen.queryByText('100 / 100')).toBeNull();
});

it('hides a dashboard recommendation when another tab changes the stored job snapshot',async()=>{
 const mounted=show();await screen.findByRole('button',{name:'Analyze evidence'});fireEvent.click(screen.getByRole('button',{name:'Analyze evidence'}));await screen.findByText('100 / 100');mounted.unmount();
 render(<MemoryRouter><Jobs/></MemoryRouter>);await screen.findByText(/Qualification: 100\/100/);
 const saved=await currentJobsRepository().load();await currentJobsRepository().append(jobCommand({jobs:[{...saved.jobs[0].job,availability:'CLOSED'}]}));
 act(()=>window.dispatchEvent(new Event('focus')));await waitFor(()=>expect(screen.queryByText(/Qualification: 100\/100/)).toBeNull());
});
