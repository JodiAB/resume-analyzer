import Navbar from "~/components/Navbar";
import type { Route } from "./+types/home";

import ResumeCard from "~/components/ResumeCard";
import { resumes } from "constants";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "CareerCrafter" },
    {
      name: "description",
      content:
        "AI-powered resume analysis to optimize your professional profile and boost job application success.",
    },
  ];
}

export default function Home() {
  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover">
      <Navbar />
      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Track Your Applications & Resume Ratings</h1>
          <h2>Review your submissions and check AI-powered feedback.</h2>
        </div>

      {Array.isArray(resumes) && resumes.length > 0 && (
        <div className="resumes-section">
          {resumes.map((resume) => (
              <ResumeCard key={resume.id} resume={resume} />
            ))}
            </div>
     
      )}
      </section>
    </main>
  );
}
