import React from "react";
import { computeEconProgress } from "../progress.js";
import { MajorIntro } from "./shared.jsx";
import { cx } from "../../utils.js";

export default function EconMajorPlanner({ majorReq, courses }) {
  const progress = computeEconProgress(courses, majorReq.econStructure);

  return (
    <div className="space-y-4">
      <MajorIntro majorReq={majorReq} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Core Sequence</div>
          <div className="space-y-1 text-xs">
            {(majorReq.econStructure.coreCourses || []).map(course => {
              const completed = progress.coreCompleted.includes(course);
              return (
                <div key={course} className={cx(
                  "flex items-center justify-between rounded border px-2 py-1",
                  completed ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600"
                )}>
                  <span>{course}</span>
                  <span className="font-semibold">{completed ? "✓" : "Pending"}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Econometrics</div>
          <div className={cx(
            "rounded px-3 py-2 text-center",
            progress.econometrics ? "bg-green-50 text-green-700" : "bg-slate-50 text-slate-600"
          )}>
            ECON 203 requirement {progress.econometrics ? "completed" : "pending"}
          </div>
        </div>

        <div className="rounded-lg border p-3 md:col-span-2">
          <div className="mb-2 text-sm font-medium">300-level ECON</div>
          <div className="rounded bg-slate-50 px-3 py-2 flex items-center justify-between">
            <div>
              <div className="text-[0.55rem] uppercase text-slate-500">Upper-level electives</div>
              <div>Progress toward seminar requirements</div>
            </div>
            <div className="text-base font-semibold text-slate-900">
              {progress.level300Count}/{progress.level300Required}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
