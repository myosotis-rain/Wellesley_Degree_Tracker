import React from "react";

const summarizePrereqs = (text = "", maxLength = 220) => {
  const clean = text.trim();
  if (clean.length <= maxLength) return { summary: clean, truncated: false };
  const sentences = clean.split(/(?<=\.)\s+/);
  let summary = "";
  for (const sentence of sentences) {
    const tentative = summary ? `${summary} ${sentence}` : sentence;
    if (tentative.length > maxLength) break;
    summary = tentative;
  }
  if (!summary) summary = clean.slice(0, maxLength).trim();
  return { summary: summary.replace(/\s+/g, " "), truncated: true };
};

export const MajorIntro = ({ majorReq }) => {
  const prereqs = majorReq?.prerequisites || "";
  if (!prereqs) return null;
  const { summary, truncated } = summarizePrereqs(prereqs);

  return (
    <div className="mb-4 rounded-2xl border border-amber-200/80 bg-amber-50/80 p-3 text-[0.75rem] text-amber-900 shadow-sm">
      <div className="text-[0.6rem] font-semibold uppercase tracking-wide text-amber-800">
        Key preparation
      </div>
      <p className="mt-1 leading-snug">{summary}</p>
      {truncated && (
        <p className="mt-1 text-[0.65rem] text-amber-800/90">
          Refer to the department handbook for the full list of prerequisites.
        </p>
      )}
    </div>
  );
};

export const SectionCard = ({ title, children, className = "" }) => (
  <div className={`rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm ${className}`.trim()}>
    {title && <div className="mb-2 text-sm font-medium">{title}</div>}
    {children}
  </div>
);
