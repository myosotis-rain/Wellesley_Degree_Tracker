import React from "react";
import { computeCpltProgress } from "../progress.js";
import { MajorIntro } from "./shared.jsx";

const StatCard = ({ label, value, subtitle }) => (
  <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
    <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
    <div className="text-xl font-semibold text-slate-900">{value}</div>
    {subtitle && <div className="text-[0.65rem] text-slate-500">{subtitle}</div>}
  </div>
);

const StepRow = ({ label, completed }) => (
  <div className={`rounded-lg border px-3 py-1.5 text-xs ${completed ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
    <div className="flex items-center justify-between">
      <div className="text-[0.6rem] uppercase tracking-wide">{label}</div>
      <span className="text-[0.7rem] font-semibold">{completed ? "✓" : "Pending"}</span>
    </div>
  </div>
);

export default function ComparativeLitMajorPlanner({ majorReq, courses }) {
  const progress = computeCpltProgress(courses, majorReq.cpltStructure || {});
  const requiredComplete = progress.requiredCourses.filter(r => r.completed).length;

  return (
    <div className="space-y-5">
      <MajorIntro majorReq={majorReq} />

      <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-2">
        <div className="text-sm font-semibold text-slate-900">CPLT milestones</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {progress.requiredCourses.map(req => (
            <StepRow key={req.code} label={req.code} completed={req.completed} />
          ))}
        </div>
        <div className="text-[0.7rem] text-slate-500">{requiredComplete}/{progress.requiredCourses.length || 0} required CPLT courses completed</div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="CPLT-coded courses"
          value={`${progress.cpltCount}/${progress.minCpltCourses}`}
          subtitle="At least five CPLT units overall"
        />
        <StatCard
          label="300-level CPLT"
          value={progress.cplt300Count}
          subtitle="Build advanced work in your concentration"
        />
        <StatCard
          label="Total courses in plan"
          value={`${progress.totalCourses}/${progress.totalRequired}`}
          subtitle="Nine total units required"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-1">
        <div className="text-xs uppercase tracking-wide text-slate-500">Pre-1900 + concentration</div>
        <p className="text-[0.7rem] text-slate-600">
          Include at least one course before 1900 and three thematically linked courses (one at the 300-level). Use the requirement selector in the planner modal to tag these courses for easy tracking.
        </p>
      </div>
    </div>
  );
}
