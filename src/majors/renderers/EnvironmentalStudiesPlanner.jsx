import React from "react";
import { computeEsProgress } from "../progress.js";
import { MajorIntro, SectionCard } from "./shared.jsx";
import { clamp01, cx } from "../../utils.js";

const RequirementRow = ({ label, completed, detail }) => (
  <div
    className={cx(
      "flex items-center justify-between rounded-lg border px-3 py-2 text-xs",
      completed
        ? "border-green-200 bg-green-50 text-green-800"
        : "border-slate-200 bg-white text-slate-600"
    )}
  >
    <div>
      <div className="text-[0.65rem] uppercase tracking-wide">{label}</div>
      {detail && <div className="text-[0.7rem] font-semibold">{detail}</div>}
    </div>
    <span className="text-[0.7rem] font-semibold">{completed ? "✓" : "Pending"}</span>
  </div>
);

const UnitsBar = ({ earned, target, label }) => {
  const pct = clamp01(target ? earned / target : 0);
  return (
    <div>
      <div className="flex items-center justify-between text-[0.7rem] text-slate-600">
        <span>{label}</span>
        <span className="text-sm font-semibold text-slate-900">
          {earned.toFixed(2)}/{target.toFixed(2)} units
        </span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-emerald-500 transition-all"
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
};

const Pill = ({ label, success }) => (
  <span
    className={cx(
      "inline-flex items-center rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide",
      success ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-50 text-slate-500 border border-slate-200"
    )}
  >
    {label}
  </span>
);

export default function EnvironmentalStudiesPlanner({ majorReq, courses }) {
  const struct = majorReq.esStructure || {};
  const progress = computeEsProgress(courses, struct);
  const coreComplete = progress.coreStatus.filter(step => step.completed).length;

  return (
    <div className="space-y-4">
      <MajorIntro majorReq={majorReq} />

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Core requirements">
          <div className="space-y-2">
            {progress.coreStatus.map(step => (
              <RequirementRow
                key={step.id}
                label={step.label}
                completed={step.completed}
                detail={step.fulfilledBy}
              />
            ))}
          </div>
          <p className="mt-2 text-[0.65rem] text-slate-500">
            {coreComplete}/{progress.coreStatus.length} core seminars complete.
            Remember: ES 102 and ES 214 (or POL2 214) are both required.
          </p>
        </SectionCard>

        <SectionCard title="Science sequence">
          <div className="space-y-2 text-[0.75rem]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[0.6rem] uppercase text-slate-500">Intro science</div>
                <div className="text-sm font-semibold text-slate-900">
                  {progress.scienceIntro?.code || "Pending"}
                </div>
              </div>
              <Pill label={progress.scienceIntro ? "Complete" : "Pending"} success={Boolean(progress.scienceIntro)} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[0.6rem] uppercase text-slate-500">Additional NPS course</div>
                <div className="text-sm font-semibold text-slate-900">
                  {progress.scienceAdditional?.code || "Pending"}
                </div>
              </div>
              <Pill label={progress.scienceAdditional ? "Complete" : "Pending"} success={Boolean(progress.scienceAdditional)} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[0.7rem] text-slate-600">Lab requirement</span>
              <Pill label={progress.scienceLabSatisfied ? "Lab satisfied" : "Need lab"} success={progress.scienceLabSatisfied} />
            </div>
          </div>
          <p className="mt-2 text-[0.65rem] text-slate-500">
            Choose at least two distinct science courses with one drawn from the introductory list. If ES 100 was taken, pair it with a course other than ES 101.
          </p>
        </SectionCard>
      </div>

      <SectionCard title="Capstone & humanities component">
        <div className="flex flex-col gap-3 text-[0.8rem] text-slate-700 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[0.6rem] uppercase text-slate-500">Capstone</div>
            <div className="text-sm font-semibold text-slate-900">
              {progress.capstoneCompleted ? progress.capstoneCourse : "Choose ES 300 or ES 399"}
            </div>
          </div>
          <Pill label={progress.capstoneCompleted ? "Capstone complete" : "Capstone pending"} success={progress.capstoneCompleted} />
          <div className="text-[0.65rem] text-slate-500">
            Track the humanities/LL/REP/ARTS ES course using the “ES Humanities” requirement tile on the planner tab.
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Electives (4.0 units minimum)">
        <div className="space-y-3">
          <UnitsBar
            earned={progress.electiveUnits}
            target={progress.electiveUnitTarget}
            label="ES electives applied"
          />
          <div className="grid gap-3 text-[0.75rem] text-slate-600 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center">
              <div className="text-[0.6rem] uppercase text-slate-500">Elective courses</div>
              <div className="text-base font-semibold text-slate-900">{progress.electiveCourseCount}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center">
              <div className="text-[0.6rem] uppercase text-slate-500">Full-unit (non-indep.)</div>
              <div className="text-base font-semibold text-slate-900">
                {progress.nonIndependentFullCount}/{progress.minFullCourses}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center">
              <div className="text-[0.6rem] uppercase text-slate-500">300-level elective</div>
              <div className="text-base font-semibold text-slate-900">
                {progress.level300Count}/{progress.level300Required}
              </div>
            </div>
          </div>
          <p className="text-[0.65rem] text-slate-500">
            Independent studies and partial-credit work can contribute to the 4-unit total, but at least two electives must be full-unit, non-independent courses, with one at the 300 level.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
