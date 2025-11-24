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

export default function JewishStudiesMajorPlanner({ majorReq, courses, majorValue }) {
  const jwstCourses = courses.filter(course => 
    course.code && (
      course.code.toUpperCase().startsWith('JWST') ||
      course.code.toUpperCase().startsWith('REL') ||
      course.code.toUpperCase().startsWith('HEBR')
    )
  );
  
  const introCourse = jwstCourses.filter(course =>
    ['JWST 102', 'REL 102'].some(req => codesMatch(course.code, req))
  );

  const level300Courses = jwstCourses.filter(course => {
    const match = course.code.match(/(JWST|REL|HEBR)\s*(\d+)/);
    return match && parseInt(match[2]) >= 300;
  });

  const languageCourses = courses.filter(course => {
    const code = course.code?.toUpperCase() || '';
    return ['HEBR', 'ARAB', 'FREN', 'SPAN', 'GER'].some(lang => 
      code.startsWith(lang)
    );
  });

  const intermediateLanguageCourses = languageCourses.filter(course => {
    const match = course.code.match(/[A-Z]+\s*(\d+)/);
    return match && parseInt(match[1]) >= 200; // Intermediate level
  });

  // Concentration courses (this would ideally be tagged in course data)
  const concentrationCourses = jwstCourses.filter(course => 
    !introCourse.includes(course) &&
    !level300Courses.includes(course) &&
    course.code.match(/[A-Z]+\s*[2-3]\d{2}/) // 200 or 300 level
  );

  const crossListedCourses = courses.filter(course => {
    const title = course.title?.toLowerCase() || '';
    const code = course.code?.toLowerCase() || '';
    return ['jewish', 'israel', 'hebrew', 'holocaust', 'judaism', 'biblical'].some(keyword => 
      title.includes(keyword) || code.includes(keyword)
    );
  }).filter(course => !jwstCourses.includes(course));

  const foundationSteps = [
    {
      id: "intro-requirement",
      label: "Introduction course",
      display: "Need JWST 102 or REL 102 by end of junior year",
      completed: introCourse.length >= 1,
      fulfilledBy: introCourse.length >= 1 ? introCourse[0].code : null
    }
  ];

  const coreSteps = [
    {
      id: "level300-requirement",
      label: "300-level courses",
      display: "Need 2 advanced Jewish Studies courses",
      completed: level300Courses.length >= 2,
      fulfilledBy: level300Courses.length >= 2 ? 
        `${level300Courses.slice(0, 2).map(c => c.code).join(", ")}` : null
    },
    {
      id: "concentration-requirement",
      label: "Concentration courses",
      display: "Need 4 courses (including at least one 300-level)",
      completed: concentrationCourses.length >= 4,
      fulfilledBy: concentrationCourses.length >= 4 ? 
        `${concentrationCourses.slice(0, 4).map(c => c.code).join(", ")}` : null
    },
    {
      id: "language-requirement",
      label: "Language proficiency",
      display: "Need 2 intermediate-level language courses",
      completed: intermediateLanguageCourses.length >= 2,
      fulfilledBy: intermediateLanguageCourses.length >= 2 ? 
        `${intermediateLanguageCourses.slice(0, 2).map(c => c.code).join(", ")}` : null
    }
  ];

  return (
    <div className="space-y-5">
      <MajorIntro majorReq={majorReq} />

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <RequirementCard title="Foundation" steps={foundationSteps} />
          <RequirementCard title="Core Requirements" steps={coreSteps} />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
              Overall Progress
            </div>
            <div className="mt-1 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Total program courses
                </div>
                <p className="text-xs text-slate-500">
                  Up to 3 outside courses allowed
                </p>
              </div>
              <div className="text-xl font-semibold text-slate-900">
                {jwstCourses.length + crossListedCourses.length}/9
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 mt-2">
              <div
                className="h-full rounded-full bg-purple-500"
                style={{
                  width: `${Math.min(100, ((jwstCourses.length + crossListedCourses.length) / 9) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <div className="text-xs font-semibold text-amber-700 mb-1">Concentration Areas</div>
        <div className="text-xs text-amber-600">
          Develop concentration in areas such as: Religion, European Jewish History, American Jewish Studies, 
          Sephardic Studies, Biblical Studies, Hebrew Literature, or Israel Studies. Work with advisors to 
          design your focus area.
        </div>
      </div>
    </div>
  );
}