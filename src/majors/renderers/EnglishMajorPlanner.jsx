import React from "react";
import { computeEnglishProgress } from "../progress.js";
import { MajorIntro } from "./shared.jsx";

const StatTile = ({ label, value, subtitle }) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
    <div className="text-[0.6rem] uppercase tracking-wide text-slate-500">{label}</div>
    <div className="text-xl font-semibold text-slate-900">{value}</div>
    {subtitle && <div className="text-[0.65rem] text-slate-500">{subtitle}</div>}
  </div>
);

export default function EnglishMajorPlanner({ majorReq, courses }) {
  const struct = majorReq.englishStructure || {};
  const progress = computeEnglishProgress(courses, struct);
  const totalRequired = struct.totalRequired || 10;
  const deptMinimum = struct.deptMinimum || 8;

  const breadthHighlights = [
    { label: "Postcolonial / Ethnic literature", count: struct.postcolonialRequired || 1 },
    { label: "Pre-1900 coursework", count: struct.pre1900Required || 3 },
    { label: "Pre-1800 focus", count: struct.pre1800Required || 2 },
  ];

  return (
    <div className="space-y-5">
      <MajorIntro majorReq={majorReq} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-3">
          <div className="text-sm font-semibold text-slate-900">Department totals</div>
          <div className="grid gap-2 sm:grid-cols-2">
            <StatTile
              label="ENG-coded courses"
              value={`${progress.englishDeptCourses}/${deptMinimum}`}
              subtitle="Minimum ENG courses counted toward the major"
            />
            <StatTile
              label="Overall major plan"
              value={`${Math.min(progress.totalCourses, totalRequired)}/${totalRequired}`}
              subtitle="Total courses planned toward the 10-course expectation"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-3">
          <div className="text-sm font-semibold text-slate-900">Advanced study</div>
          <div className="grid gap-2 sm:grid-cols-2">
            <StatTile
              label="Upper-level (200+)"
              value={`${progress.upperLevelCourses}/${struct.upperLevelRequired || 7}`}
              subtitle="Courses beyond the intro level"
            />
            <StatTile
              label="300-level seminars"
              value={`${progress.level300Courses}/${struct.level300Required || 2}`}
              subtitle="Traditional seminars or thesis work"
            />
          </div>
          <p className="text-xs text-slate-500">
            Assign courses to these buckets via the Requirements dropdown in each term card.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-2">
          <div className="text-sm font-semibold text-slate-900">Breadth & historical focus</div>
          <p className="text-xs text-slate-500">
            Track breadth requirements by tagging courses with the matching requirement labels in the planner.
          </p>
          <ul className="space-y-2 text-xs">
            {breadthHighlights.map(item => (
              <li key={item.label} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-1.5">
                <span>{item.label}</span>
                <span className="text-[0.65rem] font-semibold text-slate-700">{item.count} course{item.count > 1 ? "s" : ""}</span>
              </li>
            ))}
          </ul>
        </div>

        {struct.creativeWritingRequired > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-2">
            <div className="text-sm font-semibold text-slate-900">Creative writing experiences</div>
            <p className="text-xs text-slate-500">
              English & Creative Writing majors designate {struct.creativeWritingRequired} creative writing
              courses or experiences. Use the requirement assignment panel to mark them.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-3 text-xs text-slate-600">
        <div className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500 mb-1">
          How to track progress
        </div>
        Use the “Assign requirement” selector in the term modal to tag courses as Postcolonial, Pre-1900, Pre-1800,
        or Creative Writing. Once tagged, those counts appear in the program summary at the top of the major tab.
      </div>
    </div>
  );
}
