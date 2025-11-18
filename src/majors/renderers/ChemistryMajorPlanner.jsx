import React from "react";
import { computeChemProgress } from "../progress.js";
import { MajorIntro } from "./shared.jsx";
import { cx } from "../../utils.js";

const StatCard = ({ label, value, subtitle }) => (
  <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
    <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
    <div className="text-xl font-semibold text-slate-900">{value}</div>
    {subtitle && <div className="text-[0.65rem] text-slate-500">{subtitle}</div>}
  </div>
);

const StepRow = ({ label, completed, fulfilledBy }) => (
  <div
    className={cx(
      "rounded-lg border px-3 py-1.5 text-xs",
      completed ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600"
    )}
  >
    <div className="flex items-center justify-between gap-2">
      <div>
        <div className="text-[0.6rem] uppercase tracking-wide">{label}</div>
        {fulfilledBy && <div className="text-[0.7rem] font-medium">{fulfilledBy}</div>}
      </div>
      <span className="text-[0.75rem] font-semibold">{completed ? "✓" : "Pending"}</span>
    </div>
  </div>
);

export default function ChemistryMajorPlanner({ majorReq, courses }) {
  const progress = computeChemProgress(courses, majorReq.chemStructure || {});
  const foundationComplete = progress.foundation.filter(item => item.completed).length;
  const coreComplete = progress.coreCourses.filter(item => item.completed).length;

  return (
    <div className="space-y-5">
      <MajorIntro majorReq={majorReq} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-2">
          <div className="text-sm font-semibold text-slate-900">Intro sequence</div>
          <div className="space-y-2">
            {progress.foundation.map(step => (
              <StepRow key={step.id} label={step.label} completed={step.completed} fulfilledBy={step.fulfilledBy} />
            ))}
          </div>
          <div className="text-[0.7rem] text-slate-500">
            {foundationComplete}/{progress.foundation.length || 0} completed
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-2">
          <div className="text-sm font-semibold text-slate-900">Core chemistry</div>
          <div className="grid gap-2">
            {progress.coreCourses.map(item => (
              <StepRow key={item.code} label={item.code} completed={item.completed} fulfilledBy={item.completed ? item.code : null} />
            ))}
          </div>
          <div className="text-[0.7rem] text-slate-500">{coreComplete}/{progress.coreCourses.length || 0} completed</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Depth electives" value={`${progress.electiveCount}/${progress.electiveRequired}`} subtitle="CHEM 223/341/361/334/335" />
        <StatCard label="Additional 300-level" value={`${progress.additional300Count}/${progress.additional300Required}`} subtitle="300-level CHEM (excludes research/CHEM 331)" />
        <StatCard label="Research requirement" value={progress.researchCompleted ? "✓" : "Pending"} subtitle="Independent study, thesis, or approved experience" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Physics intro" value={progress.physicsIntroMet ? "✓" : "Pending"} subtitle="PHYS 104/107 or equivalent" />
        <StatCard label="Physics II" value={progress.physicsMet ? "✓" : "Pending"} subtitle="PHYS 106/108" />
        <StatCard label="Calculus" value={progress.mathMet ? "✓" : "Pending"} subtitle="MATH 205/215" />
      </div>
    </div>
  );
}
