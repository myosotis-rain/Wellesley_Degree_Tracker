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

export default function GeosciencesMajorPlanner({ majorReq, courses, majorValue }) {
  const geosCourses = courses.filter(course => 
    course.code && course.code.toUpperCase().startsWith('GEOS')
  );
  
  const core100Courses = geosCourses.filter(course =>
    ['GEOS 101', 'GEOS 102'].some(req => codesMatch(course.code, req))
  );

  const core200Courses = geosCourses.filter(course =>
    ['GEOS 200', 'GEOS 200X', 'GEOS 203'].some(req => codesMatch(course.code, req))
  );

  const level300Courses = geosCourses.filter(course => {
    const match = course.code.match(/GEOS\s*(\d+)/);
    return match && parseInt(match[1]) >= 300;
  });

  const level200ElectiveCourses = geosCourses.filter(course => {
    const match = course.code.match(/GEOS\s*(\d+)/);
    const isCore200 = ['GEOS 200', 'GEOS 200X', 'GEOS 203'].some(req => codesMatch(course.code, req));
    return match && parseInt(match[1]) >= 200 && parseInt(match[1]) < 300 && !isCore200;
  });

  // For now, we'll assume users manually track STEM cognates
  const cognateCourses = courses.filter(course => {
    const code = course.code?.toUpperCase() || '';
    return ['MATH', 'BISC', 'CHEM', 'PHYS', 'ASTR', 'CS', 'ENVS'].some(dept => 
      code.startsWith(dept)
    );
  }).filter(course => !geosCourses.includes(course));

  const coreSteps = [
    {
      id: "core100-requirement",
      label: "Core 100-level",
      display: "Need 1 from GEOS 101 or GEOS 102",
      completed: core100Courses.length >= 1,
      fulfilledBy: core100Courses.length >= 1 ? core100Courses[0].code : null
    },
    {
      id: "core200-requirement",
      label: "Core 200-level", 
      display: "Need GEOS 200/200X and GEOS 203",
      completed: core200Courses.length >= 2,
      fulfilledBy: core200Courses.length >= 2 ? 
        `${core200Courses.slice(0, 2).map(c => c.code).join(", ")}` : null
    }
  ];

  const electiveSteps = [
    {
      id: "level300-requirement",
      label: "300-level electives",
      display: "Need 3 advanced courses (one must be Wellesley 300-level with lab)",
      completed: level300Courses.length >= 3,
      fulfilledBy: level300Courses.length >= 3 ? 
        `${level300Courses.slice(0, 3).map(c => c.code).join(", ")}` : null
    },
    {
      id: "level200-requirement",
      label: "200-level electives",
      display: "Need 2 additional 200-level GEOS courses",
      completed: level200ElectiveCourses.length >= 2,
      fulfilledBy: level200ElectiveCourses.length >= 2 ? 
        `${level200ElectiveCourses.slice(0, 2).map(c => c.code).join(", ")}` : null
    },
    {
      id: "cognates-requirement",
      label: "STEM cognates",
      display: "Need 4 courses (two must be from same discipline)",
      completed: cognateCourses.length >= 4,
      fulfilledBy: cognateCourses.length >= 4 ? 
        `${cognateCourses.slice(0, 4).map(c => c.code).join(", ")}` : null
    }
  ];

  const totalGeosCoursesRequired = 8; // 3 core + 5 electives
  const totalCoursesRequired = 12; // 8 GEOS + 4 cognates

  return (
    <div className="space-y-5">
      <MajorIntro majorReq={majorReq} />

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <RequirementCard title="Core Requirements" steps={coreSteps} />
          <RequirementCard title="Electives & Cognates" steps={electiveSteps} />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
              GEOS Courses Progress
            </div>
            <div className="mt-1 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Geosciences courses
                </div>
                <p className="text-xs text-slate-500">
                  Core + electives from GEOS department
                </p>
              </div>
              <div className="text-xl font-semibold text-slate-900">
                {geosCourses.length}/{totalGeosCoursesRequired}
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 mt-2">
              <div
                className="h-full rounded-full bg-green-500"
                style={{
                  width: `${Math.min(100, (geosCourses.length / totalGeosCoursesRequired) * 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
              Overall Progress
            </div>
            <div className="mt-1 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Total major courses
                </div>
                <p className="text-xs text-slate-500">
                  GEOS + STEM cognates
                </p>
              </div>
              <div className="text-xl font-semibold text-slate-900">
                {geosCourses.length + cognateCourses.length}/{totalCoursesRequired}
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 mt-2">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{
                  width: `${Math.min(100, ((geosCourses.length + cognateCourses.length) / totalCoursesRequired) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}