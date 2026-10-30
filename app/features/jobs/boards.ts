import type { SourceName } from './model';
export interface Board { source: Exclude<SourceName, 'manual'>; board: string; employer: string; employerCountry: string | null; applicationHost?: 'job-boards.greenhouse.io' | 'job-boards.eu.greenhouse.io' }
// Reviewed public company boards only. Extend this catalog after access/terms review.
export const boards: Board[] = [
  { source: 'greenhouse', board: 'sourcegraph91', employer: 'Sourcegraph', employerCountry: null },
  { source: 'ashby', board: 'oyster', employer: 'Oyster', employerCountry: null },
  { source: 'ashby', board: 'supabase', employer: 'Supabase', employerCountry: null },
  { source: 'greenhouse', board: 'workwize', employer: 'Workwize', employerCountry: null, applicationHost: 'job-boards.eu.greenhouse.io' },
  { source: 'greenhouse', board: 'koboldmetals', employer: 'KoBold Metals', employerCountry: null },
  { source: 'greenhouse', board: 'greenhouse', employer: 'Greenhouse', employerCountry: null },
  { source: 'lever', board: 'lever', employer: 'Lever', employerCountry: null },
  { source: 'ashby', board: 'Ashby', employer: 'Ashby', employerCountry: null },
];
export function getBoard(source: string, name: string): Board {
  const board = boards.find(b => b.source === source && b.board === name);
  if (!board) throw new Error('Unconfigured job board'); return board;
}
