import React from "react";
import { codesMatch, cx } from "../../utils.js";
import { MajorIntro } from "./shared.jsx";

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
    </div>
    <span className="text-[0.7rem] font-semibold">
      {step.completed ? "✓" : "Pending"}
    </span>
  </div>
);

const RequirementCard = ({ title, steps }) => (
  <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-2">
    <div className="text-sm font-semibold text-slate-900">{title}</div>
    <div className="space-y-2">
      {steps.map((step) => (
        <StepRow key={step.id} step={step} />
      ))}
    </div>
  </div>
);

export default function FrenchCulturalStudiesPlanner({ majorReq, courses, majorValue }) {
  const frenchCourses = courses.filter(course => 
    course.code && (
      course.code.toUpperCase().startsWith('FREN') ||
      course.code.toUpperCase().startsWith('FRST')
    )
  );
  
  const above201Courses = frenchCourses.filter(course => {
    const match = course.code.match(/(FREN|FRST)\s*(\d+)/);
    return match && parseInt(match[2]) > 201;
  });

  const fren207Course = frenchCourses.filter(course =>
    codesMatch(course.code, 'FREN 207')
  );

  const foundationCourses = frenchCourses.filter(course =>
    ['FREN 210', 'FREN 211', 'FREN 212'].some(req => codesMatch(course.code, req))
  );

  const level300Courses = above201Courses.filter(course => {
    const match = course.code.match(/(FREN|FRST)\s*(\d+)/);
    return match && parseInt(match[2]) >= 300;
  });

  const otherDepartmentCourses = courses.filter(course => {
    const title = course.title?.toLowerCase() || '';
    const code = course.code?.toLowerCase() || '';
    return [
      'french', 'france', 'francophone', 'paris', 'quebec', 'senegal', 'morocco', 'algeria',
      'african', 'art', 'history', 'music', 'politics'
    ].some(keyword => 
      title.includes(keyword) || code.includes(keyword)
    ) && !frenchCourses.includes(course);
  });

  const foundationSteps = [
    {
      id: "fren207-requirement",
      label: "FREN 207",
      display: "Required cultural studies course",
      completed: fren207Course.length >= 1,
      fulfilledBy: fren207Course.length >= 1 ? fren207Course[0].code : null
    },
    {
      id: "foundation-requirement",
      label: "Foundation course",
      display: "Need 1 from FREN 210, 211, or 212",
      completed: foundationCourses.length >= 1,
      fulfilledBy: foundationCourses.length >= 1 ? foundationCourses[0].code : null
    }
  ];

  const advancedSteps = [
    {
      id: "french-advanced-requirement",
      label: "300-level French",
      display: "Need 2 advanced French courses",
      completed: level300Courses.length >= 2,
      fulfilledBy: level300Courses.length >= 2 ? 
        `${level300Courses.slice(0, 2).map(c => c.code).join(", ")}` : null
    },
    {
      id: "other-dept-requirement", 
      label: "Other department courses",
      display: "Need 4 related courses from other departments",
      completed: otherDepartmentCourses.length >= 4,
      fulfilledBy: otherDepartmentCourses.length >= 4 ? 
        `${otherDepartmentCourses.slice(0, 4).map(c => c.code).join(", ")}` : null
    }
  ];

  return (
    <div className="space-y-5">
      <MajorIntro majorReq={majorReq} />

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <div className="text-sm font-semibold text-amber-700 mb-1">Interdepartmental Major</div>
        <div className="text-xs text-amber-600">
          This major combines French language and culture with courses from Africana Studies, Art, History, 
          Music, Political Science, and other departments. Work with two advisors (one from French, one from another area).
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <RequirementCard title="French Foundation" steps={foundationSteps} />
          <RequirementCard title="Advanced & Interdisciplinary Study" steps={advancedSteps} />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
              French Units Progress
            </div>
            <div className="mt-1 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  French courses (above FREN 201)
                </div>
                <p className="text-xs text-slate-500">
                  French department component
                </p>
              </div>
              <div className="text-xl font-semibold text-slate-900">
                {above201Courses.length}/4
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 mt-2">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{
                  width: `${Math.min(100, (above201Courses.length / 4) * 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
              Overall Program
            </div>
            <div className="mt-1 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Total interdisciplinary program
                </div>
                <p className="text-xs text-slate-500">
                  French + other departments
                </p>
              </div>
              <div className="text-xl font-semibold text-slate-900">
                {above201Courses.length + otherDepartmentCourses.length}/8
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 mt-2">
              <div
                className="h-full rounded-full bg-purple-500"
                style={{
                  width: `${Math.min(100, ((above201Courses.length + otherDepartmentCourses.length) / 8) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}