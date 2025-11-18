import React from "react";
import { computeClassicsProgress } from "../progress.js";
import { MajorIntro } from "./shared.jsx";

const StatCard = ({ label, value, subtitle }) => (
  <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
    <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
    <div className="text-xl font-semibold text-slate-900">{value}</div>
    {subtitle && <div className="text-[0.65rem] text-slate-500">{subtitle}</div>}
  </div>
);

export default function ClassicsMajorPlanner({ majorReq, courses }) {
  const progress = computeClassicsProgress(courses, majorReq.classicsStructure || {});

  const languageStats = [
    { label: "Greek units", value: progress.greekCount },
    { label: "Latin units", value: progress.latinCount },
    { label: "Total language", value: `${progress.languageTotal}/${progress.languageTotalRequired}` },
    { label: "300-level language", value: `${progress.lang300Count}/${progress.languageMinUpper}` },
    { label: "100-level counted", value: `${Math.min(progress.lang100Count, progress.languageMaxIntro)}/${progress.languageMaxIntro}` },
  ];

  const civStats = [
    { label: "Civilization courses", value: `${progress.civCount}/${progress.civRequired}` },
    { label: "CLCV-focused", value: `${progress.civClcvCount}/${progress.civClcvRequired}` },
    { label: "100-level civ", value: `${Math.min(progress.civ100Count, progress.civMax100)}/${progress.civMax100}` },
  ];

  return (
    <div className="space-y-5">
      <MajorIntro majorReq={majorReq} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="text-sm font-semibold text-slate-900">Language progression</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {languageStats.map(stat => (
              <StatCard key={stat.label} label={stat.label} value={stat.value} />
            ))}
          </div>
          <p className="text-[0.65rem] text-slate-500">
            Majors complete six total units split between Greek and Latin (max two 100-level counting toward the six; at least two at the 300 level).
          </p>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-semibold text-slate-900">Classical civilization breadth</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {civStats.map(stat => (
              <StatCard key={stat.label} label={stat.label} value={stat.value} />
            ))}
          </div>
          <p className="text-[0.65rem] text-slate-500">
            Select four civilization courses (at least two in Classical Civilization, at most one at the 100 level) in consultation with your advisor.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
        <div className="text-xs uppercase tracking-wide text-slate-500">Study abroad & research</div>
        <p className="text-[0.7rem] text-slate-600">
          Plan Rome/Athens study abroad or archaeological fieldwork in consultation with faculty; departmental funds can support Classics-related travel and research.
        </p>
      </div>
    </div>
  );
}
