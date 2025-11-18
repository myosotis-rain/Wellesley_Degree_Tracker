import React from "react";
import { computeChphProgress } from "../progress.js";
import { MajorIntro } from "./shared.jsx";
import { cx } from "../../utils.js";

const StatCard = ({ label, value, subtitle }) => (
  <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
    <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
    <div className="text-xl font-semibold text-slate-900">{value}</div>
    {subtitle && <div className="text-[0.65rem] text-slate-500">{subtitle}</div>}
  </div>
);

const StepRow = ({ label, completed, fulfilledBy }) => (
  <div
    className={cx(
      "rounded-lg border px-3 py-1.5 text-xs",
      completed ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600"
    )}
  >
    <div className="flex items-center justify-between gap-2">
      <div>
        <div className="text-[0.6rem] uppercase tracking-wide">{label}</div>
        {fulfilledBy && <div className="text-[0.7rem] font-medium">{fulfilledBy}</div>}
      </div>
      <span className="text-[0.75rem] font-semibold">{completed ? "✓" : "Pending"}</span>
    </div>
  </div>
);

export default function ChemicalPhysicsMajorPlanner({ majorReq, courses }) {
  const progress = computeChphProgress(courses, majorReq.chphStructure || {});
  const requiredComplete = progress.requiredCourses.filter(item => item.completed).length;
  const totalRequired = progress.requiredCourses.length;

  return (
    <div className="space-y-5">
      <MajorIntro majorReq={majorReq} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-2">
          <div className="text-sm font-semibold text-slate-900">General Chemistry</div>
          <p className="text-[0.7rem] text-slate-600">
            Satisfied by CHEM 120 or by completing the CHEM 105/105P/116 + CHEM 205 sequence.
          </p>
          <div
            className={cx(
              "rounded-lg border px-3 py-2 text-sm font-semibold",
              progress.generalChem.completed
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-slate-200 bg-slate-50 text-slate-600"
            )}
          >
            {progress.generalChem.completed ? "Requirement met" : "Still needs CHEM 120 or CHEM 105 + 205"}
          </div>
        </div>

        <StatCard
          label="Intro physics"
          value={`${progress.physicsIntroCount}/${progress.physicsIntroTotal}`}
          subtitle="PHYS 107 + PHYS 108"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-2">
        <div className="text-sm font-semibold text-slate-900">Core sequence</div>
        <div className="grid gap-2 lg:grid-cols-2">
          {progress.requiredCourses.map(item => (
            <StepRow key={item.code} label={item.code} completed={item.completed} fulfilledBy={item.completed ? item.code : null} />
          ))}
        </div>
        <div className="text-[0.7rem] text-slate-500">{requiredComplete}/{totalRequired} completed</div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-2">
          <div className="text-xs uppercase tracking-wide text-slate-500">Advanced labs</div>
          {(progress.labChoice || []).map(item => (
            <StepRow
              key={item.id}
              label={item.label}
              completed={item.completed}
              fulfilledBy={item.fulfilledBy}
            />
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-2">
          <div className="text-xs uppercase tracking-wide text-slate-500">Chemistry & physics electives</div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900">CHEM 334 / CHEM 335</span>
            <span className="text-xl font-semibold text-slate-900">
              {progress.chemAdvancedCompleted ? "✓" : "Pending"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900">Advanced PHYS elective</span>
            <span className="text-xl font-semibold text-slate-900">
              {progress.physicsElectiveCompleted ? "✓" : "Pending"}
            </span>
          </div>
          <p className="text-[0.65rem] text-slate-500">
            Choose one upper-level physics course (quantum/statistical/electromagnetic theory, experimental physics, or materials) to tailor the degree toward theory or lab focus.
          </p>
        </div>
      </div>
    </div>
  );
}
