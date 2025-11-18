import React from "react";
import { cx, detectDepartmentFromCode } from "../../utils.js";
import { MajorIntro } from "./shared.jsx";
import { codesMatch } from "../../utils.js";

export default function GenericMajorPlanner({ majorReq, courses, majorValue }) {
  const completedRequired = (majorReq.requiredCourses || []).filter(req =>
    courses.some(course => codesMatch(course.code, req))
  );

  const majorDept = majorValue;
  const majorElectives = courses.filter(course => {
    const dept = detectDepartmentFromCode(course.code);
    const isCore = (majorReq.requiredCourses || []).some(req => codesMatch(course.code, req));
    return dept === majorDept && !isCore && (course.level || 0) >= 200;
  });

  const completedMath = (majorReq.mathRequirements || []).filter(req =>
    courses.some(course => codesMatch(course.code, req))
  );

  return (
    <div className="space-y-4">
      <MajorIntro majorReq={majorReq} />

      <div className="grid gap-4 md:grid-cols-3">
        {majorReq.requiredCourses?.length > 0 && (
          <div className="rounded-lg border p-3 md:col-span-1">
            <div className="mb-2 text-sm font-medium">Required Courses</div>
            <div className="space-y-1 text-xs">
              {majorReq.requiredCourses.map(course => (
                <div key={course} className={cx(
                  "flex items-center justify-between p-2 rounded",
                  completedRequired.includes(course)
                    ? "bg-green-50 text-green-700"
                    : "bg-gray-50 text-gray-600"
                )}>
                  <span>{course}</span>
                  {completedRequired.includes(course) && <span>✓</span>}
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {completedRequired.length}/{majorReq.requiredCourses.length} completed
            </div>
          </div>
        )}

        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Major Electives</div>
          <div className="space-y-1 text-xs">
            {majorElectives.map((course, idx) => (
              <div key={idx} className="p-2 bg-blue-50 text-blue-700 rounded">
                {course.code} - {course.title}
              </div>
            ))}
          </div>
          {majorReq.electiveCourses && (
            <div className="mt-2 text-xs text-slate-500">
              {majorElectives.length}/{majorReq.electiveCourses} completed
            </div>
          )}
        </div>

        {majorReq.mathRequirements?.length > 0 && (
          <div className="rounded-lg border p-3">
            <div className="mb-2 text-sm font-medium">Supporting Math</div>
            <div className="space-y-1 text-xs">
              {majorReq.mathRequirements.map(course => (
                <div key={course} className={cx(
                  "flex items-center justify-between p-2 rounded",
                  completedMath.includes(course)
                    ? "bg-green-50 text-green-700"
                    : "bg-gray-50 text-gray-600"
                )}>
                  <span>{course}</span>
                  {completedMath.includes(course) && <span>✓</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
