import React from "react";
import { computeMathProgress } from "../progress.js";
import { MajorIntro } from "./shared.jsx";

export default function MathMajorPlanner({ majorReq, courses }) {
  const progress = computeMathProgress(courses, majorReq.mathStructure);

  return (
    <div className="space-y-4">
      <MajorIntro majorReq={majorReq} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Calculus Foundations</div>
          <div className="space-y-1 text-xs">
            {["MATH 115", "MATH 116"].map((label, idx) => (
              <div key={label} className={`flex items-center justify-between rounded border px-2 py-1 ${
                progress.calculusCompleted[idx] ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600"
              }`}>
                <span>{label}</span>
                <span className="font-semibold">{progress.calculusCompleted[idx] ? "✓" : "Pending"}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Core Courses</div>
          <div className="text-xs text-slate-600">
            Complete {progress.coreTotal} courses from the standard sequences (MAT 205, MAT 206, etc.).
          </div>
          <div className="mt-2 text-[0.65rem] text-slate-500">
            {progress.coreCompleted}/{progress.coreTotal} recorded
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">300-level Work</div>
          <div className="text-xs text-slate-600">
            Advanced seminars or independent research courses.
          </div>
          <div className="mt-2 text-base font-semibold text-slate-900">
            {progress.level300Count}
          </div>
        </div>
      </div>
    </div>
  );
}
