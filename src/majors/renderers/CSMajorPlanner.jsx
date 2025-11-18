import React from "react";
import { cx } from "../../utils.js";
import { computeCSProgress } from "../progress.js";
import { MajorIntro } from "./shared.jsx";

export default function CSMajorPlanner({ majorReq, courses }) {
  const progress = computeCSProgress(courses, majorReq.csStructure);
  const totalCore = progress.coreGroups.length;
  const completedCore = progress.coreGroups.filter(group => group.completed).length;
  const introLabel = majorReq.csStructure.introOptions?.join(", ") || "Intro courses";

  return (
    <div className="space-y-4">
      <MajorIntro majorReq={majorReq} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Foundation & Core</div>
          <div className="space-y-2 text-xs">
            <div className={cx(
              "flex items-center justify-between rounded border px-2 py-1",
              progress.introCompleted ? "border-green-200 bg-green-50 text-green-800" : "border-slate-200 bg-slate-50 text-slate-600"
            )}>
              <span>Intro sequence ({introLabel})</span>
              <span className="font-semibold">{progress.introCompleted ? "✓" : "0/1"}</span>
            </div>
            <div className="rounded border border-slate-200 bg-slate-50 p-2">
              <div className="mb-1 text-[0.7rem] font-semibold text-slate-700">200-level core at Wellesley</div>
              <div className="text-[0.65rem] text-slate-500 mb-2">Completion required for CS 230/231/235/240 family.</div>
              <div className="space-y-1 text-[0.65rem]">
                {majorReq.csStructure.coreGroups.map((group, idx) => {
                  const completed = progress.coreGroups[idx]?.completed;
                  return (
                    <div key={group.id} className="flex items-center justify-between rounded bg-white px-2 py-1">
                      <span>{group.label}</span>
                      <span className={completed ? "text-green-600" : "text-slate-400"}>
                        {completed ? "✓" : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 text-[0.65rem] text-slate-600">
                {completedCore}/{totalCore} core groups complete
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Advanced CS work</div>
          <div className="space-y-2 text-xs">
            <div className="rounded bg-slate-50 px-3 py-2 flex items-center justify-between">
              <div>
                <div className="text-[0.55rem] uppercase text-slate-500">300-level CS</div>
                <div>Two distinct 300-level courses</div>
              </div>
              <div className="text-base font-semibold text-slate-900">
                {progress.level300Count}/{progress.level300Required}
              </div>
            </div>
            <div className="rounded bg-slate-50 px-3 py-2 flex items-center justify-between">
              <div>
                <div className="text-[0.55rem] uppercase text-slate-500">Additional CS electives</div>
                <div>200+ level courses beyond the core</div>
              </div>
              <div className="text-base font-semibold text-slate-900">
                {progress.electivesCount}/{progress.electivesRequired}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-3 md:col-span-2">
          <div className="mb-2 text-sm font-medium">Supporting mathematics</div>
          <div className="flex items-center justify-between rounded border px-3 py-2 text-xs">
            <div>
              <div className="text-[0.55rem] uppercase text-slate-500">Required</div>
              <div>MATH 225 (Combinatorics and Graph Theory)</div>
            </div>
            <div className={progress.mathSatisfied ? "text-green-600 font-semibold" : "text-slate-500 font-semibold"}>
              {progress.mathSatisfied ? "Completed" : "Pending"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
