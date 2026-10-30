import PrivateBoundary from "~/components/PrivateBoundary";
import { type FormEvent, useState, useRef } from 'react';
import Navbar from "~/components/Navbar";
import FileUploader from "~/components/FileUploader";
import { captureSession, usePuterStore } from "~/lib/puter";
import { useNavigate } from "react-router";
import { convertPdfToImage } from "~/lib/pdf2img";
import { generateUUID } from "~/lib/utils";
import { analyzeResume } from "~/lib/resume-service";

const Upload = () => {
    const { auth, isLoading, fs, ai, kv } = usePuterStore();
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const processing = useRef(false);    const attempt = useRef<{ file: File; details: string; id: string } | null>(null);
    const [error, setError] = useState('');

    const handleFileSelect = (file: File | null) => {
        setFile(file);
    };

    const handleAnalyze = async ({ companyName, jobTitle, jobDescription, file }: { companyName: string, jobTitle: string, jobDescription: string, file: File }) => {
        if (processing.current) return;
        processing.current = true;
        setIsProcessing(true); setError('');
        setStatusText('Uploading and analyzing your PDF…');
        try {
            const assertSession = captureSession();
            const details = JSON.stringify({ companyName, jobTitle, jobDescription });            if (!attempt.current || attempt.current.file !== file || attempt.current.details !== details) attempt.current = { file, details, id: generateUUID() };            const data = await analyzeResume({ id: attempt.current.id, companyName, jobTitle, jobDescription, file }, {
                assertSession, upload: fs.upload, convert: convertPdfToImage,
                feedback: ai.feedback, get: kv.get, set: kv.set, deleteFile: fs.delete, deleteKey: kv.delete,
            });
            assertSession();
            navigate(`/resume/${data.id}`);
        } catch {
            setError('Analysis could not be completed. Retry checks for a saved result first. Your form is preserved. If a save remains uncertain, check your resume list before starting a new analysis. Retrying AI may incur another charge.');
        } finally {
            processing.current = false;
            setIsProcessing(false); setStatusText('');
        }
    };

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget.closest('form');
        if (!form) return;
        const formData = new FormData(form);

        const companyName = formData.get('company-name') as string;
        const jobTitle = formData.get('job-title') as string;
        const jobDescription = formData.get('job-description') as string;

        if (!file) return;

        void handleAnalyze({ companyName, jobTitle, jobDescription, file });
    };

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover">
            <Navbar />
            <section className="main-section">
                <div className="page-heading py-16">
                    <h1>Smart feedback for your dream job</h1>
                    {isProcessing ? (
                        <>
                            <h2>{statusText}</h2>
                            <img src="/images/resume-scan.gif" className="w-full" />
                        </>
                    ) : (
                        <h2>Drop your resume for an ATS score and improvement tips</h2>
                    )}
                    {error && <p role="alert">{error}</p>}
                    {(
                        <form id="upload-form" aria-busy={isProcessing} onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">
                            <div className="form-div">
                                <label htmlFor="company-name">Company Name</label>
                                <input type="text" name="company-name" placeholder="Company Name" id="company-name" />
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-title">Job Title</label>
                                <input type="text" name="job-title" placeholder="Job Title" id="job-title" />
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-description">Job Description</label>
                                <textarea rows={5} name="job-description" placeholder="Job Description" id="job-description" />
                            </div>
                            <div className="form-div">
                                <label htmlFor="uploader">Upload Resume</label>
                                <FileUploader onFileSelect={handleFileSelect} />
                            </div>
                            <button className="primary-button" type="submit" disabled={isProcessing || !file}>
                                Analyze Resume
                            </button>
                        </form>
                    )}
                </div>
            </section>
        </main>
    );
};


export default function ProtectedUpload() { return <PrivateBoundary><Upload /></PrivateBoundary>; }
