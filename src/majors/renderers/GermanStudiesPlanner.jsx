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

export default function GermanStudiesMajorPlanner({ majorReq, courses, majorValue }) {
  const germanCourses = courses.filter(course => 
    course.code && (
      course.code.toUpperCase().startsWith('GER') ||
      course.code.toUpperCase().startsWith('GRMN')
    )
  );
  
  const aboveGER102Courses = germanCourses.filter(course => {
    const match = course.code.match(/(GER|GRMN)\s*(\d+)/);
    return match && parseInt(match[2]) > 102;
  });

  const relatedEnglishCourses = courses.filter(course => {
    const title = course.title?.toLowerCase() || '';
    const code = course.code?.toLowerCase() || '';
    return ['german', 'germany', 'berlin', 'bavaria', 'austrian', 'vienna', 'weimar'].some(keyword => 
      title.includes(keyword) || code.includes(keyword)
    ) && !germanCourses.includes(course);
  });

  const focusAreaCourses = {
    Media: courses.filter(course => {
      const title = course.title?.toLowerCase() || '';
      return title.includes('media') || title.includes('film') || title.includes('cinema');
    }),
    History: courses.filter(course => {
      const title = course.title?.toLowerCase() || '';
      return title.includes('history') || title.includes('historical');
    }),
    Culture: courses.filter(course => {
      const title = course.title?.toLowerCase() || '';
      return title.includes('culture') || title.includes('cultural') || title.includes('society');
    }),
    Society: courses.filter(course => {
      const title = course.title?.toLowerCase() || '';
      return title.includes('society') || title.includes('social') || title.includes('politics');
    })
  };

  const germanSteps = [
    {
      id: "german-language-requirement",
      label: "German language courses",
      display: "Need 6 courses above GER 102",
      completed: aboveGER102Courses.length >= 6,
      fulfilledBy: aboveGER102Courses.length >= 6 ? 
        `${aboveGER102Courses.slice(0, 6).map(c => c.code).join(", ")}` : null
    }
  ];

  const culturalSteps = [
    {
      id: "cultural-requirement",
      label: "Cultural studies courses",
      display: "Need 3 English-taught courses on German culture, history, etc.",
      completed: relatedEnglishCourses.length >= 3,
      fulfilledBy: relatedEnglishCourses.length >= 3 ? 
        `${relatedEnglishCourses.slice(0, 3).map(c => c.code).join(", ")}` : null
    }
  ];

  return (
    <div className="space-y-5">
      <MajorIntro majorReq={majorReq} />

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <div className="text-sm font-semibold text-amber-700 mb-1">Individual Structured Major</div>
        <div className="text-xs text-amber-600">
          This major requires close consultation with your advisor to develop an individualized plan combining 
          advanced German fluency with specific focus areas like media, history, culture, or society.
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <RequirementCard title="German Language Study" steps={germanSteps} />
          <RequirementCard title="Cultural Studies Component" steps={culturalSteps} />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
              Overall Progress
            </div>
            <div className="mt-1 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Individual structured program
                </div>
                <p className="text-xs text-slate-500">
                  German language + cultural studies
                </p>
              </div>
              <div className="text-xl font-semibold text-slate-900">
                {aboveGER102Courses.length + relatedEnglishCourses.length}/9
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 mt-2">
              <div
                className="h-full rounded-full bg-orange-500"
                style={{
                  width: `${Math.min(100, ((aboveGER102Courses.length + relatedEnglishCourses.length) / 9) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {Object.entries(focusAreaCourses).map(([area, areaCourses]) => (
          areaCourses.length > 0 && (
            <div key={area} className="rounded-lg border border-purple-200 bg-purple-50 p-3">
              <div className="text-xs font-semibold text-purple-700 mb-2">{area} Focus</div>
              {areaCourses.slice(0, 3).map((course, idx) => (
                <div key={idx} className="text-xs text-purple-600">
                  {course.code}
                </div>
              ))}
              {areaCourses.length > 3 && (
                <div className="text-xs text-purple-500 mt-1">
                  +{areaCourses.length - 3} more
                </div>
              )}
            </div>
          )
        ))}
      </div>
    </div>
  );
}