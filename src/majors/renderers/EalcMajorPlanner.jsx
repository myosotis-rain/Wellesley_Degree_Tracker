import React from "react";
import { computeEalcProgress } from "../progress.js";
import { MajorIntro } from "./shared.jsx";
import { cx } from "../../utils.js";

const StatCard = ({ label, value, subtitle }) => (
  <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
    <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
    <div className="text-xl font-semibold text-slate-900">{value}</div>
    {subtitle && <div className="text-[0.65rem] text-slate-500">{subtitle}</div>}
  </div>
);

const TrackCard = ({ track }) => (
  <div className={cx(
    "rounded border px-3 py-2 text-center",
    track.completed ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600"
  )}>
    <div className="text-[0.55rem] uppercase text-slate-500">{track.label}</div>
    <div className="text-base font-semibold text-slate-900">{track.completed ? "Sequence complete" : "In progress"}</div>
  </div>
);

export default function EalcMajorPlanner({ majorReq, courses }) {
  const progress = computeEalcProgress(courses, majorReq.ealcStructure || {});

  return (
    <div className="space-y-5">
      <MajorIntro majorReq={majorReq} />

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard label="EALC 221" value={progress.gatewayCompleted ? "✓" : "Pending"} subtitle="Gateways to East Asia" />
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-2">
          <div className="text-sm font-semibold text-slate-900">Language track</div>
          <p className="text-[0.7rem] text-slate-600">Ensure one sequence (Chinese, Japanese, or Korean) is completed.</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {progress.trackResults.map(track => (
              <TrackCard key={track.id} track={track} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Non-language courses"
          value={`${progress.nonLanguageCount}/${progress.nonLanguageRequired}`}
          subtitle="At least two cultural/literature courses"
        />
        <StatCard
          label="200-level survey"
          value={`${progress.surveyCount}/${progress.surveyRequired}`}
          subtitle="At least one survey course"
        />
        <StatCard
          label="300-level work"
          value={`${progress.level300Count}/${progress.level300Required}`}
          subtitle="Advanced seminars taken at Wellesley"
        />
      </div>
    </div>
  );
}
