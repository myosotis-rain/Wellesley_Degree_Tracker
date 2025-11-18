import React from "react";
import { computeAmstProgress } from "../progress.js";
import { MajorIntro } from "./shared.jsx";

export default function AmericanStudiesPlanner({ majorReq, courses }) {
  const struct = majorReq.amerStructure || {};
  const progress = computeAmstProgress(courses, struct);

  return (
    <div className="space-y-4">
      <MajorIntro majorReq={majorReq} />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Introductory requirement</div>
          <div className="rounded bg-slate-50 px-3 py-2 text-center text-sm font-semibold text-slate-900">
            {progress.introCompleted ? "Completed" : "Pending"}
          </div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Core courses</div>
          <div className="rounded bg-slate-50 px-3 py-2 text-center">
            <div className="text-[0.55rem] uppercase text-slate-500">American Studies</div>
            <div className="text-base font-semibold text-slate-900">
              {progress.coreCount}/{progress.coreRequired}
            </div>
          </div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">300-level seminars</div>
          <div className="rounded bg-slate-50 px-3 py-2 text-center">
            <div className="text-[0.55rem] uppercase text-slate-500">Upper-level</div>
            <div className="text-base font-semibold text-slate-900">
              {progress.level300Count}/{progress.level300Required}
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Electives</div>
          <div className="rounded bg-slate-50 px-3 py-2 text-center">
            <div className="text-[0.55rem] uppercase text-slate-500">Interdisciplinary</div>
            <div className="text-base font-semibold text-slate-900">
              {progress.electivesCount}/{progress.electivesRequired}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border p-3">
        <div className="mb-2 text-sm font-medium">Electives & Experiences</div>
        <p className="text-xs text-slate-600">
          Use the planner to document electives across history, politics, culture, and interdisciplinary experiences. Work with your advisor on advanced study plans and applied projects.
        </p>
      </div>
    </div>
  );
}
