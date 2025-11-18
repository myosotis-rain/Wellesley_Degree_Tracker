import React from "react";
import { computeStudioProgress } from "../progress.js";
import { MajorIntro } from "./shared.jsx";
import { cx } from "../../utils.js";

const StepRow = ({ step }) => (
  <div
    className={cx(
      "flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs",
      step.completed
        ? "border-green-200 bg-green-50 text-green-700"
        : "border-slate-200 bg-slate-50 text-slate-600"
    )}
  >
    <div>
      <div className="text-[0.6rem] uppercase tracking-wide">{step.label}</div>
      <div className="text-[0.7rem] font-medium">
        {step.completed ? step.fulfilledBy || "Complete" : (step.options || []).join(" / ")}
      </div>
    </div>
    <span className="text-[0.7rem] font-semibold">
      {step.completed ? "✓" : "Pending"}
    </span>
  </div>
);

export default function StudioArtMajorPlanner({ majorReq, courses }) {
  const struct = majorReq.studioStructure || {};
  const progress = computeStudioProgress(courses, struct);
  const foundationComplete = (progress.foundation || []).filter(step => step.completed).length;

  return (
    <div className="space-y-5">
      <MajorIntro majorReq={majorReq} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-2">
          <div className="text-sm font-semibold text-slate-900">Foundations</div>
          <div className="space-y-2">
            {(progress.foundation || []).map(step => (
              <StepRow key={step.id} step={step} />
            ))}
          </div>
          <div className="text-[0.7rem] text-slate-500">
            {foundationComplete}/{progress.foundation?.length || 0} completed
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-2">
          <div className="text-xs uppercase tracking-wide text-slate-500">Modern/Contemporary history</div>
          <p className="text-[0.7rem] text-slate-600">
            Assign at least one art history course focused on 20th or 21st century art via the planner panel.
          </p>
          <p className="text-[0.65rem] text-slate-500">
            The requirement tracker uses the requirement tags within the term modal to confirm completion.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500">Upper-level studio</div>
          <div className="mt-1 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">200+ studio units</div>
            <div className="text-xl font-semibold text-slate-900">
              {progress.upperStudioCount}/{progress.upperStudioRequired}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500">Advanced studio</div>
          <div className="mt-1 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">300-level studio</div>
            <div className="text-xl font-semibold text-slate-900">
              {progress.level300Count}/{progress.level300Required}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-2">
          <div className="text-xs uppercase tracking-wide text-slate-500">Senior exhibition capstone</div>
          <p className="text-[0.7rem] text-slate-600">
            ARTS 317H / ARTS 318H provides the capstone overlay for the senior exhibition.
          </p>
          <div className="flex items-center gap-2 text-xs">
            {progress.capstone.map(item => (
              <div
                key={item.code}
                className={cx(
                  "flex-1 rounded border px-2 py-1 text-center",
                  item.completed ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600"
                )}
              >
                {item.code} {item.completed ? "✓" : "Pending"}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500">Exhibition prep</div>
          <p className="text-[0.7rem] text-slate-600">
            Advanced independent projects must culminate in the Jewett Arts Center galleries. Work with your advisor on scheduling the ARTS 317H/318H sequence and senior exhibition logistics.
          </p>
        </div>
      </div>
    </div>
  );
}
