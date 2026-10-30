import { parseResume } from "~/lib/validation";
import PrivateBoundary from "~/components/PrivateBoundary";
import type { Route } from "./+types/home";
import Navbar from "~/components/Navbar";
import ResumeCard from "~/components/ResumeCard";
import {captureSession, usePuterStore} from "~/lib/puter";
import {Link, useNavigate} from "react-router";
import {useEffect, useState} from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Resumind" },
    { name: "description", content: "Smart feedback for your dream job!" },
  ];
}

function Home() {
  const { auth, kv } = usePuterStore();
  const [error, setError] = useState('');
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [recoveries, setRecoveries] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    const assertSession = captureSession();
    const loadResumes = async () => {
      setLoadingResumes(true); setError('');
      try {
        const items = await kv.list('resume:*', true);
        assertSession();
        if (!active) return;
        if (!Array.isArray(items)) throw new Error('Could not list resumes');
        const valid: Resume[] = [];
        let skipped = 0;
        for (const item of items) {
          try {
            if (typeof item === 'string') throw new Error('Unexpected key');
            const record = parseResume(item.value);
            if (item.key !== `resume:${record.id}`) throw new Error('Mismatched record');
            valid.push(record);
          } catch { skipped++; }
        }
        setResumes(valid);
        if (skipped) setError(`${skipped} incomplete or invalid records were skipped. They have not been deleted.`);
        const pending = await kv.list('resume-pending:*', true);
        assertSession();
        if (!active) return;
        setRecoveries((pending || []).flatMap(item => {
          try {
            if (typeof item === 'string') return [];
            const journal = JSON.parse(item.value);
            return typeof journal.id === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(journal.id) && item.key === `resume-pending:${journal.id}` && !valid.some(r => r.id === journal.id) ? [journal.id] : [];
          } catch { return []; }
        }));
      } catch { if (active) setError('Unable to load resumes. Reload to retry.'); }
      finally { if (active) setLoadingResumes(false); }
    };
    void loadResumes();
    return () => { active = false; };
  }, [kv]);

  return <main className="bg-[url('/images/bg-main.svg')] bg-cover">
    <Navbar />

    <section className="main-section">
      <div className="page-heading py-16">
        <h1>Track Your Applications & Resume Ratings</h1>
        {!loadingResumes && resumes?.length === 0 ? (
            <h2>No resumes found. Upload your first resume to get feedback.</h2>
        ): (
          <h2>Review your submissions and check AI-powered feedback.</h2>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
      {recoveries.length > 0 && <section aria-label="Upload recovery"><p>Unfinished analyses were retained for recovery. Check your saved resumes before repeating AI analysis. Their private upload folders may need manual cleanup in your Puter account:</p><ul>{recoveries.map(id => <li key={id}>jobpilot/resumes/{id}</li>)}</ul></section>}
      {loadingResumes && (
          <div className="flex flex-col items-center justify-center">
            <img src="/images/resume-scan-2.gif" className="w-[200px]" />
          </div>
      )}

      {!loadingResumes && resumes.length > 0 && (
        <div className="resumes-section">
          {resumes.map((resume) => (
              <ResumeCard key={resume.id} resume={resume} />
          ))}
        </div>
      )}

      {!loadingResumes && resumes?.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-10 gap-4">
            <Link to="/upload" className="primary-button w-fit text-xl font-semibold">
              Upload Resume
            </Link>
          </div>
      )}
    </section>
  </main>
}

export default function ProtectedHome() { return <PrivateBoundary><Home /></PrivateBoundary>; }
