import React from "react";
import { computeEconProgress } from "../progress.js";
import { MajorIntro } from "./shared.jsx";
import { cx } from "../../utils.js";

const statusColors = (done) =>
  done
    ? "border-green-200 bg-green-50 text-green-700"
    : "border-slate-200 bg-slate-50 text-slate-600";

const StepRow = ({ step }) => (
  <div
    className={cx(
      "flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs",
      statusColors(step.completed)
    )}
  >
    <div className="pr-3">
      <div className="text-[0.6rem] uppercase tracking-wide">{step.label}</div>
      <div className="text-[0.7rem] font-medium">
        {step.completed ? step.fulfilledBy || "Complete" : step.display}
      </div>
      {step.altFulfilledBy && (
        <div className="text-[0.6rem] text-emerald-700">
          Counts via {step.altFulfilledBy}
        </div>
      )}
    </div>
    <span className="text-[0.7rem] font-semibold">
      {step.completed ? "✓" : "Pending"}
    </span>
  </div>
);

const SequenceCard = ({ title, steps }) => (
  <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-2">
    <div className="text-sm font-semibold text-slate-900">{title}</div>
    <div className="space-y-2">
      {steps.map((step) => (
        <StepRow key={step.id} step={step} />
      ))}
    </div>
  </div>
);

export default function EconMajorPlanner({ majorReq, courses }) {
  const progress = computeEconProgress(courses, majorReq.econStructure);
  const totalRequired = majorReq.econStructure?.totalCoursesRequired || 9;
  const orderedSequenceIds = ["micro-sequence", "macro-sequence", "stats-sequence"];
  const sequenceMap = Object.fromEntries(
    (progress.sequences || []).map((sequence) => [sequence.id, sequence])
  );
  const orderedSequences = orderedSequenceIds
    .map((id) => sequenceMap[id])
    .filter(Boolean);
  const additionalSequences = (progress.sequences || []).filter(
    (sequence) => !orderedSequenceIds.includes(sequence.id)
  );

  return (
    <div className="space-y-5">
      <MajorIntro majorReq={majorReq} />

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          {orderedSequences.map((sequence) => (
            <SequenceCard
              key={sequence.id}
              title={sequence.title}
              steps={sequence.steps}
            />
          ))}
          {additionalSequences.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {additionalSequences.map((sequence) => (
                <SequenceCard
                  key={sequence.id}
                  title={sequence.title}
                  steps={sequence.steps}
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {majorReq.econStructure.mathPrereq && (
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                Calculus prerequisite
              </div>
              <div
                className={cx(
                  "rounded-lg border px-3 py-2 text-sm font-medium",
                  statusColors(progress.mathPrereqCompleted)
                )}
              >
                {majorReq.econStructure.mathPrereq}{" "}
                {progress.mathPrereqCompleted ? "completed" : "required"}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-2">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              300-level ECON
            </div>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Upper-level seminars
                </div>
                <p className="text-xs text-slate-500">
                  Need {progress.level300Required} courses on campus.
                </p>
              </div>
            <div className="text-xl font-semibold text-slate-900">
              {progress.level300Count}/{progress.level300Required}
            </div>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{
                  width: `${Math.min(
                    100,
                    (progress.level300Count / (progress.level300Required || 1)) * 100
                  )}%`,
                }}
              />
            </div>
          </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Overall ECON units
          </div>
          <div className="mt-1 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  ECON courses in plan
                </div>
                <p className="text-xs text-slate-500">
                  Includes electives (QR/STAT substitutions count toward the 9-unit total).
                </p>
              </div>
              <div className="text-xl font-semibold text-slate-900">
                {Math.min(progress.econCourseCount, totalRequired)}/{totalRequired}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Department electives
          </div>
          <div className="mt-1 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">Elective slots</div>
              <p className="text-xs text-slate-500">
                Includes ECON electives or approved QR/STAT substitutions.
              </p>
            </div>
            <div className="text-xl font-semibold text-slate-900">
              {Math.min(progress.electiveCount, progress.electiveRequired)}/{progress.electiveRequired}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
