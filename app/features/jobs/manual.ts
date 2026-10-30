import { canonicalUrl, safeJobUrl, validateJob, mentionedSkills, type Job } from './model';
import { getBoard } from './boards';
import { sha256 } from '../profile/extract';
export function recognizeJobUrl(raw: string): { source: 'greenhouse' | 'lever' | 'ashby'; board: string; id: string } | null {
  const u = safeJobUrl(raw);
  const match = u.pathname.match(/^\/([a-zA-Z0-9_-]{1,100})\/(?:jobs\/)?([a-zA-Z0-9_-]{1,100})(?:\/(?:apply|application))?\/?$/);
  if (!match) return null;
  const source = ['boards.greenhouse.io','job-boards.greenhouse.io'].includes(u.hostname) ? 'greenhouse' : u.hostname === 'jobs.lever.co' ? 'lever' : u.hostname === 'jobs.ashbyhq.com' ? 'ashby' : null;
  if (!source) return null;
  try { getBoard(source, match[1]); return { source, board: match[1], id: match[2] }; } catch { return null; }
}
export async function importManualJob(input: { url: string; employer: string; title: string; description: string }, now: string): Promise<Job> {
  const url = input.url.trim() ? canonicalUrl(input.url.trim()) : null;
  const sourceId = await sha256(new TextEncoder().encode(url || `${input.employer}\n${input.title}\n${input.description}`));
  return validateJob({ key: `manual:manual:${sourceId}`, source: 'manual', board: 'manual', sourceId, employer: input.employer.trim() || 'Unverified employer', employerCountry: null, title: input.title.trim() || 'Imported vacancy (unverified)', url, description: input.description, locations: [], remote: 'UNKNOWN', employmentType: null, seniority: null, skills: mentionedSkills(input.description), salary: [], salaryNotes: '', publishedAt: null, publicationKind: 'UNKNOWN', updatedAt: null, deadline: null, checkedAt: now, availability: 'UNKNOWN', checkError: null });
}
