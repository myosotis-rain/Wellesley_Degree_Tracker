import React from "react";
import { MajorIntro, SectionCard } from "./shared.jsx";
import { codesMatch, normalizeCourseCode } from "../../utils.js";

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
const isAbove100 = (course) => {
  if (Number.isFinite(course?.level)) return course.level > 100;
  const match = normalizeCourseCode(course.code).match(/(\d+)/);
  return match ? parseInt(match[1], 10) > 100 : false;
};

export default function MedievalRenaissanceStudiesPlanner({ majorReq, courses }) {
  const mer = majorReq.merStructure || {};
  const poolMatches = dedupeCourses(courses.filter(course => matchesAny(course, mer.coursePool)));
  const totalCourses = poolMatches.length;
  const above100 = poolMatches.filter(isAbove100).length;
  const level300 = poolMatches.filter(isLevel300).length;

  const stats = [
    { label: "Total courses", value: `${totalCourses}/${majorReq.unitTarget || 9}` },
    { label: "Above 100-level (concentration)", value: `${above100}/${mer.concentrationAbove100 || 4}` },
    { label: "300-level", value: `${level300}/${mer.level300Required || 2}` },
  ];

  return (
    <div className="space-y-4">
      <MajorIntro majorReq={majorReq} />

      <SectionCard title="Progress Snapshot">
        <div className="grid gap-2 sm:grid-cols-3">
          {stats.map(item => (
            <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center">
              <div className="text-[0.6rem] uppercase tracking-wide text-slate-500">{item.label}</div>
              <div className="text-base font-semibold text-slate-900">{item.value}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Advising Notes">
        <div className="space-y-2 text-[0.85rem] text-slate-700">
          <p>Select an advisor in your concentration and plan two 300-level courses at Wellesley.</p>
          <p>{mer.studyAbroadNote}</p>
        </div>
      </SectionCard>
    </div>
  );
}
