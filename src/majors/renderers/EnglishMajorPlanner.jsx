import React from "react";
import { computeEnglishProgress } from "../progress.js";
import { MajorIntro } from "./shared.jsx";

export default function EnglishMajorPlanner({ majorReq, courses }) {
  const struct = majorReq.englishStructure || {};
  const progress = computeEnglishProgress(courses, struct);

  return (
    <div className="space-y-4">
      <MajorIntro majorReq={majorReq} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Course totals</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between rounded bg-slate-50 px-2 py-1">
              <span>English dept courses</span>
              <span className="font-semibold">{progress.englishDeptCourses}/{struct.deptMinimum || 8}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Advanced coursework</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between rounded bg-slate-50 px-2 py-1">
              <span>Upper-level (200+)</span>
              <span className="font-semibold">{progress.upperLevelCourses}/{struct.upperLevelRequired || 7}</span>
            </div>
            <div className="flex items-center justify-between rounded bg-slate-50 px-2 py-1">
              <span>300-level seminars</span>
              <span className="font-semibold">{progress.level300Courses}/{struct.level300Required || 2}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-3 md:col-span-2">
          <div className="mb-2 text-sm font-medium">Distribution checkpoints</div>
          <ul className="text-xs text-slate-600 list-disc pl-5 space-y-1">
            <li>Assign courses to Postcolonial/Ethnic and Pre-1900/Pre-1800 buckets using the planner panel.</li>
            {struct.creativeWritingRequired > 0 && (
              <li>English & Creative Writing majors should mark four creative writing experiences via the same panel.</li>
            )}
            <li>Only traditional seminars count toward the two required 300-level courses.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
