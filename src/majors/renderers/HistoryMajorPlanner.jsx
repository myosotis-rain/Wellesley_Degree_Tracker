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

export default function HistoryMajorPlanner({ majorReq, courses, majorValue }) {
  const histCourses = courses.filter(course => 
    course.code && course.code.toUpperCase().startsWith('HIST')
  );
  
  const level300Courses = histCourses.filter(course => {
    const match = course.code.match(/HIST\s*(\d+)/);
    return match && parseInt(match[1]) >= 300;
  });

  const seminarCourses = level300Courses.filter(course => 
    course.title?.toLowerCase().includes('seminar') || 
    course.code?.match(/HIST\s*3\d{2}/) // Most 300-level courses could be seminars
  );

  // These would ideally be tagged in the course data
  const nonWesternCourses = histCourses.filter(course => {
    const title = course.title?.toLowerCase() || '';
    const code = course.code?.toLowerCase() || '';
    return ['africa', 'china', 'japan', 'asia', 'middle east', 'latin america', 'india'].some(region => 
      title.includes(region) || code.includes(region)
    );
  });

  const westernCourses = histCourses.filter(course => {
    const title = course.title?.toLowerCase() || '';
    const code = course.code?.toLowerCase() || '';
    return ['europe', 'america', 'russia', 'britain', 'france', 'germany'].some(region => 
      title.includes(region) || code.includes(region)
    );
  });

  const premodernCourses = histCourses.filter(course => {
    const title = course.title?.toLowerCase() || '';
    const code = course.code?.toLowerCase() || '';
    return ['medieval', 'ancient', 'classical', 'renaissance', 'early modern'].some(period => 
      title.includes(period) || code.includes(period)
    ) || course.code?.match(/HIST\s*[12]\d{2}/) // Lower numbered courses often premodern
  });

  const electives = histCourses.filter(course => 
    !level300Courses.includes(course)
  );

  const advancedSteps = [
    {
      id: "level300-requirement",
      label: "300-level courses",
      display: "Need 2 advanced courses (at least one must be a seminar)",
      completed: level300Courses.length >= 2 && seminarCourses.length >= 1,
      fulfilledBy: level300Courses.length >= 2 && seminarCourses.length >= 1 ? 
        `${level300Courses.slice(0, 2).map(c => c.code).join(", ")}` : null
    }
  ];

  const breadthSteps = [
    {
      id: "nonwestern-requirement",
      label: "Non-Western history",
      display: "Need 1 course: Africa, Asia, Latin America, Middle East",
      completed: nonWesternCourses.length >= 1,
      fulfilledBy: nonWesternCourses.length >= 1 ? nonWesternCourses[0].code : null
    },
    {
      id: "western-requirement",
      label: "Western history",
      display: "Need 1 course: Europe, United States, Russia",
      completed: westernCourses.length >= 1,
      fulfilledBy: westernCourses.length >= 1 ? westernCourses[0].code : null
    },
    {
      id: "premodern-requirement",
      label: "Premodern history",
      display: "Need 1 course before modern era",
      completed: premodernCourses.length >= 1,
      fulfilledBy: premodernCourses.length >= 1 ? premodernCourses[0].code : null
    }
  ];

  return (
    <div className="space-y-5">
      <MajorIntro majorReq={majorReq} />

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <RequirementCard title="Advanced Study" steps={advancedSteps} />
          <RequirementCard title="Geographic & Temporal Breadth" steps={breadthSteps} />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
              Overall Progress
            </div>
            <div className="mt-1 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Total history courses
                </div>
                <p className="text-xs text-slate-500">
                  Seven must be taken at Wellesley
                </p>
              </div>
              <div className="text-xl font-semibold text-slate-900">
                {histCourses.length}/9
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 mt-2">
              <div
                className="h-full rounded-full bg-red-500"
                style={{
                  width: `${Math.min(100, (histCourses.length / 9) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <div className="text-xs font-semibold text-amber-700 mb-1">Program Design</div>
        <div className="text-xs text-amber-600">
          History majors have great latitude in designing their program. Consider focusing on a geographical area, 
          time period, historical approach, or specific theme. Seven of nine units must be taken at Wellesley.
        </div>
      </div>
    </div>
  );
}