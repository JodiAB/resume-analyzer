import {expect,it} from 'vitest';
import {salaryConstraint,windowOverlap} from '../app/features/matching/constraints';
import {assessMatch,defaultMatchConfig} from '../app/features/matching/engine';
import {profileFixture,jobFixture,asOf} from './fixtures/matching';
it('keeps absent/incomparable/crossing salary bands unknown rather than promising the maximum',()=>{
  const c={...defaultMatchConfig(),salaryTarget:3000,salaryCurrency:'USD',salaryPeriod:'month' as const};
  expect(salaryConstraint(jobFixture(),c).status).toBe('UNKNOWN');
  expect(salaryConstraint({...jobFixture(),salary:[{min:24000,max:48000,currency:'USD',period:'year'}]},c).status).toBe('UNKNOWN');
  expect(salaryConstraint({...jobFixture(),salary:[{min:48000,max:60000,currency:'USD',period:'year'}]},c).status).toBe('COMPATIBLE');
});
it('blocks a mandatory salary conflict without changing the qualification score',()=>{
  const j={...jobFixture(),salary:[{min:1000,max:2000,currency:'USD',period:'month' as const}]};
  const r=assessMatch(profileFixture(),j,{...defaultMatchConfig(),salaryMandatory:true,salaryTarget:3000},asOf);
  expect(r.score).toBe(100);expect(r.constraints.salary.status).toBe('CONFLICT');expect(r.recommendation).toBe('BLOCKED');
});
it('uses IANA zones/DST and weekday windows rather than a constant US Eastern offset',()=>{
  const winter=windowOverlap('Africa/Johannesburg','15:00','23:00','America/New_York','09:00','17:00','2026-01-12');
  const summer=windowOverlap('Africa/Johannesburg','15:00','23:00','America/New_York','09:00','17:00','2026-07-13');
  expect(winter.minimumMinutes).toBe(420);expect(summer.minimumMinutes).toBe(480);
});
it('rejects unsupported overnight windows rather than inventing overlap',()=>{
  expect(()=>windowOverlap('Africa/Johannesburg','22:00','06:00','Europe/London','09:00','17:00','2026-01-12')).toThrow();
});
it('keeps an employer-mandatory unknown overlap condition out of recommendations',()=>{
 const j=jobFixture();j.description+='\nMust overlap US Eastern core hours.';const r=assessMatch(profileFixture(),j,defaultMatchConfig(),asOf);
 expect(r.constraints.hours.mandatory).toBe(true);expect(r.recommendation).toBe('MANUAL_REVIEW');
});
