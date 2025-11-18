import React from "react";
import { computeBiocProgress } from "../progress.js";
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

const StatCard = ({ label, value, subtitle }) => (
  <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
    <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
    <div className="text-xl font-semibold text-slate-900">{value}</div>
    {subtitle && <div className="text-[0.65rem] text-slate-500">{subtitle}</div>}
  </div>
);

export default function BiochemistryMajorPlanner({ majorReq, courses }) {
  const struct = majorReq.biocStructure || {};
  const progress = computeBiocProgress(courses, struct);

  const bisc200Complete = progress.bisc200.filter(step => step.completed).length;
  const chem200Complete = progress.chem200.filter(step => step.completed).length;

  return (
    <div className="space-y-5">
      <MajorIntro majorReq={majorReq} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-2">
          <div className="text-sm font-semibold text-slate-900">Introductory sequence</div>
          <div className="space-y-2">
            {(progress.foundation || []).map(step => (
              <StepRow key={step.id} step={step} />
            ))}
          </div>
          <div className="text-[0.7rem] text-slate-500">
            {progress.foundation.filter(step => step.completed).length}/{progress.foundation.length || 0} completed
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-2">
          <div className="text-sm font-semibold text-slate-900">200-level core</div>
          <div className="grid gap-2">
            <div>
              <div className="text-[0.65rem] uppercase text-slate-500">BISC Core</div>
              <div className="space-y-1">
                {progress.bisc200.map(step => <StepRow key={step.id} step={step} />)}
              </div>
              <div className="text-[0.7rem] text-slate-500">{bisc200Complete}/{progress.bisc200.length || 0} completed</div>
            </div>
            <div>
              <div className="text-[0.65rem] uppercase text-slate-500">CHEM Core</div>
              <div className="space-y-1">
                {progress.chem200.map(step => <StepRow key={step.id} step={step} />)}
              </div>
              <div className="text-[0.7rem] text-slate-500">{chem200Complete}/{progress.chem200.length || 0} completed</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard label="BISC 300-level" value={`${progress.bisc300Count}/2`} subtitle="Two advanced biology units" />
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-2">
          <div className="text-xs uppercase tracking-wide text-slate-500">CHEM / BIOC 300-level</div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900">BIOC 331 / CHEM 331</span>
            <span className="text-xl font-semibold text-slate-900">{progress.chem331Completed ? "✓" : "Pending"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900">Additional 300-level</span>
            <span className="text-xl font-semibold text-slate-900">
              {progress.chem300ElectiveCount}/{progress.chem300ElectiveRequired}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          label="Lab-designated courses"
          value={`${progress.labCount}/${progress.labRequired}`}
          subtitle="Ensure ≥2 labs or combine 1 lab + approved research product"
        />
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500">Independent research option</div>
          <p className="text-[0.7rem] text-slate-600">
            Option II requires an approved research experience (BIOC 250/350, BIOC 355/360/365/370, or pre-approved MIT/Olin/WSRP research) plus a departmental research product.
          </p>
          <div className={cx(
            "mt-2 rounded border px-2 py-1 text-center text-[0.75rem] font-semibold",
            progress.researchCompleted ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600"
          )}>
            {progress.researchCompleted ? "Research credit recorded" : "Research product pending"}
          </div>
        </div>
      </div>
    </div>
  );
}
