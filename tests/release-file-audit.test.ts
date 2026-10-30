import {it,expect} from 'vitest';
import {auditAuxiliaryFiles} from '../verification/release-file-audit';
const run='944582de-c134-4cd4-afb7-330a8266dd6b';
it('accepts confirmed absence in B without claiming an upload race passed',()=>{expect(auditAuxiliaryFiles([],'B',run)).toEqual({status:'PASS',recognizedSyntheticFiles:0,unverifiedEntries:0,unexpectedAUploadInB:false});});
it('flags an A-only race marker found in B and exports no bytes',()=>{const r=auditAuxiliaryFiles([{text:'SYNTHETIC RACE '+run}],'B',run);expect(r.status).toBe('FAIL');expect(r.unexpectedAUploadInB).toBe(true);expect(JSON.stringify(r)).not.toContain('SYNTHETIC RACE');});
it('allows own A auxiliary markers but blocks ambiguous content or listings',()=>{expect(auditAuxiliaryFiles([{text:'SYNTHETIC RACE '+run}],'A',run).status).toBe('PASS');expect(auditAuxiliaryFiles([{text:'unrecognized private text'}],'B',run).status).toBe('BLOCKED');expect(auditAuxiliaryFiles(undefined,'B',run).status).toBe('BLOCKED');});
