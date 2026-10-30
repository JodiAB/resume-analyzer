import React from 'react';
import {it,expect,vi,afterEach,beforeEach} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import CheckedDownload from '../app/features/preparation/CheckedDownload';
import {usePuterStore} from '../app/lib/puter';
import {sha256} from '../app/features/profile/extract';
const initial=usePuterStore.getState();const bytes=new Uint8Array([1,2,3]);
beforeEach(()=>usePuterStore.setState({...initial,isLoading:false,auth:{...initial.auth,isAuthenticated:true,user:{uuid:'a',username:'Synthetic'}}}));
afterEach(()=>{cleanup();usePuterStore.setState(initial);vi.useRealTimers();});
it('exposes a native download link only after owner/context and byte-integrity checks pass',async()=>{
 const check=vi.fn(async()=>{}),fail=vi.fn();render(<CheckedDownload label="CV DOCX" url="blob:synthetic" fileName="synthetic.docx" bytes={bytes} hash={await sha256(bytes)} check={check} fail={fail}/>);
 expect(screen.queryByRole('link')).toBeNull();fireEvent.click(screen.getByRole('button'));const link=await screen.findByRole('link',{name:'Download CV DOCX'});expect(link.getAttribute('download')).toBe('synthetic.docx');expect(check).toHaveBeenCalledTimes(1);expect(fail).not.toHaveBeenCalled();
});
it('rejects an owner change between file validation and the actual native link click',async()=>{
 const fail=vi.fn();render(<CheckedDownload label="CV PDF" url="blob:synthetic" fileName="synthetic.pdf" bytes={bytes} hash={await sha256(bytes)} check={async()=>{}} fail={fail}/>);fireEvent.click(screen.getByRole('button'));const link=await screen.findByRole('link');usePuterStore.setState({isLoading:true});const event=new MouseEvent('click',{bubbles:true,cancelable:true});expect(link.dispatchEvent(event)).toBe(false);expect(fail).toHaveBeenCalledTimes(1);
});
it('does not expose a file whose hash or current source cannot be verified',async()=>{
 const fail=vi.fn();render(<CheckedDownload label="CV PDF" url="blob:synthetic" fileName="synthetic.pdf" bytes={bytes} hash={'0'.repeat(64)} check={async()=>{}} fail={fail}/>);fireEvent.click(screen.getByRole('button'));await vi.waitFor(()=>expect(fail).toHaveBeenCalledTimes(1));expect(screen.queryByRole('link')).toBeNull();
});
it('rechecks a profile/job/date change at actual link click instead of trusting the earlier ticket',async()=>{
 const check=vi.fn(async()=>{}),fail=vi.fn(),native=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});render(<CheckedDownload label="CV PDF" url="blob:synthetic" fileName="synthetic.pdf" bytes={bytes} hash={await sha256(bytes)} check={check} fail={fail}/>);fireEvent.click(screen.getByRole('button'));const link=await screen.findByRole('link');check.mockRejectedValueOnce(new Error('Assessment became stale'));fireEvent.click(link);await vi.waitFor(()=>expect(fail).toHaveBeenCalledTimes(1));expect(check).toHaveBeenCalledTimes(2);expect(native).not.toHaveBeenCalled();native.mockRestore();
});
