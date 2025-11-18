import React from "react";
import { cx } from "../../utils.js";
import { computeAfrProgress } from "../progress.js";
import { MajorIntro } from "./shared.jsx";

export default function AfricanaMajorPlanner({ majorReq, courses }) {
  const struct = majorReq.afrStructure || {};
  const progress = computeAfrProgress(courses, struct);
  const introLabel = struct.introOptions ? struct.introOptions.join(" / ") : "AFR 105";
  const totalTarget = majorReq.unitTarget || 9;

  return (
    <div className="space-y-4">
      <MajorIntro majorReq={majorReq} />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Intro requirement</div>
          <div className="text-xs text-slate-500 mb-1">{introLabel}</div>
          <div className={cx(
            "rounded border px-3 py-2 text-center text-sm font-semibold",
            progress.introCompleted ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600"
          )}>
            {progress.introCompleted ? "Completed" : "Pending"}
          </div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">300-level seminars</div>
          <div className="rounded bg-slate-50 px-3 py-2 text-center">
            <div className="text-[0.55rem] uppercase text-slate-500">AFR seminars</div>
            <div className="text-base font-semibold text-slate-900">
              {progress.level300Count}/{progress.level300Required}
            </div>
          </div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Course count</div>
          <div className="rounded bg-slate-50 px-3 py-2 text-center">
            <div className="text-[0.55rem] uppercase text-slate-500">Units toward 9</div>
            <div className="text-base font-semibold text-slate-900">
              {progress.totalCourses}/{totalTarget}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-dashed px-3 py-2 text-xs text-slate-600">
        Africana majors must attend the Africana Studies Colloquium (The Common Experience) every semester and work with their advisor to select or design a geographic/thematic concentration.
      </div>
    </div>
  );
}
