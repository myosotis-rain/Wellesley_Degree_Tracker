import React from "react";
import { computeDsProgress } from "../progress.js";
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

export default function DataScienceMajorPlanner({ majorReq, courses }) {
  const progress = computeDsProgress(courses, majorReq.dsStructure || {});
  const foundationComplete = progress.foundation.filter(step => step.completed).length;

  return (
    <div className="space-y-5">
      <MajorIntro majorReq={majorReq} />

      <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-2">
        <div className="text-sm font-semibold text-slate-900">Foundational sequence</div>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          {progress.foundation.map(step => (
            <StepRow key={step.id} step={step} />
          ))}
        </div>
        <div className="text-[0.7rem] text-slate-500">{foundationComplete}/{progress.foundation.length || 0} completed</div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm text-center">
          <div className="text-xs uppercase tracking-wide text-slate-500">CS electives</div>
          <div className="text-xl font-semibold text-slate-900">{progress.csElectiveCount}/1</div>
          <p className="text-[0.65rem] text-slate-500">Choose at least one advanced CS elective.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm text-center">
          <div className="text-xs uppercase tracking-wide text-slate-500">Statistics electives</div>
          <div className="text-xl font-semibold text-slate-900">{progress.statElectiveCount}/1</div>
          <p className="text-[0.65rem] text-slate-500">Choose at least one advanced STAT elective.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm text-center">
          <div className="text-xs uppercase tracking-wide text-slate-500">Capstone / Thesis</div>
          <div className="text-xl font-semibold text-slate-900">{progress.hasCapstone ? "✓" : "Pending"}</div>
          <p className="text-[0.65rem] text-slate-500">Complete DS 340H or DS 360/370.</p>
        </div>
      </div>
    </div>
  );
}
