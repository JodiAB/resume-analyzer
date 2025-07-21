import React from "react";
import { Link } from "react-router";
import ScoreCircle from "./ScoreCircle";

const ResumeCard = ({
  resume: { id, companyName, jobTitle, feedback, imagePath },
}: {
  resume: Resume;
}) => {
  return (
    <Link to={`/resume/${id}`} className="resume-card animate-in fade-in duration-1000">
      <div className="resume-card-header ">
        <div className="flex flex-col gap-2">
          {companyName ? (
            <h2 className="text-black font-bold text-lg break-words">{companyName}</h2>
          ) : (
            <h2 className="text-black font-bold text-lg">Resume</h2>
          )}
          {jobTitle && <h3 className="text-sm text-gray-500 break-words">{jobTitle}</h3>}
        </div>

        <div className="flex-shrink-0">
          <ScoreCircle score={feedback.overallScore} />
        </div>
      </div>

      <div className="gradient-border animate-in fade-in duration-1000 mt-4">
        <div className="w-full h-full">
          <img
            src={imagePath}
            alt="resume"
            className="w-full h-[350px] max-sm:h-[200px] object-cover object-top rounded-md"
          />
        </div>
      </div>
    </Link>
  );
};

export default ResumeCard;
