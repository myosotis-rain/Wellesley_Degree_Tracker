import React from "react";
import { computeCamsProgress } from "../progress.js";
import { MajorIntro } from "./shared.jsx";
import { cx } from "../../utils.js";

const StepRow = ({ step }) => (
  <div
    className={cx(
      "flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs",
      step.completed ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600"
    )}
  >
    <div>
      <div className="text-[0.6rem] uppercase tracking-wide">{step.label}</div>
      {step.fulfilledBy && <div className="text-[0.7rem] font-medium">{step.fulfilledBy}</div>}
    </div>
    <span className="text-[0.7rem] font-semibold">{step.completed ? "✓" : "Pending"}</span>
  </div>
);

const StatCard = ({ label, value, subtitle }) => (
  <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
    <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
    <div className="text-xl font-semibold text-slate-900">{value}</div>
    {subtitle && <div className="text-[0.65rem] text-slate-500">{subtitle}</div>}
  </div>
);

export default function CinemaMediaStudiesPlanner({ majorReq, courses }) {
  const progress = computeCamsProgress(courses, majorReq.camsStructure || {});
  const foundationComplete = progress.foundation.filter(step => step.completed).length;

  return (
    <div className="space-y-5">
      <MajorIntro majorReq={majorReq} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-2">
          <div className="text-sm font-semibold text-slate-900">Core curriculum</div>
          <div className="space-y-2">
            {progress.foundation.map(step => (
              <StepRow key={step.id} step={step} />
            ))}
          </div>
          <div className="text-[0.7rem] text-slate-500">{foundationComplete}/{progress.foundation.length || 0} completed</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-2">
          <div className="text-xs uppercase tracking-wide text-slate-500">Production experience</div>
          <p className="text-[0.7rem] text-slate-600">
            Choose one production or screenwriting course (e.g., ARTS/CAMS 138, ARTS 165/CAMS 135, CAMS 234, CAMS 208).
          </p>
          <div
            className={cx(
              "rounded-lg border px-3 py-2 text-sm font-semibold",
              progress.productionCompleted ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600"
            )}
          >
            {progress.productionCompleted ? "Production course complete" : "Production requirement pending"}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          label="Core electives"
          value={`${progress.coreMatches}/${progress.coreRequired}`}
          subtitle="Media history/theory courses"
        />
        <StatCard
          label="300-level CAMS"
          value={`${progress.level300Matches}/${progress.level300Required}`}
          subtitle="Advanced seminars taken at Wellesley"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-2">
        <div className="text-xs uppercase tracking-wide text-slate-500">Additional CAMS coursework</div>
        <p className="text-[0.7rem] text-slate-600">
          Complete one extra CAMS-coded course (core, 300-level, or approved related course). Tag requirements using the term modal.
        </p>
        <div className="text-xl font-semibold text-slate-900">
          {progress.additionalCamsMatches}/{progress.additionalCamsRequired}
        </div>
      </div>
    </div>
  );
}
