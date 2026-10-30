import { parseResume } from "~/lib/validation";
import PrivateBoundary from "~/components/PrivateBoundary";
import { Link, useNavigate, useParams } from "react-router";
import { useEffect, useState } from "react";
import { captureSession, usePuterStore } from "~/lib/puter";
import Summary from "~/components/Summary";
import ATS from "~/components/ATS";
import Details from "~/components/Details";

interface Feedback {
  overallScore: number;
  ATS: {
    score: number;
    tips: { type: "good" | "improve"; tip: string }[];
  };
  toneAndStyle: {
    score: number;
    tips: { type: "good" | "improve"; tip: string; explanation: string }[];
  };
  content: {
    score: number;
    tips: { type: "good" | "improve"; tip: string; explanation: string }[];
  };
  structure: {
    score: number;
    tips: { type: "good" | "improve"; tip: string; explanation: string }[];
  };
  skills: {
    score: number;
    tips: { type: "good" | "improve"; tip: string; explanation: string }[];
  };
}

export const meta = () => [
  { title: "CareerCrafter | Review" },
  { name: "description", content: "Detailed overview of your resume" },
];

const Resume = () => {
  const { auth, isLoading, fs, kv } = usePuterStore();
  const { id } = useParams<{ id: string }>();
  const [imageUrl, setImageUrl] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const urls: string[] = [];
    const assertSession = captureSession();
    setImageUrl(''); setResumeUrl(''); setFeedback(null); setError(null);
    const loadResume = async () => {
      try {
        if (!id || !/^[a-zA-Z0-9-]{1,100}$/.test(id)) throw new Error('Invalid identifier');
        const raw = await kv.get(`resume:${id}`);
        assertSession();
        if (!raw) throw new Error('Missing record');
        const data = parseResume(raw);
        if (data.id !== id) throw new Error('Mismatched record');
        const resumeBlob = await fs.read(data.resumePath);
        assertSession();
        if (!active) return;
        if (!resumeBlob) throw new Error('Missing PDF');
        const imageBlob = await fs.read(data.imagePath);
        assertSession();
        if (!active) return;
        if (!imageBlob) throw new Error('Missing preview');
        const pdfUrl = URL.createObjectURL(new Blob([resumeBlob], { type: 'application/pdf' }));
        const previewUrl = URL.createObjectURL(imageBlob);
        urls.push(pdfUrl, previewUrl);
        setResumeUrl(pdfUrl); setImageUrl(previewUrl); setFeedback(data.feedback);
      } catch { if (active) setError('Unable to load this resume. It may be missing or have invalid analysis data.'); }
    };
    void loadResume();
    return () => { active = false; urls.forEach(url => URL.revokeObjectURL(url)); };
  }, [id, fs, kv]);

  return (
    <main className="!pt-0">
      {/* Navigation Bar */}
      <nav className="px-6 py-4">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-gray-800 font-semibold"
        >
          <img src="/icons/back.svg" alt="Back" className="w-4 h-4" />
          Back to Homepage
        </Link>
      </nav>

      {/* Content Layout */}
      <div className="flex flex-row w-full max-lg:flex-col-reverse">
        {/* Left (Resume Preview) */}
        <section className="flex items-center justify-center bg-[url('/images/bg-small.svg')] bg-cover h-screen sticky top-0 w-full max-lg:h-[60vh]">
          {imageUrl && resumeUrl ? (
            <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] max-w-xl w-fit">
              <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                <img
                  src={imageUrl}
                  className="w-full h-full object-contain rounded-2xl"
                  title="resume"
                  alt="Resume preview"
                  onError={() => setError('Unable to display resume preview.')}
                />
              </a>
            </div>
          ) : (
            <p className="text-center text-gray-500">Loading resume...</p>
          )}
        </section>

        {/* Right (Feedback Section) */}
        <section className="p-6 w-full flex flex-col gap-8">
          <h2 className="text-4xl text-black font-bold">Resume Review</h2>
          {error ? (
            <p className="text-red-500">{error}</p>
          ) : feedback ? (
            <>
              <Summary feedback={feedback} />
              <ATS
                score={feedback.ATS?.score ?? 0}
                suggestions={feedback.ATS?.tips ?? []}
              />
              <Details feedback={feedback} />
            </>
          ) : (
            <img
              src="/images/resume-scan-2.gif"
              alt="Scanning resume"
              className="w-full"
            />
          )}
        </section>
      </div>
    </main>
  );
};



export default function ProtectedResume() { return <PrivateBoundary><Resume /></PrivateBoundary>; }
