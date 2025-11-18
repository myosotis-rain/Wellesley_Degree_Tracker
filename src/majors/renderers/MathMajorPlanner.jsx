import React from "react";
import { computeMathProgress } from "../progress.js";
import { MajorIntro } from "./shared.jsx";
import { cx } from "../../utils.js";

const statusClasses = (complete) =>
  complete
    ? "border-green-200 bg-green-50 text-green-700"
    : "border-slate-200 bg-slate-50 text-slate-600";

const RequirementList = ({ title, steps = [] }) => (
  <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-2">
    <div className="text-sm font-semibold text-slate-900">{title}</div>
    {steps.length === 0 ? (
      <p className="text-xs text-slate-500">Track completion using the requirement tags in the planner.</p>
    ) : (
      <div className="space-y-2 text-xs">
        {steps.map(step => (
          <div
            key={step.code}
            className={cx(
              "flex items-center justify-between rounded-lg border px-3 py-1.5",
              statusClasses(step.completed)
            )}
          >
            <span>{step.code}</span>
            <span className="font-semibold text-[0.7rem]">
              {step.completed ? "✓" : "Pending"}
            </span>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default function MathMajorPlanner({ majorReq, courses }) {
  const struct = majorReq.mathStructure || {};
  const progress = computeMathProgress(courses, struct);

  const calculusSteps = progress.calculusStatus || [];
  const coreSteps = progress.coreStatus || [];
  const seminarSteps = progress.seminarStatus || [];
  const level300Target = struct.additional300Required || progress.additional300Required || 2;
  const advancedTarget = progress.advancedTotalRequired || struct.advancedTotalRequired || 8;

  return (
    <div className="space-y-5">
      <MajorIntro majorReq={majorReq} />

      <div className="grid gap-4 md:grid-cols-2">
        <RequirementList title="Calculus sequence" steps={calculusSteps} />
        <RequirementList title="Linear algebra & core analysis" steps={coreSteps} />
        {seminarSteps.length > 0 && (
          <RequirementList title="Upper-level algebra / analysis" steps={seminarSteps} />
        )}

        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm flex flex-col gap-3">
          <div className="text-sm font-semibold text-slate-900">Upper-level math work</div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 flex items-center justify-between">
            <div>
              <div className="text-[0.6rem] uppercase tracking-wide text-slate-500">300-level MATH</div>
              <div className="text-xs text-slate-600">Two distinct seminars or advanced electives.</div>
            </div>
            <div className="text-xl font-semibold text-slate-900">
              {progress.level300Count}/{level300Target}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-[0.7rem] text-slate-600 mb-1">
              <span>Advanced MATH/STAT coursework</span>
              <span className="font-semibold text-slate-900">
                {progress.advancedCourses}/{advancedTarget}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{
                  width: `${Math.min(
                    100,
                    (progress.advancedCourses / Math.max(advancedTarget, 1)) * 100
                  )}%`,
                }}
              />
            </div>
            <p className="mt-1 text-[0.65rem] text-slate-500">
              Counts 200+ level Mathematics or Statistics courses (excluding independent study numbers such as MATH 350/360/370).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
