import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { usePuterStore } from "~/lib/puter";
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
    if (!isLoading && !auth.isAuthenticated) {
      navigate(`/auth?next=/resume/${id}`);
    }
  }, [isLoading, auth.isAuthenticated, id, navigate]);

  useEffect(() => {
    const loadResume = async () => {
      try {
        const resume = await kv.get(`resume:${id}`);
        if (!resume) {
          setError("Resume not found");
          return;
        }

        const data = JSON.parse(resume);

        if (!data.feedback || !data.feedback.ATS) {
          setError("Invalid resume data: missing feedback or ATS");
          return;
        }

        const resumeBlob = await fs.read(data.resumePath);
        if (!resumeBlob) {
          setError("Failed to load resume PDF");
          return;
        }

        const pdfBlob = new Blob([resumeBlob], { type: "application/pdf" });
        const resumeUrl = URL.createObjectURL(pdfBlob);
        setResumeUrl(resumeUrl);

        const imageBlob = await fs.read(data.imagePath);
        if (!imageBlob) {
          setError("Failed to load resume image");
          return;
        }

        const imageUrl = URL.createObjectURL(imageBlob);
        setImageUrl(imageUrl);

        setFeedback(data.feedback);
      } catch (err) {
        console.error("Error loading resume:", err);
        setError("Failed to load resume data");
      }
    };

    loadResume();
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
                  onError={(e) => {
                    console.error(`Failed to load image: ${imageUrl}`);
                    e.currentTarget.src = "https://via.placeholder.com/150";
                  }}
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

export default Resume;
