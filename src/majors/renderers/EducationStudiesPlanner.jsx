import React from "react";
import { computeEducationProgress } from "../progress.js";
import { MajorIntro, SectionCard } from "./shared.jsx";
import { clamp01, cx } from "../../utils.js";

const RatioMeter = ({ label, completed, required }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-[0.7rem] text-slate-600">
      <span>{label}</span>
      <span className="text-xs font-semibold text-slate-900">{completed}/{required}</span>
    </div>
    <div className="h-1.5 rounded-full bg-slate-100">
      <div
        className="h-1.5 rounded-full bg-emerald-500 transition-all"
        style={{ width: `${clamp01(required ? completed / required : 0) * 100}%` }}
      />
    </div>
  </div>
);

const StatusBadge = ({ label, complete }) => (
  <span
    className={cx(
      "inline-flex items-center rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide",
      complete ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"
    )}
  >
    {label}
  </span>
);

export default function EducationStudiesPlanner({ majorReq, courses }) {
  const struct = majorReq.educationStructure || {};
  const progress = computeEducationProgress(courses, struct);
  const coreLabel = progress.coreFulfilledBy
    ? `${progress.coreFulfilledBy}`
    : "Need EDUC 120, 214, 215, or 216";
  const capstoneLabel = progress.capstoneFulfilledBy
    ? progress.capstoneFulfilledBy
    : "Select an EDUC 33x seminar or thesis (360/370)";

  return (
    <div className="space-y-4">
      <MajorIntro majorReq={majorReq} />

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Core foundations">
          <div className="space-y-3">
            <div>
              <div className="text-[0.55rem] uppercase tracking-wide text-slate-500">Core course</div>
              <div className="text-sm font-semibold text-slate-900">{coreLabel}</div>
            </div>
            <RatioMeter
              label="Education Research & Theory courses"
              completed={progress.researchTheoryCount}
              required={progress.researchTheoryRequired}
            />
            <p className="text-[0.65rem] text-slate-500">
              Core courses count toward this minimum of four research/theory units. Plan additional work that spans policy, pedagogy, or youth studies.
            </p>
          </div>
        </SectionCard>

        <SectionCard title="Capstone & advanced EDUC work">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[0.55rem] uppercase tracking-wide text-slate-500">Capstone experience</div>
                <div className="text-sm font-semibold text-slate-900">{capstoneLabel}</div>
              </div>
              <StatusBadge label={progress.capstoneCompleted ? "Complete" : "Pending"} complete={progress.capstoneCompleted} />
            </div>
            <RatioMeter
              label="EDUC 300-level courses"
              completed={progress.education300Count}
              required={progress.education300Required}
            />
            <p className="text-[0.65rem] text-slate-500">
              Count only EDUC-prefixed 300-level work (capstones, methods, or thesis units). Aim for at least two distinct seminars.
            </p>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Curriculum & electives">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[0.65rem] text-slate-600">
                Curriculum & Teaching (max {progress.curriculumMax})
              </span>
              <span className="text-sm font-semibold text-slate-900">{progress.curriculumCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[0.65rem] text-slate-600">
                Education Electives (max {progress.electiveMax})
              </span>
              <span className="text-sm font-semibold text-slate-900">{progress.electiveCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[0.65rem] text-slate-600">Independent study credit</span>
              <span className="text-sm font-semibold text-slate-900">
                {progress.independentStudyCount}/{progress.independentStudyLimit}
              </span>
            </div>
            <p className="text-[0.65rem] text-slate-500">
              Up to three curriculum courses (EDUC 300/303/325) and three interdisciplinary electives may count with advisor approval. Only one unit of EDUC 250/350-level independent study applies.
            </p>
          </div>
        </SectionCard>

        <SectionCard title="Major footprint">
          <div className="space-y-3">
            <RatioMeter
              label="Education Studies units applied"
              completed={progress.totalCourses}
              required={progress.totalRequired}
            />
            <div className="flex items-center justify-between text-[0.7rem] text-slate-600">
              <span>EDUC-prefixed courses</span>
              <span className="text-sm font-semibold text-slate-900">{progress.educationDeptCount}</span>
            </div>
            <p className="text-[0.65rem] text-slate-500">
              A minimum of nine units is required, including at least six taken at Wellesley. Track MIT/off-campus work with your advisor and confirm how it fits the plan.
            </p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
