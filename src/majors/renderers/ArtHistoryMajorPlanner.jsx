import React from "react";
import { computeArtHistoryProgress } from "../progress.js";
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

const StatCard = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
    <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
    <div className="text-xl font-semibold text-slate-900">{value}</div>
  </div>
);

export default function ArtHistoryMajorPlanner({ majorReq, courses }) {
  const progress = computeArtHistoryProgress(courses, majorReq.artHistoryStructure || {});
  const foundationComplete = (progress.foundation || []).filter(step => step.completed).length;

  const regionStats = [
    { label: "Americas", value: progress.amerCount >= 1 ? "✓" : "0/1" },
    { label: "Africa/Middle East/Europe", value: progress.emeaCount >= 1 ? "✓" : "0/1" },
    { label: "Asia", value: progress.asiaCount >= 1 ? "✓" : "0/1" },
  ];

  const periodStats = [
    { label: "Pre-1800", value: `${progress.pre1800Count}/3` },
    { label: "Post-1800", value: `${progress.post1800Count}/1` },
    { label: "300-level", value: `${progress.level300Count}/${progress.level300Required}` },
  ];

  return (
    <div className="space-y-5">
      <MajorIntro majorReq={majorReq} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-2">
          <div className="text-sm font-semibold text-slate-900">Foundations</div>
          <div className="space-y-2">
            {(progress.foundation || []).map(step => (
              <StepRow key={step.id} step={step} />
            ))}
          </div>
          <div className="text-[0.7rem] text-slate-500">
            {foundationComplete}/{progress.foundation?.length || 0} completed
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-2">
          <div className="text-sm font-semibold text-slate-900">Regional breadth</div>
          <div className="grid gap-2 sm:grid-cols-3">
            {regionStats.map(stat => (
              <StatCard key={stat.label} label={stat.label} value={stat.value} />
            ))}
          </div>
          <p className="text-[0.65rem] text-slate-500">
            Courses may not be double-counted across regions. Use the requirement assignment panel to tag each course.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-2">
          <div className="text-sm font-semibold text-slate-900">Chronological coverage</div>
          <div className="grid gap-2 sm:grid-cols-3">
            {periodStats.map(stat => (
              <StatCard key={stat.label} label={stat.label} value={stat.value} />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500">Advisor-guided concentration</div>
          <p className="text-[0.7rem] text-slate-600">
            Use remaining electives to build a field (e.g., architecture, global modern, Asian art). Discuss language preparation and study abroad with your advisor.
          </p>
        </div>
      </div>
    </div>
  );
}
