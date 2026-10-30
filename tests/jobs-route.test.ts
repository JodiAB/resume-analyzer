// @vitest-environment node
import {afterEach,expect,it,vi} from 'vitest';
import {loader,action} from '../app/routes/api.jobs';
import {publicJobService} from '../app/features/jobs/service.server';
import {SourceError} from '../app/features/jobs/transport.server';
afterEach(()=>vi.restoreAllMocks());
it.each(['?url=https://127.0.0.1/private','?source=lever&board=lever&profile=private-cv','?source=lever&source=ashby&board=lever'])('rejects arbitrary import/personal or duplicate query parameters before source calls: %s',async query=>{
  const discover=vi.spyOn(publicJobService,'discover');const r=await loader({request:new Request('http://localhost/api/jobs'+query)});
  expect(r.status).toBe(400);expect(discover).not.toHaveBeenCalled();expect(r.headers.get('cache-control')).toBe('no-store');
});
it('rejects mutations without calling a source or submission service',()=>{
  const discover=vi.spyOn(publicJobService,'discover');expect(action().status).toBe(405);expect(discover).not.toHaveBeenCalled();
});
it('reports rate limits and generic source failures without reflecting provider secrets or payloads',async()=>{
  const discover=vi.spyOn(publicJobService,'discover').mockRejectedValueOnce(new SourceError('RATE_LIMITED',45)).mockRejectedValueOnce(new Error('DO NOT EXPOSE PROVIDER PAYLOAD'));
  const request=new Request('http://localhost/api/jobs?source=lever&board=lever');
  const limited=await loader({request});expect(limited.status).toBe(429);expect(limited.headers.get('retry-after')).toBe('45');
  const failed=await loader({request});expect(failed.status).toBe(502);expect(await failed.text()).not.toContain('DO NOT EXPOSE');expect(discover).toHaveBeenCalledTimes(2);
});
