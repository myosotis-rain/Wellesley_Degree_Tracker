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
const isSeminar = (course) => {
  const title = (course.title || "").toLowerCase();
  return isLevel300(course) && title.includes("seminar");
};
const isArabicSecondYear = (course) => {
  const match = normalizeCourseCode(course.code).match(/^ARAB\s*(\d+)/);
  return match ? parseInt(match[1], 10) >= 200 : false;
};

export default function MiddleEasternStudiesPlanner({ majorReq, courses }) {
  const mes = majorReq.mesStructure || {};
  const languageCourses = dedupeCourses(courses.filter(isArabicSecondYear));
  const concentrationCourses = dedupeCourses(courses.filter(course => matchesAny(course, mes.coursePool)));
  const level300 = concentrationCourses.filter(isLevel300);
  const seminar = concentrationCourses.find(isSeminar);

  const stats = [
    { label: "Total courses", value: `${courses.length}/${majorReq.unitTarget || 9}` },
    { label: "Arabic (2nd-year+)", value: `${languageCourses.length}/2` },
    { label: "Concentration courses", value: `${concentrationCourses.length}/4` },
    { label: "300-level", value: `${level300.length}/${mes.level300Required || 2}` },
    { label: "Seminar", value: seminar ? seminar.code : "—" },
  ];

  return (
    <div className="space-y-4">
      <MajorIntro majorReq={majorReq} />

      <SectionCard title="Progress Snapshot">
        <div className="grid gap-2 sm:grid-cols-4">
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
          <p>Language substitutions (Persian, Turkish, Hebrew) require written approval; one year of Arabic is usually still expected.</p>
          <p>{mes.awayCoursePolicy}</p>
        </div>
      </SectionCard>
    </div>
  );
}
