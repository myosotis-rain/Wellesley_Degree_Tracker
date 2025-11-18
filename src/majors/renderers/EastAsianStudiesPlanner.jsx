import React from "react";
import { computeEasProgress } from "../progress.js";
import { MajorIntro } from "./shared.jsx";

const StatCard = ({ label, value, subtitle }) => (
  <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
    <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
    <div className="text-xl font-semibold text-slate-900">{value}</div>
    {subtitle && <div className="text-[0.65rem] text-slate-500">{subtitle}</div>}
  </div>
);

export default function EastAsianStudiesPlanner({ majorReq, courses }) {
  const progress = computeEasProgress(courses, majorReq.easStructure || {});

  return (
    <div className="space-y-5">
      <MajorIntro majorReq={majorReq} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Language units"
          value={`${progress.languageCount}/${progress.languageRequired}`}
          subtitle={"Four language courses at the 200+ level"}
        />
        <StatCard
          label="Non-language courses"
          value={`${progress.nonLanguageCount}/${progress.nonLanguageRequired}`}
          subtitle="Humanities/history/social science"
        />
        <StatCard
          label="Humanities"
          value={`${progress.humanitiesCount}/${progress.humanitiesRequired}`}
        />
        <StatCard
          label="History & social science"
          value={`${progress.historyCount}/${progress.historyRequired}`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          label="300-level non-language"
          value={`${progress.nonLang300Count}/${progress.nonLang300Required}`}
          subtitle="At least two advanced seminars at Wellesley"
        />
        <StatCard
          label="Concentration"
          value={`${progress.concentrationRequired} courses`}
          subtitle="Choose three non-language courses in a country or disciplinary focus"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 text-[0.7rem] text-slate-600">
        Use the requirement assignment panel to tag courses for humanities vs. history requirements and to track your country/disciplinary concentration. Study abroad is strongly encouraged after completing intermediate language study.
      </div>
    </div>
  );
}
