import { courseCodeToDepartment } from "./data.js";

export const cx = (...classes) => classes.filter(Boolean).join(" ");

export const clamp01 = (value) => Math.max(0, Math.min(1, value));

export const detectDepartmentFromCode = (courseCode) => {
  if (!courseCode) return null;
  const match = courseCode.trim().toUpperCase().match(/^([A-Z]+)/);
  if (!match) return null;
  const deptCode = match[1];
  return courseCodeToDepartment[deptCode] || null;
};

export const newSlot = () => ({
  code: "",
  title: "",
  credits: 1,
  tags: [],
  depts: [],
  source: "Wellesley",
  level: 100,
  programs: {},
});

export const defaultYears = [
  { id: 1, label: "First Year", termLabels: ["Fall", "Spring", "Summer", "Winter"] },
  { id: 2, label: "Sophomore Year", termLabels: ["Fall", "Spring", "Summer", "Winter"] },
  { id: 3, label: "Junior Year", termLabels: ["Fall", "Spring", "Summer", "Winter"] },
  { id: 4, label: "Senior Year", termLabels: ["Fall", "Spring", "Summer", "Winter"] },
];

export const getDefaultTerms = (startYear = 2024) => [
  { id: "Y1-F", label: `Fall ${startYear}`, year: 1, calendarYear: startYear, season: "Fall" },
  { id: "Y1-S", label: `Spring ${startYear + 1}`, year: 1, calendarYear: startYear + 1, season: "Spring" },
  { id: "Y2-F", label: `Fall ${startYear + 1}`, year: 2, calendarYear: startYear + 1, season: "Fall" },
  { id: "Y2-S", label: `Spring ${startYear + 2}`, year: 2, calendarYear: startYear + 2, season: "Spring" },
  { id: "Y3-F", label: `Fall ${startYear + 2}`, year: 3, calendarYear: startYear + 2, season: "Fall" },
  { id: "Y3-S", label: `Spring ${startYear + 3}`, year: 3, calendarYear: startYear + 3, season: "Spring" },
  { id: "Y4-F", label: `Fall ${startYear + 3}`, year: 4, calendarYear: startYear + 3, season: "Fall" },
  { id: "Y4-S", label: `Spring ${startYear + 4}`, year: 4, calendarYear: startYear + 4, season: "Spring" },
].map((term) => ({ ...term, slots: [newSlot(), newSlot(), newSlot(), newSlot()] }));
