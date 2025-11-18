import React from "react";
import { cx } from "../../utils.js";
import { computeAnthroProgress } from "../progress.js";
import { MajorIntro } from "./shared.jsx";

export default function AnthroMajorPlanner({ majorReq, courses }) {
  const progress = computeAnthroProgress(courses, majorReq.anthroStructure, false);

  return (
    <div className="space-y-4">
      <MajorIntro majorReq={majorReq} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Introductory Courses</div>
          <div className="space-y-2 text-xs">
            <div className={cx("flex items-center justify-between rounded border px-2 py-1", progress.introPrimary ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600") }>
              <span>ANTH 101</span>
              <span className="font-semibold">{progress.introPrimary ? "Completed" : "Pending"}</span>
            </div>
            <div className={cx("flex items-center justify-between rounded border px-2 py-1", progress.introSecondary ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600") }>
              <span>ANTH 102 or ANTH/CLCV 103</span>
              <span className="font-semibold">{progress.introSecondary ? "Completed" : "Pending"}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Core Seminars</div>
          <div className="space-y-2 text-xs">
            <div className={cx("flex items-center justify-between rounded border px-2 py-1", progress.midCourse ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600") }>
              <span>ANTH 205</span>
              <span className="font-semibold">{progress.midCourse ? "✓" : ""}</span>
            </div>
            <div className={cx("flex items-center justify-between rounded border px-2 py-1", progress.seminar ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600") }>
              <span>ANTH 301</span>
              <span className="font-semibold">{progress.seminar ? "✓" : ""}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Advanced & Electives</div>
          <div className="space-y-2 text-xs">
            <div className="rounded bg-slate-50 px-3 py-2 flex items-center justify-between">
              <div>
                <div className="text-[0.55rem] uppercase text-slate-500">Additional 300-level ANTH</div>
                <div>Beyond ANTH 301</div>
              </div>
              <div className="text-base font-semibold text-slate-900">
                {progress.extra300Count}/{progress.extra300Required}
              </div>
            </div>
            <div className="rounded bg-slate-50 px-3 py-2 flex items-center justify-between">
              <div>
                <div className="text-[0.55rem] uppercase text-slate-500">Anthropology Electives</div>
                <div>Upper-level courses to reach 9 units</div>
              </div>
              <div className="text-base font-semibold text-slate-900">
                {progress.electivesCompleted}/{progress.electivesRequired}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Beyond the classroom</div>
          <p className="text-xs text-slate-600">
            Document a significant academic experience (study abroad, internship, field school, research, etc.). Track completion in your planner settings.
          </p>
        </div>
      </div>
    </div>
  );
}
