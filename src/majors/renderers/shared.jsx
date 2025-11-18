import React from "react";

export const MajorIntro = ({ majorReq }) => {
  if (!majorReq?.prerequisites) return null;
  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[0.7rem] text-amber-900">
      <div className="text-[0.6rem] font-semibold uppercase tracking-wide text-amber-800">
        Prerequisites
      </div>
      <p className="mt-1">{majorReq.prerequisites}</p>
    </div>
  );
};

export const SectionCard = ({ title, children, className = "" }) => (
  <div className={`rounded-lg border p-3 ${className}`.trim()}>
    {title && <div className="mb-2 text-sm font-medium">{title}</div>}
    {children}
  </div>
);
