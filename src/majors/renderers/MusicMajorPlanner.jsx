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

export default function MusicMajorPlanner({ majorReq, courses }) {
  const music = majorReq.musicStructure || {};
  const req = music.newRequirements || {};

  const theory = dedupeCourses(courses.filter(course => matchesAny(course, req.theoryCourses)));
  const historyCulture = dedupeCourses(courses.filter(course => matchesAny(course, req.historyCultureCourses)));
  const electives = dedupeCourses(courses.filter(course => matchesAny(course, req.electiveExamples)));
  const capstone = dedupeCourses(courses.filter(course => matchesAny(course, req.capstoneCourses)));
  const ensembles = dedupeCourses(courses.filter(course => matchesAny(course, req.ensembleCourses)));

  const stats = [
    { label: "Total courses", value: `${courses.length}/${majorReq.unitTarget || 10}` },
    { label: "Theory", value: `${theory.length}/${req.theoryRequired || 3}` },
    { label: "History/Culture/Media", value: `${historyCulture.length}/${req.historyCultureRequired || 4}` },
    { label: "Elective", value: `${electives.length}/${req.electiveRequired || 1}` },
    { label: "Capstone (MUS 300/301)", value: `${capstone.length}/${req.capstoneRequired || 1}` },
    { label: "Ensemble years", value: `${ensembles.length}/${req.ensembleRequired || 1}` },
  ];

  return (
    <div className="space-y-4">
      <MajorIntro majorReq={majorReq} />

      <SectionCard title="Core Requirements">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map(item => (
            <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center">
              <div className="text-[0.6rem] uppercase tracking-wide text-slate-500">{item.label}</div>
              <div className="text-base font-semibold text-slate-900">{item.value}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Legacy Concentrations">
        <ul className="list-disc space-y-1 pl-4 text-sm text-slate-700">
          {(music.legacyTracks || []).map((track, idx) => (
            <li key={idx}>
              <span className="font-semibold">{track.title}:</span> {track.summary}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[0.85rem] text-slate-700">{music.ensembleNote}</p>
      </SectionCard>
    </div>
  );
}
