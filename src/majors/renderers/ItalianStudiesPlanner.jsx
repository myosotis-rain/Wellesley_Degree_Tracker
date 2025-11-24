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

export default function ItalianStudiesMajorPlanner({ majorReq, courses, majorValue }) {
  const italianCourses = courses.filter(course => 
    course.code && course.code.toUpperCase().startsWith('ITAS')
  );
  
  const above100Courses = italianCourses.filter(course => {
    const match = course.code.match(/ITAS\s*(\d+)/);
    return match && parseInt(match[1]) > 100;
  });

  const foundationCourses = above100Courses.filter(course =>
    ['ITAS 209', 'ITAS 210', 'ITAS 220', 'ITAS 272'].some(req => codesMatch(course.code, req))
  );

  const level300Courses = above100Courses.filter(course => {
    const match = course.code.match(/ITAS\s*(\d+)/);
    return match && parseInt(match[1]) >= 300;
  });

  const inDepartment300Courses = level300Courses.filter(course =>
    !['ITAS 350', 'ITAS 360', 'ITAS 370'].some(excluded => codesMatch(course.code, excluded))
  );

  const translationCourses = above100Courses.filter(course =>
    course.title?.toLowerCase().includes('translation') ||
    course.description?.toLowerCase().includes('taught in english')
  );

  const relatedCourses = courses.filter(course => {
    const title = course.title?.toLowerCase() || '';
    const code = course.code?.toLowerCase() || '';
    return ['italian', 'italy', 'rome', 'renaissance', 'dante', 'medieval'].some(keyword => 
      title.includes(keyword) || code.includes(keyword)
    ) && !italianCourses.includes(course);
  });

  const electives = above100Courses.filter(course =>
    !foundationCourses.includes(course) && 
    !level300Courses.includes(course)
  );

  const foundationSteps = [
    {
      id: "foundation-requirement",
      label: "Foundation course",
      display: "Need 1 from ITAS 209, 210, 220, or 272",
      completed: foundationCourses.length >= 1,
      fulfilledBy: foundationCourses.length >= 1 ? foundationCourses[0].code : null
    }
  ];

  const advancedSteps = [
    {
      id: "level300-requirement",
      label: "300-level courses",
      display: "Need 2 advanced courses in Italian Studies",
      completed: inDepartment300Courses.length >= 2,
      fulfilledBy: inDepartment300Courses.length >= 2 ? 
        `${inDepartment300Courses.slice(0, 2).map(c => c.code).join(", ")}` : null
    }
  ];

  return (
    <div className="space-y-5">
      <MajorIntro majorReq={majorReq} />

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <RequirementCard title="Foundation" steps={foundationSteps} />
          <RequirementCard title="Advanced Study" steps={advancedSteps} />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
              Overall Progress
            </div>
            <div className="mt-1 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Italian Studies courses (above 100)
                </div>
                <p className="text-xs text-slate-500">
                  One course may be outside department
                </p>
              </div>
              <div className="text-xl font-semibold text-slate-900">
                {above100Courses.length + Math.min(relatedCourses.length, 1)}/9
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 mt-2">
              <div
                className="h-full rounded-full bg-green-600"
                style={{
                  width: `${Math.min(100, ((above100Courses.length + Math.min(relatedCourses.length, 1)) / 9) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <div className="text-xs font-semibold text-amber-700 mb-1">Study Abroad</div>
        <div className="text-xs text-amber-600">
          Qualified students are encouraged to spend their junior year in Italy on the Eastern College 
          Consortium program in Bologna or another approved program. Courses in translation count toward the major.
        </div>
      </div>
    </div>
  );
}