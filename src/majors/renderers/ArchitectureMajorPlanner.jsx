import React from "react";
import { computeArchProgress } from "../progress.js";
import { MajorIntro } from "./shared.jsx";
import { cx } from "../../utils.js";

const StepRow = ({ step }) => (
  <div
    className={cx(
      "flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs",
      step.completed
        ? "border-green-200 bg-green-50 text-green-700"
        : "border-slate-200 bg-slate-50 text-slate-600"
    )}
  >
    <div>
      <div className="text-[0.6rem] uppercase tracking-wide">{step.label}</div>
      <div className="text-[0.7rem] font-medium">
        {step.completed ? step.fulfilledBy || "Complete" : (step.options || []).join(" / ")}
      </div>
    </div>
    <span className="text-[0.7rem] font-semibold">
      {step.completed ? "✓" : "Pending"}
    </span>
  </div>
);

export default function ArchitectureMajorPlanner({ majorReq, courses }) {
  const struct = majorReq.archStructure || {};
  const progress = computeArchProgress(courses, struct);
  const foundationComplete = (progress.foundation || []).filter(step => step.completed).length;

  return (
    <div className="space-y-5">
      <MajorIntro majorReq={majorReq} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-2">
          <div className="text-sm font-semibold text-slate-900">Foundation sequence</div>
          <div className="space-y-2">
            {(progress.foundation || []).map(step => (
              <StepRow key={step.id} step={step} />
            ))}
          </div>
          <div className="text-[0.7rem] text-slate-500">
            {foundationComplete}/{progress.foundation?.length || 0} completed
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-slate-500">Intermediate studio / history</div>
            <div className="mt-1 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">200-level courses</div>
              <div className="text-xl font-semibold text-slate-900">
                {progress.intermediateCount}/{progress.intermediateRequired}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-1">
            <div className="text-xs uppercase tracking-wide text-slate-500">Advanced studio / history</div>
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">300-level courses</div>
              <div className="text-xl font-semibold text-slate-900">
                {progress.advancedCount}/{progress.advancedRequired}
              </div>
            </div>
            <p className="text-[0.65rem] text-slate-500">
              At least one advanced unit must be taken in the Department of Art at Wellesley.
              Currently tracking {progress.advancedWellesleyCount} in-department unit{progress.advancedWellesleyCount === 1 ? "" : "s"}.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500">Allied electives</div>
          <div className="mt-1 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">Related disciplines</div>
            <div className="text-xl font-semibold text-slate-900">
              {progress.additionalCount}/{progress.additionalRequired}
            </div>
          </div>
          <p className="text-[0.65rem] text-slate-500 mt-1">
            Sociology, Anthropology, Philosophy, WGST, MIT/Olin design courses, and other approved departments may count with advisor approval.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-2">
          <div className="text-xs uppercase tracking-wide text-slate-500">Total architecture units</div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">Plan progress</div>
              <p className="text-xs text-slate-500">Target of {progress.totalUnitsRequired} units</p>
            </div>
            <div className="text-xl font-semibold text-slate-900">
              {progress.totalUnits.toFixed(1)}/{progress.totalUnitsRequired}
            </div>
          </div>
          <p className="text-[0.65rem] text-slate-500">
            No more than three transfer/MIT units apply (two 200-level + one 300-level at MIT). Consult your advisor when planning study away or MIT/Olin coursework.
          </p>
        </div>
      </div>
    </div>
  );
}
