import React from "react";
import { MajorIntro, SectionCard } from "./shared.jsx";
import { codesMatch, normalizeCourseCode, detectDepartmentFromCode } from "../../utils.js";

const splitCodes = (entry = "") => entry.split("/").map(part => part.trim()).filter(Boolean);
const matchesAny = (course, list = []) =>
  list.some(entry => splitCodes(entry).some(code => codesMatch(course.code, code)));
const dedupeCourses = (courses = []) => {
  const seen = new Set();
  return courses.filter(course => {
    const key = normalizeCourseCode(course.code) || course.title;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
const isLevel300 = (course) => {
  if (Number.isFinite(course?.level)) return course.level >= 300;
  const match = normalizeCourseCode(course.code).match(/(\d+)/);
  return match ? parseInt(match[1], 10) >= 300 : false;
};
const isAdvancedLanguage = (course) => {
  const match = normalizeCourseCode(course.code).match(/^(SPAN|PORT)\s*(\d+)/);
  return match ? parseInt(match[2], 10) >= 241 : false;
};

export default function LatinAmericanStudiesPlanner({ majorReq, courses }) {
  const las = majorReq.lasStructure || {};
  const languageCourses = dedupeCourses(courses.filter(isAdvancedLanguage));
  const surveyCourses = dedupeCourses(courses.filter(course => matchesAny(course, las.surveyCourses)));
  const humanitiesCourses = dedupeCourses(courses.filter(course => matchesAny(course, las.humanitiesCourses)));
  const socialCourses = dedupeCourses(courses.filter(course => matchesAny(course, las.socialScienceCourses)));
  const humanities300 = humanitiesCourses.filter(isLevel300);
  const social300 = socialCourses.filter(isLevel300);
  const electivePool = dedupeCourses([...humanitiesCourses, ...socialCourses]);
  const departmentsCovered = (() => {
    const set = new Set();
    courses.forEach(course => {
      const dept = detectDepartmentFromCode(course.code);
      if (dept) set.add(dept);
    });
    return set.size;
  })();

  const stats = [
    { label: "Total courses", value: `${courses.length}/${majorReq.unitTarget || 9}` },
    { label: "Language (SPAN/PORT 241+)", value: `${languageCourses.length}/2` },
    { label: "Regional surveys", value: `${surveyCourses.length}/2` },
    { label: "Humanities electives", value: `${humanitiesCourses.length}/${las.electiveRules?.humanities || 2}` },
    { label: "Humanities at 300+", value: `${humanities300.length}/${las.electiveRules?.humanities300 || 1}` },
    { label: "Social science electives", value: `${socialCourses.length}/${las.electiveRules?.socialScience || 2}` },
    { label: "Social science at 300+", value: `${social300.length}/${las.electiveRules?.socialScience300 || 1}` },
    { label: "Total electives", value: `${electivePool.length}/${las.electiveRules?.totalElectives || 5}` },
    { label: "Departments reached", value: `${departmentsCovered}/3+` },
  ];

  return (
    <div className="space-y-4">
      <MajorIntro majorReq={majorReq} />

      <SectionCard title="Core Checklist">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(item => (
            <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center">
              <div className="text-[0.6rem] uppercase tracking-wide text-slate-500">{item.label}</div>
              <div className="text-base font-semibold text-slate-900">{item.value}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Planning Notes">
        <div className="space-y-2 text-[0.85rem] text-slate-700">
          <p>Plan in three departments, include surveys, and keep humanities/social balance. Notify instructors when a course needs a Latin America-focused paper.</p>
          <p>{las.studyAbroadNote}</p>
        </div>
      </SectionCard>
    </div>
  );
}
