import React from "react";
import { cx } from "../../utils.js";
import { computeMASProgress } from "../progress.js";
import { MajorIntro } from "./shared.jsx";

export default function MASMajorPlanner({ majorReq, courses }) {
  const {
    visualAnalysis,
    studioFoundation,
    csIntro,
    studioCore,
    csCore,
    capstone,
    additional,
    totals,
  } = computeMASProgress(courses, majorReq);

  return (
    <div className="space-y-4">
      <MajorIntro majorReq={majorReq} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Introductory Courses (3 required)</div>
          <div className="space-y-2 text-xs">
            <div className={cx(
              "p-2 rounded",
              visualAnalysis.length > 0 ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-600"
            )}>
              <div className="font-medium">Visual Analysis</div>
              <div className="text-[0.65rem]">ARTH 100/WRIT 107 or CAMS 100</div>
              {visualAnalysis.length > 0 && <div className="text-[0.6rem] mt-1">✓ {visualAnalysis[0].code}</div>}
            </div>
            <div className={cx(
              "p-2 rounded",
              studioFoundation.length > 0 ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-600"
            )}>
              <div className="font-medium">Studio Foundation</div>
              <div className="text-[0.65rem]">Any 100-level ARTS course</div>
              {studioFoundation.length > 0 && <div className="text-[0.6rem] mt-1">✓ {studioFoundation[0].code}</div>}
            </div>
            <div className={cx(
              "p-2 rounded",
              csIntro.length > 0 ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-600"
            )}>
              <div className="font-medium">Computer Science</div>
              <div className="text-[0.65rem]">Any 100-level CS course</div>
              {csIntro.length > 0 && <div className="text-[0.6rem] mt-1">✓ {csIntro[0].code}</div>}
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {(visualAnalysis.length > 0 ? 1 : 0) + (studioFoundation.length > 0 ? 1 : 0) + (csIntro.length > 0 ? 1 : 0)}/3 completed
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Core Courses (6 required)</div>
          <div className="space-y-2 text-xs">
            <div className="p-2 bg-blue-50 rounded">
              <div className="font-medium">Studio Core (3 required)</div>
              <div className="text-[0.65rem] text-slate-600">Choose from ARTS/CAMS/MUS studio courses</div>
              {studioCore.slice(0, 3).map((course, i) => (
                <div key={i} className="text-[0.6rem] text-blue-700 mt-1">✓ {course.code}</div>
              ))}
              <div className="text-[0.6rem] mt-1">{Math.min(studioCore.length, 3)}/3 completed</div>
            </div>
            <div className="p-2 bg-purple-50 rounded">
              <div className="font-medium">CS Core (3 required)</div>
              <div className="text-[0.65rem] text-slate-600">Choose from CS core courses</div>
              {csCore.slice(0, 3).map((course, i) => (
                <div key={i} className="text-[0.6rem] text-purple-700 mt-1">✓ {course.code}</div>
              ))}
              <div className="text-[0.6rem] mt-1">{Math.min(csCore.length, 3)}/3 completed</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Additional Requirements</div>
          <div className="space-y-2 text-xs">
            <div className="p-2 bg-slate-50 rounded">
              <div className="font-medium">MAS Electives (3 units)</div>
              <div className="text-[0.65rem] text-slate-600">Approved interdisciplinary courses</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {Math.min(additional.length, 3)}/3 completed
              </div>
            </div>
            <div className={cx(
              "p-2 rounded",
              capstone.length > 0 ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-600"
            )}>
              <div className="font-medium">Capstone Course</div>
              <div className="text-[0.65rem]">1 required (senior year)</div>
              {capstone.length > 0 && <div className="text-[0.6rem] mt-1">✓ {capstone[0].code}</div>}
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded border p-2 text-[0.65rem]">
                <div className="text-[0.55rem] uppercase text-slate-500">Total units</div>
                <div className="text-sm font-semibold text-slate-900">{totals.totalUnits.toFixed(1)}/12</div>
              </div>
              <div className="rounded border p-2 text-[0.65rem]">
                <div className="text-[0.55rem] uppercase text-slate-500">Courses &gt;100</div>
                <div className="text-sm font-semibold text-slate-900">{totals.upperLevelCourses}/8+</div>
              </div>
              <div className="rounded border p-2 text-[0.65rem]">
                <div className="text-[0.55rem] uppercase text-slate-500">300-level</div>
                <div className="text-sm font-semibold text-slate-900">{totals.level300Count}/2+</div>
              </div>
            </div>
            <div className="p-2 bg-orange-50 rounded">
              <div className="font-medium">Online Portfolio</div>
              <div className="text-[0.65rem]">Required senior year</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
