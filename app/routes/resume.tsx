// import { Link, useNavigate, useParams } from "react-router-dom"; // Updated import
// import { useEffect, useState } from "react";
// import { usePuterStore } from "~/lib/puter";
// import Summary from "~/components/Summary";
// import ATS from "~/components/ATS";
// import Details from "~/components/Details";

// // Define Feedback interface (move to a types file if reusable)
// interface Feedback {
//   overallScore: number;
//   ATS: {
//     score: number;
//     tips: { type: "good" | "improve"; tip: string }[];
//   };
//   toneAndStyle: {
//     score: number;
//     tips: { type: "good" | "improve"; tip: string; explanation: string }[];
//   };
//   content: {
//     score: number;
//     tips: { type: "good" | "improve"; tip: string; explanation: string }[];
//   };
//   structure: {
//     score: number;
//     tips: { type: "good" | "improve"; tip: string; explanation: string }[];
//   };
//   skills: {
//     score: number;
//     tips: { type: "good" | "improve"; tip: string; explanation: string }[];
//   };
// }

// export const meta = () => [
//   { title: "CareerCrafter | Review" },
//   { name: "description", content: "Detailed overview of your resume" },
// ];

// const Resume = () => {
//   const { auth, isLoading, fs, kv } = usePuterStore();
//   const { id } = useParams<{ id: string }>();
//   const [imageUrl, setImageUrl] = useState("");
//   const [resumeUrl, setResumeUrl] = useState("");
//   const [feedback, setFeedback] = useState<Feedback | null>(null);
//   const [error, setError] = useState<string | null>(null);
//   const navigate = useNavigate();

//   useEffect(() => {
//     if (!isLoading && !auth.isAuthenticated) {
//       navigate(`/auth?next=/resume/${id}`);
//     }
//   }, [isLoading, auth.isAuthenticated, id, navigate]);

//   useEffect(() => {
//     const loadResume = async () => {
//       try {
//         const resume = await kv.get(`resume:${id}`);
//         if (!resume) {
//           setError("Resume not found");
//           return;
//         }

//         const data = JSON.parse(resume);
//         // Validate feedback structure
//         if (!data.feedback || !data.feedback.ATS) {
//           setError("Invalid resume data: missing feedback or ATS");
//           return;
//         }

//         const resumeBlob = await fs.read(data.resumePath);
//         if (!resumeBlob) {
//           setError("Failed to load resume PDF");
//           return;
//         }
//         const pdfBlob = new Blob([resumeBlob], { type: "application/pdf" });
//         const resumeUrl = URL.createObjectURL(pdfBlob);
//         setResumeUrl(resumeUrl);

//         const imageBlob = await fs.read(data.imagePath);
//         if (!imageBlob) {
//           setError("Failed to load resume image");
//           return;
//         }
//         const imageUrl = URL.createObjectURL(imageBlob);
//         setImageUrl(imageUrl);

//         setFeedback(data.feedback);
//         console.log({ resumeUrl, imageUrl, feedback: data.feedback });
//       } catch (err) {
//         console.error("Error loading resume:", err);
//         setError("Failed to load resume data");
//       }
//     };

//     loadResume();
//   }, [id, fs, kv]);

//   if (error) {
//     return (
//       <main className="!pt-0">
//         <nav className="resume-nav">
//           <Link to="/" className="back-button">
//             <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
//             <span className="text-gray-800 text-sm font-semibold">
//               Back to Homepage
//             </span>
//           </Link>
//         </nav>
//         <section className="main-section">
//           <p className="text-red-500">{error}</p>
//         </section>
//       </main>
//     );
//   }

//   return (
//     <main className="!pt-0">
//       <nav className="resume-nav">
//         <Link to="/" className="back-button">
//           <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
//           <main className="text-gray-800 text-sm font-semibold">
//             Back to Homepage
//           </main>
//         </Link>
//       </nav>
//       <div className="flex flex-row w-full max-lg:flex-col-reverse">
//         <section className="feedback-section bg-[url('/images/bg-small.svg')] bg-cover h-[100vh] sticky top-0 flex items-center justify-center">
//           {imageUrl && resumeUrl ? (
//             <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] max-w-xl:h-fit w-fit">
//               <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
//                 <img
//                   src={imageUrl || "https://via.placeholder.com/150"}
//                   className="w-full h-full object-contain rounded-2xl"
//                   title="resume"
//                   onError={(e) => {
//                     console.error(`Failed to load image: ${imageUrl}`);
//                     e.currentTarget.src = "https://via.placeholder.com/150";
//                   }}
//                 />
//               </a>
//             </div>
//           ) : (
//             <p>Loading resume...</p>
//           )}
//         </section>
//         <section className="feedback-section">
//           <h2 className="text-4xl !text-black font-bold">Resume Review</h2>
//           {feedback ? (
//             <div className="flex flex-col gap-8 animate-in fade-in duration-1000">
//               <Summary feedback={feedback} />
//               <ATS
//                 score={feedback.ATS?.score ?? 0}
//                 suggestions={feedback.ATS?.tips ?? []}
//               />
//               <Details feedback={feedback} />
//             </div>
//           ) : (
//             <img src="/images/resume-scan-2.gif" className="w-full" alt="Scanning resume" />
//           )}
//         </section>
//       </div>
//     </main>
//   );
// };

// export default Resume;