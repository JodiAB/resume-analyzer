import { canonicalUrl, validateJob, type Job, type TrackedJob } from './model';
export function mergeJobs(previous: TrackedJob[], incoming: Job[], now: string): TrackedJob[] {
  const result = structuredClone(previous);
  for (const raw of incoming) {
    const job = validateJob(raw);
    const url = job.url && canonicalUrl(job.url);
    const identities = [job.key, ...(url ? ['url:' + url] : [])];
    const matches = result.filter(t => t.aliases.some(a=>identities.includes(a)) || !!(url && t.job.url && canonicalUrl(t.job.url) === url));
    const match=matches[0];
    if (match) {
      const priority = { NEW: 0, SAVED: 1, SHORTLISTED: 2, DISMISSED: 3 };
      match.aliases = [...new Set([...matches.flatMap(t=>t.aliases), ...identities])]; match.lastSeenAt = now;
      match.review=matches.map(t=>t.review).sort((a,b)=>priority[b]-priority[a])[0];
      match.firstSeenAt=matches.map(t=>t.firstSeenAt).sort()[0];
      for(const duplicate of matches.slice(1))result.splice(result.indexOf(duplicate),1);
      // A manual alias must not downgrade a provider-verified snapshot.
      if (job.source !== 'manual' || match.job.source === 'manual') match.job = job;
    } else result.push({ job, aliases: identities, review: 'NEW', firstSeenAt: now, lastSeenAt: now });
  }
  return result;
}
