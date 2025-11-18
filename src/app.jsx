import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  distributionRequirements,
  generalRequirements,
  internalRequirements,
  majorRequirements,
  seedRequirements,
  subjectOptions,
} from "./data.js";
import {
  clamp01,
  cx,
  defaultYears,
  detectDepartmentFromCode,
  getDefaultTerms,
  newSlot,
} from "./utils.js";
import { loadFromLocalStorage, saveToLocalStorage } from "./storage.js";
import {
  EditableYearLabel,
  MiniReqBar,
  RingStat,
  TermDetailModal,
  TermSummaryCard,
} from "./components.jsx";

const TABS = [
  { id: "plan", label: "Planner" },
  { id: "reqs", label: "Requirements" },
  { id: "courses", label: "Courses" },
  { id: "major", label: "Major / Minor" },
];

const PROGRAM_TYPE_OPTIONS = ["Major", "Minor", "None"];

const DEFAULT_PROGRAM_SELECTIONS = [
  { id: "programA", label: "Program 1", type: "Major", value: "", experienceComplete: false },
  { id: "programB", label: "Program 2", type: "None", value: "", experienceComplete: false },
];

const DETAILED_MAJOR_VALUES = new Set([
  "Media Arts and Sciences",
  "Computer Science",
  "Biological Sciences",
  "Mathematics",
  "Economics",
  "English",
  "Africana Studies",
  "American Studies",
  "Anthropology",
]);

const MAX_CUSTOM_MAJOR_REQUIREMENTS = 15;
const DEFAULT_CUSTOM_MAJOR_COUNT = 9;
const CUSTOM_MAJOR_VALUE_PREFIX = "custom-major:";
const CUSTOM_MINOR_VALUE_PREFIX = "custom-minor:";
const MIN_CUSTOM_MINOR_REQUIREMENTS = 6;
const MAX_CUSTOM_MINOR_REQUIREMENTS = 12;
const DEFAULT_CUSTOM_MINOR_COUNT = 6;
const SUBJECT_NAME_SET = new Set(subjectOptions);

const isCustomMajorValue = (value = "") => {
  if (typeof value !== "string") return false;
  return value === "Custom Major" || value.startsWith(CUSTOM_MAJOR_VALUE_PREFIX);
};

const resolveMajorConfigKey = (value = "") => {
  if (!value) return "";
  if (majorRequirements[value]) return value;
  if (isCustomMajorValue(value)) return "Custom Major";
  return "";
};

const ensureCustomMajorList = (saved) => {
  if (!Array.isArray(saved)) return [];
  return saved
    .map((item, idx) => {
      const name = typeof item?.name === "string" ? item.name.trim() : "";
      const rawId = typeof item?.id === "string" && item.id ? item.id : `legacy-${idx}`;
      if (!name) return null;
      return { id: rawId, name };
    })
    .filter(Boolean);
};

const createCustomMajorOptionValue = (id) => `${CUSTOM_MAJOR_VALUE_PREFIX}${id}`;
const generateCustomMajorId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const isCustomMinorValue = (value = "") => {
  if (typeof value !== "string") return false;
  return value === "Custom Minor" || value.startsWith(CUSTOM_MINOR_VALUE_PREFIX);
};

const resolveMinorConfigKey = (value = "") => {
  if (!value) return "";
  if (isCustomMinorValue(value)) return "Custom Minor";
  return value;
};

const ensureCustomMinorList = (saved) => {
  if (!Array.isArray(saved)) return [];
  return saved
    .map((item, idx) => {
      const name = typeof item?.name === "string" ? item.name.trim() : "";
      const rawId = typeof item?.id === "string" && item.id ? item.id : `legacy-minor-${idx}`;
      if (!name) return null;
      return { id: rawId, name };
    })
    .filter(Boolean);
};

const createCustomMinorOptionValue = (id) => `${CUSTOM_MINOR_VALUE_PREFIX}${id}`;
const generateCustomMinorId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeCourseCode = (code = "") => code.trim().toUpperCase();
const compactCourseCode = (code = "") => normalizeCourseCode(code).replace(/\s+/g, "");
const codesMatch = (codeA = "", codeB = "") => {
  if (!codeA || !codeB) return false;
  return compactCourseCode(codeA) === compactCourseCode(codeB);
};

const ensureProgramSelections = (saved) => {
  if (!Array.isArray(saved)) return DEFAULT_PROGRAM_SELECTIONS.map(entry => ({ ...entry }));
  return DEFAULT_PROGRAM_SELECTIONS.map(template => {
    const match = saved.find(item => item.id === template.id);
    if (!match) return { ...template };
    const rawType = match.type === "Second Major" ? "Major" : match.type;
    const normalizedType = PROGRAM_TYPE_OPTIONS.includes(rawType) ? rawType : template.type;
    return { ...template, ...match, type: normalizedType };
  });
};

const programDepartment = (programName) => {
  switch (programName) {
    case "Computer Science":
      return "Computer Science";
    case "Mathematics":
      return "Mathematics";
    case "Economics":
      return "Economics";
    default:
      return null;
  }
};

const summarizeProgramProgress = (programName, courses, programMeta = {}) => {
  const normalizedKey = resolveMajorConfigKey(programName);
  if (!normalizedKey || normalizedKey === "Custom Major") return null;
  const config = majorRequirements[normalizedKey];
  if (!config) return null;
  if (programName === "Media Arts and Sciences") {
    return { config, isSpecial: true, masProgress: computeMASProgress(courses, config) };
  }
  if (programName === "Computer Science" && config.csStructure) {
    return { config, isCS: true, csProgress: computeCSProgress(courses, config.csStructure) };
  }
  if (programName === "Biological Sciences" && config.bioStructure) {
    return { config, isBio: true, bioProgress: computeBioProgress(courses, config.bioStructure) };
  }
  if (programName === "Anthropology" && config.anthroStructure) {
    return {
      config,
      isAnthro: true,
      anthroProgress: computeAnthroProgress(courses, config.anthroStructure, programMeta.experienceComplete),
    };
  }
  if (config.englishStructure && (programName === "English" || programName === "English and Creative Writing")) {
    return {
      config,
      isEnglish: true,
      englishProgress: computeEnglishProgress(courses, config.englishStructure),
    };
  }
  if (config.afrStructure) {
    return {
      config,
      isAfr: true,
      afrProgress: computeAfrProgress(courses, config.afrStructure),
    };
  }
  if (config.amerStructure) {
    return {
      config,
      isAmst: true,
      amstProgress: computeAmstProgress(courses, config.amerStructure),
    };
  }

  const requiredCourses = config.requiredCourses || [];
  const requiredCompleted = requiredCourses.filter(req =>
    courses.some(course => codesMatch(course.code, req))
  );

  const dept = programDepartment(programName);
  const electiveTotal = config.electiveCourses || 0;
  let electiveCompleted = 0;
  if (dept && electiveTotal > 0) {
    electiveCompleted = Math.min(
      electiveTotal,
      courses.filter(course => {
        const detected = detectDepartmentFromCode(course.code);
        return (
          detected === dept &&
          !requiredCourses.includes(course.code) &&
          (course.level || 0) >= 200
        );
      }).length
    );
  }

  const mathRequirements = config.mathRequirements || [];
  const mathCompleted = mathRequirements.filter(req =>
    courses.some(course => codesMatch(course.code, req))
  );

  return {
    config,
    isSpecial: false,
    requiredCompleted: requiredCompleted.length,
    requiredTotal: requiredCourses.length,
    electiveCompleted,
    electiveTotal,
    mathCompleted: mathCompleted.length,
    mathTotal: mathRequirements.length,
  };
};

const sanitizeReqKey = (key = "") => key.toLowerCase().replace(/[^a-z0-9]+/g, "-");

const programRequirementOptionSets = {
  "Media Arts and Sciences": [
    { id: "mas-intro", label: "Intro Courses", required: 3 },
    { id: "mas-studio", label: "Studio Core", required: 3 },
    { id: "mas-cs", label: "CS Core", required: 3 },
    { id: "mas-electives", label: "MAS Electives", required: 3 },
    { id: "mas-capstone", label: "Capstone Course", required: 1 },
    { id: "mas-portfolio", label: "Portfolio / Deliverable", required: 1 },
  ],
  "Computer Science": [
    { id: "cs-intro", label: "Intro (CS 111/112)", required: 1 },
    { id: "cs-core-230", label: "CS 230 Series", required: 1 },
    { id: "cs-core-231", label: "CS 231", required: 1 },
    { id: "cs-core-235", label: "CS 235", required: 1 },
    { id: "cs-core-240", label: "CS 240", required: 1 },
    { id: "cs-300", label: "300-level CS", required: 2 },
    { id: "cs-elective", label: "CS Elective (200+)", required: 2 },
    { id: "cs-math", label: "Supporting Math (MATH 225)", required: 1 },
  ],
  "Biological Sciences": [
    { id: "bio-intro-cell", label: "Intro: Cell & Molecular", required: 1 },
    { id: "bio-intro-organismal", label: "Intro: Organismal", required: 1 },
    { id: "bio-group-cell", label: "200-level: Cell Biology", required: 1 },
    { id: "bio-group-systems", label: "200-level: Systems Biology", required: 1 },
    { id: "bio-group-community", label: "200-level: Community Biology", required: 1 },
    { id: "bio-extra-200", label: "Additional 200-level BISC", required: 1 },
    { id: "bio-300", label: "300-level BISC", required: 2 },
    { id: "bio-elective", label: "BISC Elective / EXTD 225", required: 1 },
    { id: "bio-chem-intro", label: "Intro Chemistry", required: 1 },
    { id: "bio-chem-advanced", label: "Advanced Chemistry", required: 1 },
  ],
  Anthropology: [
    { id: "anth-101", label: "ANTH 101", required: 1 },
    { id: "anth-2nd-intro", label: "Second Intro (ANTH 102/103)", required: 1 },
    { id: "anth-205", label: "ANTH 205", required: 1 },
    { id: "anth-301", label: "ANTH 301", required: 1 },
    { id: "anth-extra-300", label: "Additional 300-level", required: 1 },
    { id: "anth-elective", label: "Anthropology Elective", required: 4 },
    { id: "anth-experience", label: "Field / Experience", required: 1 },
  ],
  English: [
    { id: "english-postcolonial", label: "Postcolonial / Ethnic Writing", required: 1 },
    { id: "english-pre1900", label: "Pre-1900 Literature", required: 3 },
    { id: "english-pre1800", label: "Pre-1800 Literature", required: 2 },
  ],
  "English and Creative Writing": [
    { id: "english-postcolonial", label: "Postcolonial / Ethnic Writing", required: 1 },
    { id: "english-pre1900", label: "Pre-1900 Literature", required: 3 },
    { id: "english-pre1800", label: "Pre-1800 Literature", required: 2 },
    { id: "english-creative-writing", label: "Creative Writing Course", required: 4 },
  ],
  "Africana Studies": [
    { id: "afr-intro", label: "AFR 105 / AFR 210", required: 1 },
    { id: "afr-300", label: "300-level AFR courses", required: 2 },
    { id: "afr-colloquium", label: "Africana Colloquium attendance", required: 1 },
  ],
  "American Studies": [
    { id: "amst-intro", label: "AMST 101 / 121", required: 1 },
    { id: "amst-core", label: "Core AMST courses", required: 5 },
    { id: "amst-300", label: "300-level AMST", required: 2 },
  ],
  Mathematics: [
    { id: "math-115", label: "MATH 115", required: 1 },
    { id: "math-116", label: "MATH 116 or 120", required: 1 },
    { id: "math-205", label: "MATH 205", required: 1 },
    { id: "math-206", label: "MATH 206", required: 1 },
    { id: "math-302", label: "MATH 302", required: 1 },
    { id: "math-305", label: "MATH 305", required: 1 },
    { id: "math-extra-300", label: "Additional 300-level MATH", required: 2 },
    { id: "math-adv-elective", label: "Additional 200+ MATH/STAT units", required: 2 },
  ],
  Economics: [
    { id: "econ-101", label: "ECON 101 / 101P", required: 1 },
    { id: "econ-102", label: "ECON 102 / 102P", required: 1 },
    { id: "econ-201", label: "ECON 201", required: 1 },
    { id: "econ-202", label: "ECON 202", required: 1 },
    { id: "econ-103", label: "ECON 103 / approved stats", required: 1 },
    { id: "econ-203", label: "ECON 203", required: 1 },
    { id: "econ-300", label: "300-level ECON", required: 2 },
    { id: "econ-elective", label: "Economics / QR260 / STAT260 / QR309 / STAT309", required: 1 },
  ],
  "Custom Major": [],
};

const getRequirementOptionsForMajor = (majorName) => {
  const normalizedKey = resolveMajorConfigKey(majorName);
  if (!normalizedKey) return [];
  if (programRequirementOptionSets[normalizedKey]) return programRequirementOptionSets[normalizedKey];
  const config = majorRequirements[normalizedKey];
  if (!config) return [];
  const options = [];
  (config.requiredCourses || []).forEach(course => {
    options.push({ id: `required-${sanitizeReqKey(course)}`, label: `Required: ${course}`, required: 1 });
  });
  if (config.electiveCourses) {
    options.push({ id: "generic-elective", label: "Major Elective", required: config.electiveCourses });
  }
  (config.mathRequirements || []).forEach(course => {
    options.push({ id: `support-${sanitizeReqKey(course)}`, label: `Supporting: ${course}`, required: 1 });
  });
  return options;
};

const computeMASProgress = (courses, majorReq) => {
  const normalizeCode = (course) => (course.code || "").trim().toUpperCase();

  const visualAnalysis = courses.filter(course =>
    majorReq.introductoryCourses.visualAnalysis.some(req => course.code.includes(req.replace(" ", " ")))
  );
  const studioFoundation = courses.filter(course => course.code.match(/^ARTS\s+1\d{2}/));
  const csIntro = courses.filter(course => course.code.match(/^CS\s+1\d{2}/));

  const studioCore = courses.filter(course =>
    majorReq.coreCourses.studioCore.some(req => codesMatch(course.code, req))
  );
  const csCore = courses.filter(course =>
    majorReq.coreCourses.csCore.some(req => codesMatch(course.code, req))
  );
  const capstone = courses.filter(course =>
    majorReq.capstoneCourses.some(req => codesMatch(course.code, req))
  );

  const usedCodes = new Set([
    ...visualAnalysis,
    ...studioFoundation,
    ...csIntro,
    ...studioCore,
    ...csCore,
    ...capstone,
  ].map(normalizeCode));

  const masEligiblePrefixes = ["ARTS", "CAMS", "MUS", "CS", "MAS"];
  const additional = courses.filter(course => {
    const code = normalizeCode(course);
    if (!code || usedCodes.has(code)) return false;
    const prefix = code.split(/\s+/)[0];
    return masEligiblePrefixes.includes(prefix);
  });

  const totalUnits = courses.reduce((sum, course) => sum + Number(course.credits || 0), 0);
  const upperLevelCourses = courses.filter(course => (course.level || 0) > 100).length;
  const level300Count = courses.filter(course => (course.level || 0) >= 300).length;

  return {
    visualAnalysis,
    studioFoundation,
    csIntro,
    studioCore,
    csCore,
    capstone,
    additional,
    totals: {
      totalUnits,
      upperLevelCourses,
      level300Count,
    },
  };
};

const computeCSProgress = (courses, csStructure) => {
  const normalizeCode = (course) => (course.code || "").trim().toUpperCase();
  const matchesOption = (code, options = []) => options.some(opt => codesMatch(code, opt));
  const csCourses = courses.filter(course => normalizeCode(course).startsWith("CS"));
  const excluded = new Set((csStructure.excludedCourses || []).map(code => code.toUpperCase()));

  const used = new Set();
  const markUsed = (course) => used.add(normalizeCode(course));

  const introCompleted = csCourses.some(course => {
    const code = normalizeCode(course);
    if (matchesOption(code, csStructure.introOptions)) {
      markUsed(course);
      return true;
    }
    return false;
  });

  const coreGroups = (csStructure.coreGroups || []).map(group => {
    const completedCourse = csCourses.find(course => {
      const code = normalizeCode(course);
      return matchesOption(code, group.options) && !used.has(code);
    });
    if (completedCourse) markUsed(completedCourse);
    return {
      label: group.label,
      completed: Boolean(completedCourse),
    };
  });

  const availableCourses = csCourses.filter(course => {
    const code = normalizeCode(course);
    if (!code || excluded.has(code)) return false;
    return !used.has(code);
  });

  const level300Candidates = availableCourses.filter(course => (course.level || 0) >= 300);
  const level300 = level300Candidates.slice(0, csStructure.level300Required || 0);
  level300.forEach(markUsed);

  const electivePool = availableCourses.filter(course => !level300.includes(course) && (course.level || 0) >= 200);
  const electives = electivePool.slice(0, csStructure.electivesRequired || 0);

  const mathSatisfied = (csStructure.mathRequirements || []).every(req =>
    courses.some(course => normalizeCode(course) === req)
  );

  return {
    introCompleted,
    coreGroups,
    level300Count: level300.length,
    level300Required: csStructure.level300Required || 0,
    electivesCount: electives.length,
    electivesRequired: csStructure.electivesRequired || 0,
    mathSatisfied,
    mathRequirements: csStructure.mathRequirements || [],
  };
};

const computeBioProgress = (courses, bioStructure) => {
  const normalizeCode = (course) => (course.code || "").trim().toUpperCase();
  const isBISC = (course) => normalizeCode(course).startsWith("BISC");
  const isChem = (course) => normalizeCode(course).startsWith("CHEM");
  const filtered = courses.filter(isBISC);
  const excluded = new Set((bioStructure.excludedCourses || []).map(code => code.toUpperCase()));
  const used = new Set();
  const useCourse = (course) => used.add(normalizeCode(course));

  const introCellCompleted = filtered.find(course => bioStructure.introCell.includes(normalizeCode(course)));
  if (introCellCompleted) useCourse(introCellCompleted);
  const introOrgCompleted = filtered.find(course => bioStructure.introOrganismal.includes(normalizeCode(course)));
  if (introOrgCompleted) useCourse(introOrgCompleted);

  const pickFromGroup = (group) => {
    const match = filtered.find(course => !used.has(normalizeCode(course)) && group.includes(normalizeCode(course)));
    if (match) useCourse(match);
    return Boolean(match);
  };

  const groupCell = pickFromGroup(bioStructure.groupCell || []);
  const groupSystems = pickFromGroup(bioStructure.groupSystems || []);
  const groupCommunity = pickFromGroup(bioStructure.groupCommunity || []);

  const remaining200Candidates = filtered.filter(course => {
    const code = normalizeCode(course);
    if (used.has(code) || excluded.has(code)) return false;
    return (course.level || 0) >= 200 && (course.level || 0) < 300;
  });
  const additional200 = remaining200Candidates.splice(0, bioStructure.additional200Required || 0);
  additional200.forEach(useCourse);

  const level300Candidates = filtered.filter(course => {
    const code = normalizeCode(course);
    if (used.has(code) || excluded.has(code)) return false;
    return (course.level || 0) >= 300;
  });
  const level300 = level300Candidates.slice(0, bioStructure.level300Required || 0);
  level300.forEach(useCourse);

  const electiveCandidates = filtered.filter(course => {
    const code = normalizeCode(course);
    if (used.has(code) || excluded.has(code)) return false;
    return true;
  });
  const electiveAdditionalCodes = (bioStructure.electiveAdditionalOptions || []).map(code => code.toUpperCase());
  const electivePool = [
    ...electiveCandidates,
    ...courses.filter(course => electiveAdditionalCodes.includes(normalizeCode(course))),
  ];
  const elective = electivePool.length > 0 ? [electivePool[0]] : [];

  const chemIntroCompleted = courses.find(course => bioStructure.chemIntroOptions.includes(normalizeCode(course)));
  const chemAdvancedCompleted = courses.find(course => {
    if (!isChem(course)) return false;
    if (bioStructure.chemIntroOptions.includes(normalizeCode(course))) return false;
    return true;
  });

  return {
    introCell: Boolean(introCellCompleted),
    introOrganismal: Boolean(introOrgCompleted),
    groupCell,
    groupSystems,
    groupCommunity,
    additional200: additional200.length,
    additional200Required: bioStructure.additional200Required || 0,
    level300: level300.length,
    level300Required: bioStructure.level300Required || 0,
    electiveCompleted: elective.length,
    electiveRequired: bioStructure.electiveRequired || 0,
    chemIntroCompleted: Boolean(chemIntroCompleted),
    chemAdvancedCompleted: Boolean(chemAdvancedCompleted),
  };
};

const computeMathProgress = (courses, mathStructure) => {
  const normalizeCode = (value = "") => value.trim().toUpperCase();
  const compactCode = (value = "") => normalizeCode(value).replace(/\s+/g, "");
  const allowedDepartments = new Set(mathStructure.allowedDepartments || []);
  const excludedCourses = new Set((mathStructure.excludedCourses || []).map(compactCode));
  const seminarSet = new Set((mathStructure.seminarCourses || []).map(compactCode));

  const filtered = courses
    .map(course => ({
      ...course,
      norm: normalizeCode(course.code || ""),
      compact: compactCode(course.code || ""),
      dept: detectDepartmentFromCode(course.code),
    }))
    .filter(course => course.norm && allowedDepartments.has(course.dept));

  const hasCourse = (code) => filtered.some(course => codesMatch(course.code, code));
  const hasAny = (codes = []) => codes.some(code => hasCourse(code));

  const calculus115 = hasCourse("MATH 115");
  const calculusSecond = hasAny((mathStructure.calculusSequence || []).filter(code => code !== "MATH 115"));

  const coreCompleted = (mathStructure.coreCourses || []).map(code => ({
    code,
    completed: hasCourse(code),
  }));

  const seminarCompleted = (mathStructure.seminarCourses || []).map(code => ({
    code,
    completed: hasCourse(code),
  }));

  const advancedCourses = filtered.filter(course => {
    if (excludedCourses.has(course.compact)) return false;
    return (course.level || 0) >= 200;
  });
  const advancedTotal = advancedCourses.length;

  const additional300Courses = advancedCourses.filter(course => {
    if ((course.level || 0) < 300) return false;
    if (course.dept !== "Mathematics") return false;
    if (seminarSet.has(course.compact) || excludedCourses.has(course.compact)) return false;
    return true;
  });

  return {
    calculus115,
    calculusSecond,
    coreCompleted,
    seminarCompleted,
    advancedTotal,
    advancedRequired: mathStructure.advancedTotalRequired || 8,
    additional300Count: additional300Courses.length,
    additional300Required: mathStructure.additional300Required || 0,
    presentationNote: mathStructure.presentationNote,
  };
};

const computeEconProgress = (courses, econStructure) => {
  const normalizeCode = (value = "") => value.trim().toUpperCase();
  const econCourses = courses
    .map(course => ({
      ...course,
      norm: normalizeCode(course.code || ""),
      dept: detectDepartmentFromCode(course.code),
    }))
    .filter(course => course.norm && course.dept === "Economics");

  const hasCourse = (codes = []) => codes.some(code => econCourses.some(course => course.norm === code));

  const microIntro = hasCourse(econStructure.microIntro || []);
  const microIntermediate = hasCourse(econStructure.microIntermediate || []);
  const macroIntro = hasCourse(econStructure.macroIntro || []);
  const macroIntermediate = hasCourse(econStructure.macroIntermediate || []);
  const statsIntroCourse = econCourses.some(course => course.norm === "ECON 103");
  const statsIntermediate = econCourses.some(course => course.norm === "ECON 203");

  const altStatsSet = new Set((econStructure.altStatsCredit || []).map(code => code.toUpperCase()));
  const statsIntroViaAlt = !statsIntroCourse && courses.some(course => altStatsSet.has(normalizeCode(course.code || "")));
  const statsIntroSatisfied = statsIntroCourse || statsIntroViaAlt;

  const excluded300 = new Set((econStructure.excluded300 || []).map(code => code.toUpperCase()));
  const level300Courses = econCourses.filter(course => {
    if ((course.level || 0) < 300) return false;
    return !excluded300.has(course.norm);
  });

  const substitutionSet = new Set((econStructure.electiveSubstitutions || []).map(code => code.toUpperCase()));
  const substitutionCourses = courses.filter(course => substitutionSet.has(normalizeCode(course.code || "")));

  const totalCount = econCourses.length + substitutionCourses.length;
  const totalRequired = econStructure.totalCoursesRequired || 9;

  return {
    microIntro,
    microIntermediate,
    macroIntro,
    macroIntermediate,
    statsIntroCourse,
    statsIntroSatisfied,
    statsIntroViaAlt,
    statsIntermediate,
    level300Count: level300Courses.length,
    level300Required: econStructure.level300Required || 0,
    totalCount,
    totalRequired,
    substitutionCourses: substitutionCourses.map(course => course.code),
  };
};

const computeAnthroProgress = (courses, structure, experienceComplete = false) => {
  const normalize = (course) => (course.code || "").trim().toUpperCase();
  const isAnth = (course) => normalize(course).startsWith("ANTH") || normalize(course).startsWith("CLCV");
  const filtered = courses.filter(isAnth);
  const excluded = new Set((structure.excludedCourses || []).map(code => code.toUpperCase()));
  const used = new Set();
  const useCourse = (course) => used.add(normalize(course));

  const introPrimary = filtered.find(course => normalize(course) === structure.introRequired);
  if (introPrimary) useCourse(introPrimary);
  const introSecond = filtered.find(course => (structure.introSecondOptions || []).includes(normalize(course)) && !used.has(normalize(course)));
  if (introSecond) useCourse(introSecond);

  const midCourse = filtered.find(course => normalize(course) === structure.midRequirement && !used.has(normalize(course)));
  if (midCourse) useCourse(midCourse);
  const seminar = filtered.find(course => normalize(course) === structure.seminarRequirement && !used.has(normalize(course)));
  if (seminar) useCourse(seminar);

  const level300Candidates = filtered.filter(course => {
    const code = normalize(course);
    if (used.has(code) || excluded.has(code)) return false;
    return code.startsWith("ANTH") && (course.level || 0) >= 300;
  });
  const extra300 = level300Candidates.slice(0, structure.extra300Required || 0);
  extra300.forEach(useCourse);

  const remaining = filtered.filter(course => {
    const code = normalize(course);
    if (used.has(code) || excluded.has(code)) return false;
    return code.startsWith("ANTH");
  });
  const electives = remaining.slice(0, structure.electiveRequired || 0);

  return {
    introPrimary: Boolean(introPrimary),
    introSecondary: Boolean(introSecond),
    midCourse: Boolean(midCourse),
    seminar: Boolean(seminar),
    extra300Count: extra300.length,
    extra300Required: structure.extra300Required || 0,
    electivesCompleted: electives.length,
    electivesRequired: structure.electiveRequired || 0,
    experienceComplete: experienceComplete || !structure.experienceRequired,
    experienceRequired: structure.experienceRequired || false,
  };
};

const computeEnglishProgress = (courses, structure) => {
  const normalize = (course) => (course.code || "").trim().toUpperCase();
  const getLevel = (course) => Number(course.level || 0);
  const isEnglishCourse = (course) => {
    const dept = detectDepartmentFromCode(course.code);
    if (dept === "English") return true;
    if (Array.isArray(course.depts)) return course.depts.includes("English");
    return normalize(course).startsWith("ENG");
  };

  const totalCourses = courses.length;
  const englishDeptCourses = courses.filter(isEnglishCourse).length;
  const upperLevelCourses = courses.filter(course => (course.level || 0) > 100).length;
  const level300Courses = courses.filter(course => {
    const level = getLevel(course);
    const code = normalize(course);
    if (code.includes("350")) return false;
    return level >= 300;
  }).length;

  return {
    totalCourses,
    englishDeptCourses,
    upperLevelCourses,
    level300Courses,
  };
};

const computeAfrProgress = (courses, structure = {}) => {
  const introCompleted = courses.some(course =>
    (structure.introOptions || []).some(opt => codesMatch(course.code, opt))
  );
  const level300Count = courses.filter(course => (course.level || 0) >= 300).length;
  return {
    introCompleted,
    level300Count,
    level300Required: structure.level300Required || 2,
    totalCourses: courses.length,
  };
};

const computeAmstProgress = (courses, structure = {}) => {
  const introCompleted = courses.some(course =>
    (structure.introOptions || []).some(opt => codesMatch(course.code, opt))
  );
  const coreCourses = courses.filter(course => detectDepartmentFromCode(course.code) === "American Studies");
  const coreCount = coreCourses.length;
  const level300Count = coreCourses.filter(course => (course.level || 0) >= 300).length;
  const electivesCount = Math.max(courses.length - coreCount, 0);
  return {
    introCompleted,
    coreCount,
    coreRequired: structure.coreCoursesRequired || 5,
    level300Count,
    level300Required: structure.level300Required || 2,
    electivesCount,
    electivesRequired: structure.electiveCoursesRequired || 3,
    totalCourses: courses.length,
  };
};

// ---- Main App ----
const resetProgramState = (data) => {
  if (!data || data.programStateMigrated) return data;
  return {
    ...data,
    programSelections: DEFAULT_PROGRAM_SELECTIONS.map(entry => ({ ...entry })),
    primaryMajor: "",
    secondaryMajor: "",
    showSecondaryMajor: false,
    selectedMinor: "",
    showMinorPlanner: false,
    programStateMigrated: true,
  };
};

export default function App() {
  const savedDataRef = useRef(resetProgramState(loadFromLocalStorage()));
  const savedData = savedDataRef.current || null;
  const initialStartYear = savedData?.startYear || 2024;
  const rawProgramSelections = ensureProgramSelections(savedData?.programSelections);
  const alignInitialProgramSelections = (selections, snapshot) => {
    const next = selections.map(entry => ({ ...entry }));
    const primarySlot = next.find(entry => entry.id === "programA");
    if (primarySlot) {
      if (snapshot?.primaryMajor) {
        primarySlot.type = "Major";
        primarySlot.value = snapshot.primaryMajor;
      }
    }
    const secondarySlot = next.find(entry => entry.id === "programB");
    if (secondarySlot) {
      if (snapshot?.showSecondaryMajor && snapshot?.secondaryMajor) {
        secondarySlot.type = "Major";
        secondarySlot.value = snapshot.secondaryMajor;
      } else if (snapshot?.showMinorPlanner && snapshot?.selectedMinor) {
        secondarySlot.type = "Minor";
        secondarySlot.value = snapshot.selectedMinor;
      } else if (!snapshot?.programSelections) {
        secondarySlot.type = "None";
        secondarySlot.value = "";
      }
    }
    return next;
  };
  const initialProgramSelections = alignInitialProgramSelections(rawProgramSelections, savedData);
  const getInitialCustomMinorRequirements = () => {
    const savedList = Array.isArray(savedData?.customMinorRequirements)
      ? savedData.customMinorRequirements.slice(0, MAX_CUSTOM_MINOR_REQUIREMENTS)
      : [];
    if (savedList.length >= DEFAULT_CUSTOM_MINOR_COUNT) return savedList;
    const missing = DEFAULT_CUSTOM_MINOR_COUNT - savedList.length;
    return [...savedList, ...Array(Math.max(missing, 0)).fill("")];
  };
  const [terms, setTerms] = useState(() => savedData?.terms || []);
  const [activeTermId, setActiveTermId] = useState(null);
  const [activeTab, setActiveTab] = useState(savedData?.activeTab || "plan");
  const [startYear, setStartYear] = useState(initialStartYear);
  const [programSelections, setProgramSelections] = useState(initialProgramSelections);
  const initialPrimaryMajor =
    savedData?.primaryMajor ||
    (initialProgramSelections.find(entry => entry.id === "programA" && entry.type === "Major")?.value || "");
  const initialSecondarySlot = initialProgramSelections.find(entry => entry.id === "programB");
  const initialSecondaryMajor =
    savedData?.secondaryMajor ||
    (initialSecondarySlot?.type === "Major" ? initialSecondarySlot.value || "" : "");
  const initialSelectedMinor =
    savedData?.selectedMinor ||
    (initialSecondarySlot?.type === "Minor" ? initialSecondarySlot.value || "" : "");
  const initialShowSecondaryMajor =
    typeof savedData?.showSecondaryMajor === "boolean"
      ? savedData.showSecondaryMajor
      : initialSecondarySlot?.type === "Major" && !!initialSecondarySlot.value;
  const initialShowMinorPlanner =
    typeof savedData?.showMinorPlanner === "boolean"
      ? savedData.showMinorPlanner
      : initialSecondarySlot?.type === "Minor" && !!initialSecondarySlot.value;

  const [primaryMajor, setPrimaryMajor] = useState(initialPrimaryMajor);
  const [secondaryMajor, setSecondaryMajor] = useState(initialSecondaryMajor);
  const [showSecondaryMajor, setShowSecondaryMajor] = useState(initialShowSecondaryMajor);
  const [selectedMinor, setSelectedMinor] = useState(initialSelectedMinor);
  const [showMinorPlanner, setShowMinorPlanner] = useState(initialShowMinorPlanner);
  const [yearLabels, setYearLabels] = useState(
    savedData?.yearLabels || Object.fromEntries(defaultYears.map((y) => [y.id, y.label]))
  );
  const [languageWaived, setLanguageWaived] = useState(savedData?.languageWaived || false);
  const [customMajorRequirements, setCustomMajorRequirements] = useState(
    () => savedData?.customMajorRequirements || Array(DEFAULT_CUSTOM_MAJOR_COUNT).fill("")
  );
  const [customMajors, setCustomMajors] = useState(() => ensureCustomMajorList(savedData?.customMajors));
  const [newCustomMajorName, setNewCustomMajorName] = useState("");
  const [customMinorRequirements, setCustomMinorRequirements] = useState(getInitialCustomMinorRequirements);
  const [customMinors, setCustomMinors] = useState(() => ensureCustomMinorList(savedData?.customMinors));
  const [newCustomMinorName, setNewCustomMinorName] = useState("");
  const [editingCustomMajorId, setEditingCustomMajorId] = useState(null);
  const [editingCustomMajorName, setEditingCustomMajorName] = useState("");
  const [editingCustomMinorId, setEditingCustomMinorId] = useState(null);
  const [editingCustomMinorName, setEditingCustomMinorName] = useState("");
  const [currentTermId, setCurrentTermId] = useState(savedData?.currentTermId || "");

  const termById = (id) => terms.find(t => t.id === id) || null;

  const updateCustomRequirement = (index, value) => {
    setCustomMajorRequirements(prev =>
      prev.map((entry, i) => (i === index ? value : entry))
    );
  };

  const addCustomRequirementRow = () => {
    setCustomMajorRequirements(prev => {
      if (prev.length >= MAX_CUSTOM_MAJOR_REQUIREMENTS) return prev;
      return [...prev, ""];
    });
  };

  const updateCustomMinorRequirement = (index, value) => {
    setCustomMinorRequirements(prev =>
      prev.map((entry, i) => (i === index ? value : entry))
    );
  };

  const addCustomMinorRequirementRow = () => {
    setCustomMinorRequirements(prev => {
      if (prev.length >= MAX_CUSTOM_MINOR_REQUIREMENTS) return prev;
      return [...prev, ""];
    });
  };

  const addCustomMajor = () => {
    const trimmed = newCustomMajorName.trim();
    if (!trimmed) return;
    if (customMajors.some(item => item.name.toLowerCase() === trimmed.toLowerCase())) return;
    const entry = { id: generateCustomMajorId(), name: trimmed };
    const newValue = createCustomMajorOptionValue(entry.id);
    setCustomMajors(prev => [...prev, entry]);
    if (!primaryMajor) {
      setPrimaryMajor(newValue);
    } else if (!showSecondaryMajor || secondaryMajor) {
      setPrimaryMajor(newValue);
    } else {
      setSecondaryMajor(newValue);
    }
    setNewCustomMajorName("");
  };

  const removeCustomMajor = (majorId) => {
    const valueToRemove = createCustomMajorOptionValue(majorId);
    setCustomMajors(prev => prev.filter(item => item.id !== majorId));
    setProgramSelections(prev =>
      prev.map(program =>
        program.value === valueToRemove ? { ...program, value: "" } : program
      )
    );
    setPrimaryMajor(prev => (prev === valueToRemove ? "Custom Major" : prev));
    setSecondaryMajor(prev => (prev === valueToRemove ? "" : prev));
    if (editingCustomMajorId === majorId) {
      setEditingCustomMajorId(null);
      setEditingCustomMajorName("");
    }
  };

  const startEditingCustomMajor = (major) => {
    setEditingCustomMajorId(major.id);
    setEditingCustomMajorName(major.name);
  };

  const cancelEditingCustomMajor = () => {
    setEditingCustomMajorId(null);
    setEditingCustomMajorName("");
  };

  const saveEditingCustomMajor = () => {
    if (!editingCustomMajorId) return;
    const trimmed = editingCustomMajorName.trim();
    if (!trimmed) return;
    if (customMajors.some(item =>
      item.id !== editingCustomMajorId && item.name.toLowerCase() === trimmed.toLowerCase()
    )) {
      return;
    }
    setCustomMajors(prev =>
      prev.map(item =>
        item.id === editingCustomMajorId ? { ...item, name: trimmed } : item
      )
    );
    setEditingCustomMajorId(null);
    setEditingCustomMajorName("");
  };

  const addCustomMinor = () => {
    const trimmed = newCustomMinorName.trim();
    if (!trimmed) return;
    if (customMinors.some(item => item.name.toLowerCase() === trimmed.toLowerCase())) return;
    const entry = { id: generateCustomMinorId(), name: trimmed };
    setCustomMinors(prev => [...prev, entry]);
    setSelectedMinor(createCustomMinorOptionValue(entry.id));
    setNewCustomMinorName("");
  };

  const removeCustomMinor = (minorId) => {
    const valueToRemove = createCustomMinorOptionValue(minorId);
    setCustomMinors(prev => prev.filter(item => item.id !== minorId));
    setProgramSelections(prev =>
      prev.map(program =>
        program.value === valueToRemove ? { ...program, value: "" } : program
      )
    );
    setSelectedMinor(prev => (prev === valueToRemove ? "Custom Minor" : prev));
    if (editingCustomMinorId === minorId) {
      setEditingCustomMinorId(null);
      setEditingCustomMinorName("");
    }
  };

  const startEditingCustomMinor = (minor) => {
    setEditingCustomMinorId(minor.id);
    setEditingCustomMinorName(minor.name);
  };

  const cancelEditingCustomMinor = () => {
    setEditingCustomMinorId(null);
    setEditingCustomMinorName("");
  };

  const saveEditingCustomMinor = () => {
    if (!editingCustomMinorId) return;
    const trimmed = editingCustomMinorName.trim();
    if (!trimmed) return;
    if (customMinors.some(item =>
      item.id !== editingCustomMinorId && item.name.toLowerCase() === trimmed.toLowerCase()
    )) {
      return;
    }
    setCustomMinors(prev =>
      prev.map(item =>
        item.id === editingCustomMinorId ? { ...item, name: trimmed } : item
      )
    );
    setEditingCustomMinorId(null);
    setEditingCustomMinorName("");
  };

  // Auto-save to localStorage whenever data changes
  useEffect(() => {
    const dataToSave = {
      terms,
      activeTab,
      startYear,
      yearLabels,
      languageWaived,
      programSelections,
      customMajorRequirements,
      customMajors,
      customMinorRequirements,
      customMinors,
      primaryMajor,
      secondaryMajor,
      showSecondaryMajor,
      selectedMinor,
      showMinorPlanner,
      currentTermId,
      programStateMigrated: true,
    };
    saveToLocalStorage(dataToSave);
  }, [terms, activeTab, startYear, yearLabels, languageWaived, programSelections, customMajorRequirements, customMajors, customMinorRequirements, customMinors, primaryMajor, secondaryMajor, showSecondaryMajor, selectedMinor, showMinorPlanner, currentTermId]);

  useEffect(() => {
    const primaryProgram = programSelections.find(program => program.id === "programA") || null;
    const secondaryProgram = programSelections.find(program => program.id === "programB") || null;

    const nextPrimary = primaryProgram?.type === "Major" ? primaryProgram.value || "" : "";
    if (primaryMajor !== nextPrimary) {
      setPrimaryMajor(nextPrimary);
    }

    if (secondaryProgram?.type === "Major") {
      if (!showSecondaryMajor) setShowSecondaryMajor(true);
      if (showMinorPlanner) setShowMinorPlanner(false);
      const nextSecondary = secondaryProgram.value || "";
      if (secondaryMajor !== nextSecondary) {
        setSecondaryMajor(nextSecondary);
      }
      if (selectedMinor) setSelectedMinor("");
    } else if (secondaryProgram?.type === "Minor") {
      if (!showMinorPlanner) setShowMinorPlanner(true);
      if (showSecondaryMajor) setShowSecondaryMajor(false);
      const nextMinor = secondaryProgram.value || "";
      if (selectedMinor !== nextMinor) {
        setSelectedMinor(nextMinor);
      }
      if (secondaryMajor) setSecondaryMajor("");
    } else {
      if (showSecondaryMajor) setShowSecondaryMajor(false);
      if (secondaryMajor) setSecondaryMajor("");
      if (showMinorPlanner) setShowMinorPlanner(false);
      if (selectedMinor) setSelectedMinor("");
    }
  }, [programSelections]);

  useEffect(() => {
    setProgramSelections(prev => {
      if (!Array.isArray(prev) || prev.length === 0) return prev;
      const next = prev.map(entry => ({ ...entry }));
      let changed = false;

      const assignSlot = (index, updates) => {
        const template = DEFAULT_PROGRAM_SELECTIONS[index] || {};
        const current = next[index] ? { ...next[index] } : { ...template };
        const updated = { ...current, ...updates };
        if (
          current.type !== updated.type ||
          current.value !== updated.value
        ) {
          next[index] = updated;
          changed = true;
        }
      };

      assignSlot(0, {
        type: primaryMajor ? "Major" : "None",
        value: primaryMajor || "",
      });

      if (showSecondaryMajor) {
        assignSlot(1, {
          type: "Major",
          value: secondaryMajor || "",
        });
      } else if (showMinorPlanner) {
        assignSlot(1, {
          type: "Minor",
          value: selectedMinor || "",
        });
      } else {
        assignSlot(1, {
          type: "None",
          value: "",
        });
      }

      return changed ? next : prev;
    });
  }, [primaryMajor, secondaryMajor, showSecondaryMajor, selectedMinor, showMinorPlanner]);

  const updateSlot = (termId, slotIdx, updater) => {
    setTerms(prev =>
      prev.map(t =>
        t.id !== termId
          ? t
          : {
              ...t,
              slots: t.slots.map((s, i) =>
                i === slotIdx ? updater(s || newSlot()) : s
              ),
            }
      )
    );
  };

  const addSlot = (termId) => {
    setTerms(prev =>
      prev.map(t =>
        t.id !== termId
          ? t
          : { ...t, slots: [...t.slots, newSlot()] }
      )
    );
  };

  const removeSlot = (termId, slotIdx) => {
    setTerms(prev =>
      prev.map(t =>
        t.id !== termId
          ? t
          : { ...t, slots: t.slots.filter((_, i) => i !== slotIdx) }
      )
    );
  };

  const removeTerm = (termId) => {
    setTerms(prev => prev.filter(t => t.id !== termId));
    if (activeTermId === termId) setActiveTermId(null);
  };

  const addTerm = (year, season) => {
    const baseYearTerms = terms.filter(t => t.year === year);
    const latestCalendarYear = baseYearTerms.length > 0 
      ? Math.max(...baseYearTerms.map(t => t.calendarYear || startYear))
      : startYear + (year - 1);

    let actualYear;
    if (season === 'Fall' || season === 'Winter') {
      actualYear = startYear + (year - 1);
    } else if (season === 'Spring' || season === 'Summer') {
      actualYear = startYear + year;
    }

    const seasonId = season === 'Summer' ? 'U' : season === 'Winter' ? 'W' : season.charAt(0);
    const newTerm = {
      id: `Y${year}-${seasonId}`,
      label: `${season} ${actualYear}`,
      year: year,
      season: season,
      calendarYear: actualYear,
      slots: [newSlot(), newSlot()]
    };

    setTerms(prev => [...prev, newTerm]);
  };

  const autoFillYears = () => {
    const defaults = getDefaultTerms(startYear);
    setTerms(defaults);
    setActiveTermId(null);
    setCurrentTermId("");
  };

  const determineAutoCurrentTermId = useCallback(() => {
    if (!terms.length) return "";
    const month = new Date().getMonth(); // 0-based
    const year = new Date().getFullYear();
    const seasonFromMonth = (m) => {
      if (m === 0) return "Winter";
      if (m >= 1 && m <= 4) return "Spring";
      if (m >= 5 && m <= 7) return "Summer";
      return "Fall";
    };
    const targetSeason = seasonFromMonth(month);
    const targetYear = (() => {
      if (targetSeason === "Fall") return year;
      if (targetSeason === "Winter") return year;
      if (targetSeason === "Spring") return year;
      if (targetSeason === "Summer") return year;
      return year;
    })();
    const seasonOrder = { Fall: 1, Winter: 2, Spring: 3, Summer: 4 };
    const sorted = [...terms].sort((a, b) => {
      if (a.calendarYear !== b.calendarYear) return (a.calendarYear || 0) - (b.calendarYear || 0);
      return (seasonOrder[a.season] || 0) - (seasonOrder[b.season] || 0);
    });
    const exact = sorted.find(term =>
      term.season === targetSeason && (term.calendarYear || 0) === targetYear
    );
    if (exact) return exact.id;
    const future = sorted.find(term =>
      (term.calendarYear || 0) > targetYear ||
      ((term.calendarYear || 0) === targetYear && (seasonOrder[term.season] || 0) > (seasonOrder[targetSeason] || 0))
    );
    if (future) return future.id;
    return sorted[sorted.length - 1]?.id || "";
  }, [terms]);

  useEffect(() => {
    if (currentTermId && terms.some(term => term.id === currentTermId)) return;
    const guessed = determineAutoCurrentTermId();
    if (guessed) {
      setCurrentTermId(guessed);
    }
  }, [terms, currentTermId, determineAutoCurrentTermId]);

  const updateTermYear = (termId, newCalendarYear) => {
    setTerms(prev => prev.map(t => {
      if (t.id !== termId) return t;
      const season = t.season || (t.id.includes('-F') ? 'Fall' : t.id.includes('-S') ? 'Spring' : t.id.includes('-U') ? 'Summer' : 'Winter');

      return {
        ...t,
        calendarYear: newCalendarYear,
        label: `${season} ${newCalendarYear}`
      };
    }));
  };

  const updateStartYear = (year) => {
    if (!Number.isFinite(year)) return;
    setStartYear(year);
    setTerms(prev => {
      if (!prev.length) return prev;
      return prev.map(term => {
        const derivedSeason =
          term.season ||
          (term.id?.includes("-F") ? "Fall" :
           term.id?.includes("-S") ? "Spring" :
           term.id?.includes("-U") ? "Summer" :
           term.id?.includes("-W") ? "Winter" : "Fall");
        const baseYear = Number.isFinite(term.year) ? term.year : (() => {
          const match = term.id?.match(/Y(\d+)-/);
          return match ? parseInt(match[1], 10) : 1;
        })();
        const adjustedYear = baseYear || 1;
        const actualYear =
          derivedSeason === "Fall" || derivedSeason === "Winter"
            ? year + (adjustedYear - 1)
            : year + adjustedYear;
        return {
          ...term,
          calendarYear: actualYear,
          label: `${derivedSeason} ${actualYear}`,
          season: derivedSeason,
          year: adjustedYear,
        };
      });
    });
    setActiveTermId(null);
  };

  const updateYearLabel = (yearId, newLabel) => {
    setYearLabels(prev => ({
      ...prev,
      [yearId]: newLabel
    }));
  };

  const years = defaultYears.map(y => ({
    ...y,
    label: yearLabels[y.id] || y.label
  }));

  const baseMajorNames = useMemo(() => {
    const names = Object.keys(majorRequirements).sort((a, b) => a.localeCompare(b));
    if (names.includes("Custom Major")) {
      return ["Custom Major", ...names.filter(name => name !== "Custom Major")];
    }
    return names;
  }, []);

  const baseMajorOptions = useMemo(
    () =>
      baseMajorNames.map(name => ({
        value: name,
        label: name,
        isCustom: name === "Custom Major",
      })),
    [baseMajorNames]
  );

  const customMajorOptions = useMemo(
    () =>
      customMajors.map(item => ({
        value: createCustomMajorOptionValue(item.id),
        label: `${item.name} (Custom)`,
        isCustom: true,
        name: item.name,
      })),
    [customMajors]
  );

  const majorOptions = useMemo(() => {
    if (!customMajorOptions.length) return baseMajorOptions;
    const options = [];
    let inserted = false;
    baseMajorOptions.forEach(option => {
      options.push(option);
      if (!inserted && option.value === "Custom Major") {
        options.push(...customMajorOptions);
        inserted = true;
      }
    });
    if (!inserted) {
      return [...customMajorOptions, ...options];
    }
    return options;
  }, [baseMajorOptions, customMajorOptions]);

  const baseMinorOptions = useMemo(
    () => [{ value: "Custom Minor", label: "Custom Minor", isCustom: true }],
    []
  );

  const customMinorOptions = useMemo(
    () =>
      customMinors.map(item => ({
        value: createCustomMinorOptionValue(item.id),
        label: `${item.name} (Custom Minor)`,
        isCustom: true,
        name: item.name,
      })),
    [customMinors]
  );

  const minorOptions = useMemo(() => {
    if (!customMinorOptions.length) return baseMinorOptions;
    return [...baseMinorOptions, ...customMinorOptions];
  }, [baseMinorOptions, customMinorOptions]);

  const MajorSelect = ({ value, onChange, placeholder = "Select a major", name = "majorSelect" }) => (
    <select
      name={name}
      autoComplete="off"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded border px-3 py-1 text-sm"
    >
      <option value="">{placeholder}</option>
      {majorOptions.map(option => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );

  const MinorSelect = ({ value, onChange, placeholder = "Select a minor", name = "minorSelect" }) => (
    <select
      name={name}
      autoComplete="off"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded border px-3 py-1 text-sm"
    >
      <option value="">{placeholder}</option>
      {minorOptions.map(option => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );

  const programRequirementOptionsMap = useMemo(() => {
    const entries = programSelections.map(program => [
      program.id,
      program.value ? getRequirementOptionsForMajor(program.value) : [],
    ]);
    return Object.fromEntries(entries);
  }, [programSelections]);

  const allCourses = useMemo(() => {
    const collected = [];
    terms.forEach(t => {
      t.slots.forEach(s => {
        if (s && (s.code || s.title)) {
          collected.push(s);
        }
      });
    });
    return collected;
  }, [terms]);

  const updateProgramSelection = (id, field, value) => {
    setProgramSelections(prev =>
      prev.map(program => {
        if (program.id !== id) return program;
        const updated = { ...program, [field]: value };
        if (field === "type") {
          if (value === "None") {
            updated.value = "";
          } else if (value === "Minor") {
            if (!minorOptions.some(option => option.value === updated.value)) {
              updated.value = "";
            }
          } else {
            if (!majorOptions.some(option => option.value === updated.value)) {
              updated.value = "";
            }
          }
        }
        return updated;
      })
    );
  };

  const toggleProgramExperience = (programId) => {
    setProgramSelections(prev =>
      prev.map(program =>
        program.id === programId
          ? { ...program, experienceComplete: !program.experienceComplete }
        : program
      )
    );
  };

const getAssignedRequirementId = (course, programId) =>
  programId ? course.programs?.[programId]?.requirement || "" : "";

const countAssignedRequirement = (courses, programId, requirementId) => {
  if (!programId || !requirementId) return 0;
  return courses.filter(course => getAssignedRequirementId(course, programId) === requirementId).length;
};

const computeRequirementProgress = (programId, requirementOptions, programCourses) => {
  if (!requirementOptions.length) return { pct: 0, subtitle: "Awaiting assignments" };
  const total = requirementOptions.length;
  let sum = 0;
  requirementOptions.forEach(opt => {
    const required = opt.required || 1;
    const assigned = countAssignedRequirement(programCourses, programId, opt.id);
    sum += Math.min(assigned / required, 1);
  });
  const pct = clamp01(sum / total);
  return { pct, subtitle: `${Math.round(pct * 100)}% complete` };
};

const getCoursesForProgram = (programId) => {
  const flagged = allCourses.filter(course => course.programs?.[programId]);
  if (flagged.length > 0) return flagged;
  return allCourses;
};

const getMajorRelevantCourses = (majorValue, allCourses, programSelections) => {
  if (!majorValue) return [];
  const normalizedKey = resolveMajorConfigKey(majorValue);
  const majorReq = normalizedKey ? majorRequirements[normalizedKey] : null;
  if (!majorReq) return [];
  const matchedPrograms = programSelections.filter(program => program.value === majorValue);
  const isCourseFlagged = (course) =>
    matchedPrograms.some(program => course.programs?.[program.id]);
  const flagged = matchedPrograms.length ? allCourses.filter(isCourseFlagged) : [];
  const combined = [...flagged];
  const addCourse = (course) => {
    if (!course) return;
    if (!combined.includes(course)) combined.push(course);
  };
  (majorReq.requiredCourses || []).forEach(reqCode => {
    const match = allCourses.find(course => codesMatch(course.code, reqCode));
    if (match) addCourse(match);
  });

  if (majorReq.csStructure) {
    const addMatches = (options = []) => {
      if (!options.length) return;
      allCourses.forEach(course => {
        if (options.some(opt => codesMatch(course.code, opt))) addCourse(course);
      });
    };
    addMatches(majorReq.csStructure.introOptions);
    (majorReq.csStructure.coreGroups || []).forEach(group => addMatches(group.options));
  }

  if (combined.length === 0) {
    const fallbackDept = (() => {
    if (SUBJECT_NAME_SET.has(majorValue)) return majorValue;
      const departmentHint = programDepartment(majorValue);
      if (departmentHint) return departmentHint;
      return null;
    })();
    if (fallbackDept) {
      return allCourses.filter(course => detectDepartmentFromCode(course.code) === fallbackDept);
    }
    return [];
  }
  return combined;
};

const getMajorRequirementTarget = (majorName) => {
  const normalizedKey = resolveMajorConfigKey(majorName);
  const config = normalizedKey ? majorRequirements[normalizedKey] : null;
  if (!config) return 0;
  if (config.unitTarget) return config.unitTarget;
  if (config.englishStructure?.totalRequired) return config.englishStructure.totalRequired;
  if (config.mathStructure?.advancedTotalRequired) return config.mathStructure.advancedTotalRequired;
  if (config.econStructure?.totalCoursesRequired) return config.econStructure.totalCoursesRequired;
  if (config.bioStructure) return 9;
  if (config.anthroStructure) return 9;
  if (config.csStructure) {
    const coreCount = (config.csStructure.coreGroups?.length || 0) + (config.csStructure.introOptions ? 1 : 0);
    return coreCount + (config.csStructure.level300Required || 0) + (config.csStructure.electivesRequired || 0);
  }
  const required = config.requiredCourses?.length || 0;
  const electives = config.electiveCourses || 0;
  return required + electives;
};

const ProgramStatRow = ({
  label,
  value,
  className = "",
  labelClass = "text-[0.55rem] uppercase tracking-wide text-slate-500",
  valueClass = "text-base font-semibold text-slate-900",
}) => (
  <div className={cx("flex h-full w-full flex-col items-center justify-between gap-1 text-center", className)}>
    <span className={labelClass}>{label}</span>
    <span className={valueClass}>{value}</span>
  </div>
);

const formatUnitDisplay = (value) => {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
};

const getTotalUnitsStat = (majorName, courses = []) => {
  if (!majorName) return null;
  const target = getMajorRequirementTarget(majorName);
  if (!target) return null;
  const total = courses.reduce((sum, course) => {
    const credits = Number(course.credits);
    if (Number.isFinite(credits) && credits > 0) return sum + credits;
    return sum + 1;
  }, 0);
  const formattedTotal = formatUnitDisplay(total);
  return {
    label: "Total units",
    value: `${formattedTotal}/${target}`,
    earned: total,
    target,
  };
};


  // ---- Progress calculations ----
  const progress = useMemo(() => {
    const allRequirements = [...seedRequirements, ...internalRequirements];
    const counts = Object.fromEntries(allRequirements.map(r => [r.id, 0]));
    let totalUnits = 0;
    let level300 = 0;

    terms.forEach(t =>
      t.slots.forEach(s => {
        if (!(s.code || s.title)) return;
        const credits = Number(s.credits || 0);
        totalUnits += credits;
        if (s.level >= 300) level300 += 1;
        s.tags.forEach(tag => {
          if (!counts[tag]) counts[tag] = 0;
          counts[tag] += 1;
        });
      })
    );

    counts.UNITS = totalUnits;
    counts["300"] = level300;

    // Calculate group totals based on Wellesley's actual requirements
    const c = (id) => counts[id] || 0;

    // Group 1: LL + ARTS (need at least 1 from each, 3 total)
    counts.GROUP1_TOTAL = c("LL") + c("ARTS");

    // Group 2: SBA (required) + 2 from EC/REP/HST (3 total)  
    counts.GROUP2_TOTAL = c("SBA") + c("EC") + c("REP") + c("HST");

    // Group 3: NPS + MM + additional from either (3 total, at least 1 lab)
    counts.GROUP3_TOTAL = c("NPS") + c("MM");

    const detail = seedRequirements.map((r) => {
      let have = counts[r.id] || 0;
      let targetCount = r.targetCount ?? 0;
      const safeTarget = targetCount || 1;
      let pct = clamp01(have / safeTarget);
      const waived = r.id === "LANG" && languageWaived;
      if (waived) {
        have = 0;
        targetCount = 0;
        pct = 1;
      }

      // Special logic for group requirements
      if (r.id === "GROUP1_TOTAL") {
        // Must have at least 1 LL AND 1 ARTS, plus total of 3
        const hasLL = c("LL") >= 1;
        const hasARTS = c("ARTS") >= 1;
        const hasTotal = counts.GROUP1_TOTAL >= 3;
        pct = (hasLL && hasARTS && hasTotal) ? 1 : clamp01(counts.GROUP1_TOTAL / 3);
      } else if (r.id === "GROUP2_TOTAL") {
        // Must have SBA + at least 2 from EC/REP/HST
        const hasSBA = c("SBA") >= 1;
        const ehrCount = Math.min(c("EC") + c("REP") + c("HST"), 2);
        const total = (hasSBA ? 1 : 0) + ehrCount;
        have = total;
        pct = clamp01(total / 3);
      } else if (r.id === "GROUP3_TOTAL") {
        // Must have NPS + MM + at least 1 more, with at least 1 lab
        const hasNPS = c("NPS") >= 1;
        const hasMM = c("MM") >= 1;
        const hasLab = c("LAB") >= 1;
        const additionalNeeded = Math.max(0, 3 - c("NPS") - c("MM"));
        const hasEnoughTotal = counts.GROUP3_TOTAL >= 3;
        have = counts.GROUP3_TOTAL + (hasLab && !hasMM && !hasNPS ? 1 : 0); // Count lab separately if needed
        pct = (hasNPS && hasMM && hasLab && hasEnoughTotal) ? 1 : clamp01(counts.GROUP3_TOTAL / 3);
      }

      return { ...r, have, targetCount, pct, waived };
    });

    const overall = detail.reduce((sum, r) => sum + r.pct, 0) / detail.length;

    // Simplified group calculation for display
    const g1 = clamp01(counts.GROUP1_TOTAL / 3);
    const g2 = clamp01(counts.GROUP2_TOTAL / 3); 
    const g3 = clamp01(counts.GROUP3_TOTAL / 3);

    return {
      detail,
      counts,
      overall,
      totalUnits,
      dist3x3: { g1, g2, g3 },
    };
  }, [terms, languageWaived]);

  const getReq = (id) =>
    progress.detail.find((r) => r.id === id) || {
      have: 0,
      targetCount: 1,
      pct: 0,
    };

  const canRemoveTerm = (termId) => {
    const maxYear = Math.max(...terms.map(t => t.year));
    const term = termById(termId);
    // Allow removal of any term from the highest year, or any Summer/Winter term
    return term && (term.year === maxYear || term.season === 'Summer' || term.season === 'Winter');
  };

  const renderMajorIntro = (majorReq) => {
    if (!majorReq) return null;
    if (!majorReq.prerequisites) return null;
    return (
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[0.7rem] text-amber-900">
        <div className="text-[0.6rem] font-semibold uppercase tracking-wide text-amber-800">
          Prerequisites
        </div>
        <p className="mt-1">{majorReq.prerequisites}</p>
      </div>
    );
  };

  const renderPlan = () => {
    const seasonOrder = { Fall: 1, Winter: 2, Spring: 3, Summer: 4 };
    const sortedTerms = [...terms]
      .filter(Boolean)
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return (seasonOrder[a.season] || 0) - (seasonOrder[b.season] || 0);
      });
    const sortedTermIds = sortedTerms.map(term => term.id);
    const currentIndex = currentTermId ? sortedTermIds.indexOf(currentTermId) : -1;
    const termStatuses = {};
    sortedTermIds.forEach((id, idx) => {
      let status = "unspecified";
      if (currentIndex >= 0) {
        if (idx < currentIndex) status = "past";
        else if (idx === currentIndex) status = "current";
        else status = "future";
      }
      termStatuses[id] = status;
    });

    const secondaryMode = showSecondaryMajor ? "Major" : showMinorPlanner ? "Minor" : "None";
    const handleSecondaryModeChange = (mode) => {
      if (mode === "Major") {
        setShowSecondaryMajor(true);
        setShowMinorPlanner(false);
      } else if (mode === "Minor") {
        setShowSecondaryMajor(false);
        setShowMinorPlanner(true);
      } else {
        setShowSecondaryMajor(false);
        setShowMinorPlanner(false);
      }
    };

    return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="rounded-lg border bg-white px-3 py-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <label className="font-medium text-slate-700 whitespace-nowrap" htmlFor="start-year-input">
              Set College Start Year:
            </label>
            <input
              id="start-year-input"
              type="number"
              name="startYear"
              autoComplete="off"
              value={startYear}
              onChange={(e) => updateStartYear(parseInt(e.target.value, 10))}
              className="w-20 rounded border px-2 py-1"
              min="2020"
              max="2030"
            />
            <button
              type="button"
              onClick={autoFillYears}
              className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50"
            >
              Confirm
            </button>
          </div>
          <div className="mt-2 border-t border-slate-100 pt-2">
            <div className="flex flex-wrap gap-3 pb-1">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <label
                  className="text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500"
                  htmlFor="program-1-select"
                >
                  Program 1
                </label>
                <select
                  id="program-1-select"
                  name="program1"
                  autoComplete="off"
                  className="min-w-[10rem] rounded border px-2 py-1 text-sm"
                  value={primaryMajor}
                  onChange={(e) => setPrimaryMajor(e.target.value)}
                >
                  <option value="">Select</option>
                  {majorOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <label
                  className="text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500"
                  htmlFor="program-2-mode"
                >
                  Program 2
                </label>
                <select
                  id="program-2-mode"
                  name="program2Mode"
                  autoComplete="off"
                  className="w-20 rounded border px-2 py-1 text-sm"
                  value={secondaryMode}
                  onChange={(e) => handleSecondaryModeChange(e.target.value)}
                >
                  <option value="None">None</option>
                  <option value="Major">Major</option>
                  <option value="Minor">Minor</option>
                </select>
                {secondaryMode !== "None" && (
                  <select
                    id="program-2-select"
                    name="program2"
                    autoComplete="off"
                    className="min-w-[10rem] rounded border px-2 py-1 text-sm"
                    value={secondaryMode === "Major" ? secondaryMajor : selectedMinor}
                    onChange={(e) => {
                      if (secondaryMode === "Major") {
                        setSecondaryMajor(e.target.value);
                      } else {
                        setSelectedMinor(e.target.value);
                      }
                    }}
                  >
                    <option value="">Select</option>
                    {(secondaryMode === "Major" ? majorOptions : minorOptions).map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>
        </div>

        {years.map(y => {
          const fallId = `Y${y.id}-F`;
          const springId = `Y${y.id}-S`;
          const summerId = `Y${y.id}-U`;
          const winterId = `Y${y.id}-W`;
          const fall = termById(fallId);
          const spring = termById(springId);
          const summer = termById(summerId);
          const winter = termById(winterId);

          return (
            <div key={y.id} className="rounded-2xl border bg-white/70 p-3">
              <div className="mb-2 flex items-center justify-between">
                <EditableYearLabel year={y} onUpdate={updateYearLabel} />
                <div className="flex gap-1 text-xs">
                  {!fall && (
                    <button
                      onClick={() => addTerm(y.id, 'Fall')}
                      className="rounded px-2 py-1 text-slate-600 bg-slate-100 hover:bg-slate-200"
                    >
                      + Fall
                    </button>
                  )}
                  {!spring && (
                    <button
                      onClick={() => addTerm(y.id, 'Spring')}
                      className="rounded px-2 py-1 text-slate-600 bg-slate-100 hover:bg-slate-200"
                    >
                      + Spring
                    </button>
                  )}
                  {!summer && (
                    <button
                      onClick={() => addTerm(y.id, 'Summer')}
                      className="rounded px-2 py-1 text-slate-600 bg-slate-100 hover:bg-slate-200"
                    >
                      + Summer
                    </button>
                  )}
                  {!winter && (
                    <button
                      onClick={() => addTerm(y.id, 'Winter')}
                      className="rounded px-2 py-1 text-slate-600 bg-slate-100 hover:bg-slate-200"
                    >
                      + Winter
                    </button>
                  )}
                </div>
              </div>
              <div className="grid gap-2 grid-cols-2">
                {fall && (
                  <TermSummaryCard
                    term={fall}
                    onOpen={() => setActiveTermId(fall.id)}
                    onRemove={() => removeTerm(fall.id)}
                    canRemove={canRemoveTerm(fall.id)}
                    onYearChange={updateTermYear}
                    status={termStatuses[fall.id] || "unspecified"}
                  />
                )}
                {winter && (
                  <TermSummaryCard
                    term={winter}
                    onOpen={() => setActiveTermId(winter.id)}
                    onRemove={() => removeTerm(winter.id)}
                    canRemove={canRemoveTerm(winter.id)}
                    onYearChange={updateTermYear}
                    status={termStatuses[winter.id] || "unspecified"}
                  />
                )}
                {spring && (
                  <TermSummaryCard
                    term={spring}
                    onOpen={() => setActiveTermId(spring.id)}
                    onRemove={() => removeTerm(spring.id)}
                    canRemove={canRemoveTerm(spring.id)}
                    onYearChange={updateTermYear}
                    status={termStatuses[spring.id] || "unspecified"}
                  />
                )}
                {summer && (
                  <TermSummaryCard
                    term={summer}
                    onOpen={() => setActiveTermId(summer.id)}
                    onRemove={() => removeTerm(summer.id)}
                    canRemove={canRemoveTerm(summer.id)}
                    onYearChange={updateTermYear}
                    status={termStatuses[summer.id] || "unspecified"}
                  />
                )}
              </div>
            </div>
          );
        })}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border bg-white p-3 text-[0.75rem]">
            <div className="mb-2 text-sm font-semibold text-slate-900">
              Distribution Groups (3-3-3)
            </div>
            <MiniReqBar label="Group 1: Humanities & Arts" have={getReq("GROUP1_TOTAL").have} target={3} />
            <div className="text-[0.6rem] text-slate-500 ml-2 mb-2">
              (≥1 Language/Lit + ≥1 Arts, 3 total)
            </div>
            <MiniReqBar label="Group 2: Social Sciences" have={getReq("GROUP2_TOTAL").have} target={3} />
            <div className="text-[0.6rem] text-slate-500 ml-2 mb-2">
              (1 SBA + 2 from EC/REP/HST)
            </div>
            <MiniReqBar label="Group 3: Science & Math" have={getReq("GROUP3_TOTAL").have} target={3} />
            <div className="text-[0.6rem] text-slate-500 ml-2">
              (1 Science + 1 Math + 1 more, ≥1 lab)
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-3 text-[0.75rem]">
            <div className="mb-2 text-sm font-semibold text-slate-900">
              Other Requirements
            </div>
            <MiniReqBar label="First-Year Writing" have={getReq("WRIT").have} target={1} />
            {(() => {
              const langReq = getReq("LANG");
              return (
                <MiniReqBar
                  label={`Foreign Language${languageWaived ? " (Waived)" : ""}`}
                  have={langReq.have}
                  target={langReq.targetCount}
                  pct={langReq.pct}
                />
              );
            })()}
            <MiniReqBar label="Quantitative Reasoning" have={getReq("QR").have} target={1} />
            <MiniReqBar label="300-level Courses" have={getReq("300").have} target={4} />
            <div className="mb-2">
              <div className="flex items-center justify-between text-[0.7rem]">
                <span>
                  Physical Education*
                  <span className="ml-1 text-[0.6rem] text-slate-500">(*One PE class = 4 units)</span>
                </span>
                <span className="text-[0.65rem]">
                  {getReq("PE").have}/{getReq("PE").targetCount}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{ width: `${getReq("PE").pct * 100}%` }}
                />
              </div>
            </div>
            <MiniReqBar label="Experiential Learning" have={getReq("EXP").have} target={2} />
          </div>
        </div>
        </div>

      <div className="space-y-3">
        <div className="rounded-2xl border bg-white p-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">
              Degree snapshot
            </div>
          </div>
          <div className="flex justify-around gap-3">
            <RingStat
              pct={progress.totalUnits / 32}
              label="Units toward 32"
              subtitle={`${progress.totalUnits.toFixed(1)} / 32`}
            />
            {(() => {
              const distTotals = distributionRequirements.reduce(
                (acc, req) => {
                  const r = getReq(req.id);
                  return {
                    have: acc.have + (r.have || 0),
                    target: acc.target + (r.targetCount || 0),
                  };
                },
                { have: 0, target: 0 }
              );
              const pct = distTotals.target ? clamp01(distTotals.have / distTotals.target) : 0;
              return (
                <RingStat
                  pct={pct}
                  label="Distribution progress"
                  subtitle={`${distTotals.have}/${distTotals.target}`}
                />
              );
            })()}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-3 text-[0.75rem]">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">Programs & majors</div>
            <button
              type="button"
              onClick={() => setActiveTab("major")}
              className="rounded-full border border-slate-200 px-3 py-1 text-[0.65rem] font-medium text-slate-600 hover:border-slate-300"
            >
              Open major tab
            </button>
          </div>
          <div className="space-y-3">
            {programSelections.map(program => {
              const programCourses = program.value ? getCoursesForProgram(program.id) : [];
              const displayCourses = program.value ? getMajorRelevantCourses(program.value, allCourses, programSelections) : [];
              const summary = program.value ? summarizeProgramProgress(program.value, displayCourses, program) : null;
              const totalUnitsStat = program.value ? getTotalUnitsStat(program.value, displayCourses) : null;
              const requirementOptions = programRequirementOptionsMap[program.id] || [];
              const requirementProgress = program.value && requirementOptions.length
                ? computeRequirementProgress(program.id, requirementOptions, programCourses)
                : { pct: 0, subtitle: program.value ? "Mark requirements" : "No program" };
              const totalTarget = program.value ? getMajorRequirementTarget(program.value) : 0;
              const fallbackUnits = totalUnitsStat || (totalTarget ? { earned: 0, target: totalTarget } : null);
              const progressLabel = program.type === "Minor" ? "Minor progress" : "Major progress";
              const buildProgramRingData = (stat = totalUnitsStat || fallbackUnits) => {
                if (stat?.target) {
                  const earned = stat.earned ?? 0;
                  const pct = stat.target ? clamp01(earned / stat.target) : 0;
                  return { pct, subtitle: `${formatUnitDisplay(earned)}/${stat.target} units` };
                }
                return { pct: requirementProgress.pct, subtitle: requirementProgress.subtitle };
              };
              const renderProgramRing = (stat) => {
                const ringData = buildProgramRingData(stat);
                return (
                  <div className="flex justify-center py-2">
                    <RingStat pct={ringData.pct} label={progressLabel} subtitle={ringData.subtitle} />
                  </div>
                );
              };
              return (
                <div key={program.id} className="rounded-xl border px-3 py-3">
                  <div className="flex flex-col gap-2 text-[0.65rem] sm:flex-row sm:items-center">
                    <div className="text-[0.65rem] font-semibold text-slate-600">
                      {program.label}
                    </div>
                    <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                      <select
                        name={`${program.id}-type`}
                        autoComplete="off"
                        className="w-full rounded-lg border px-2 py-1 sm:w-auto"
                        value={program.type}
                        onChange={(e) => updateProgramSelection(program.id, "type", e.target.value)}
                      >
                        {PROGRAM_TYPE_OPTIONS.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      <select
                        name={`${program.id}-program`}
                        autoComplete="off"
                        className="w-full rounded-lg border px-2 py-1 sm:flex-1"
                        value={program.value}
                        onChange={(e) => updateProgramSelection(program.id, "value", e.target.value)}
                        disabled={program.type === "None"}
                      >
                        <option value="">Select program</option>
                        {(program.type === "Minor" ? minorOptions : majorOptions).map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {program.type !== "None" && !program.value && (
                    <div className="mt-3 flex flex-col gap-2 text-[0.65rem] text-slate-500">
                      {renderProgramRing(fallbackUnits)}
                      <div>
                        Pick a program to see its requirement checklist here.
                      </div>
                    </div>
                  )}

                  {program.type !== "None" && program.value && summary && summary.isSpecial && summary.masProgress && (
                    <div className="mt-3 space-y-2 text-[0.65rem]">
                      {renderProgramRing(totalUnitsStat || fallbackUnits)}
                      {(() => {
                        const assignedIntro = countAssignedRequirement(programCourses, program.id, "mas-intro");
                        const assignedStudio = countAssignedRequirement(programCourses, program.id, "mas-studio");
                        const assignedCS = countAssignedRequirement(programCourses, program.id, "mas-cs");
                        const assignedElective = countAssignedRequirement(programCourses, program.id, "mas-electives");
                        const introHeuristic = (summary.masProgress.visualAnalysis.length > 0 ? 1 : 0) +
                          (summary.masProgress.studioFoundation.length > 0 ? 1 : 0) +
                          (summary.masProgress.csIntro.length > 0 ? 1 : 0);
                        const studioHeuristic = Math.min(summary.masProgress.studioCore.length, 3);
                        const csHeuristic = Math.min(summary.masProgress.csCore.length, 3);
                        const electiveHeuristic = Math.min(summary.masProgress.additional.length, 3);
                        const tiles = [
                          { id: "mas-intro", label: "Intro Courses", value: `${assignedIntro || introHeuristic}/3` },
                          { id: "mas-studio", label: "Studio Core", value: `${assignedStudio || studioHeuristic}/3` },
                          { id: "mas-cs", label: "CS Core", value: `${assignedCS || csHeuristic}/3` },
                          { id: "mas-electives", label: "MAS Electives", value: `${assignedElective || electiveHeuristic}/3` },
                        ];
                        return (
                          <div className="grid gap-2 sm:grid-cols-4">
                            {tiles.map(tile => (
                              <div
                                key={tile.label}
                                className="rounded-lg bg-slate-50 px-3 py-2 text-center flex h-full flex-col items-center justify-between gap-1"
                              >
                                <div className="text-[0.55rem] uppercase tracking-wide text-slate-500">
                                  {tile.label}
                                </div>
                                <div className="text-base font-semibold text-slate-900">
                                  {tile.value}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="rounded-lg border border-indigo-100 bg-white px-3 py-2 text-center flex flex-col justify-between">
                          <div className="text-[0.55rem] uppercase tracking-wide text-slate-500">Capstone Ready</div>
                          <div className="text-sm font-semibold text-slate-900">
                            {countAssignedRequirement(programCourses, program.id, "mas-capstone") > 0 ||
                            summary.masProgress.capstone.length > 0
                              ? "✓ Completed"
                              : "Not yet"}
                          </div>
                        </div>
                        <div className="rounded-lg border border-indigo-100 bg-white px-3 py-2 text-center flex flex-col justify-between">
                          <div className="text-[0.55rem] uppercase tracking-wide text-slate-500">Courses above 100</div>
                          <div className="text-base font-semibold text-slate-900">
                            {summary.masProgress.totals.upperLevelCourses}/8+
                          </div>
                        </div>
                        <div className="rounded-lg border border-indigo-100 bg-white px-3 py-2 text-center flex flex-col justify-between">
                          <div className="text-[0.55rem] uppercase tracking-wide text-slate-500">300-level courses</div>
                          <div className="text-base font-semibold text-slate-900">
                            {summary.masProgress.totals.level300Count}/2+
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {program.type !== "None" && program.value && summary && summary.isCS && summary.csProgress && (
                    <div className="mt-3 space-y-2 text-[0.65rem]">
                      {renderProgramRing()}
                      {(() => {
                        const totalCore = summary.csProgress.coreGroups.length;
                        const completedCore = summary.csProgress.coreGroups.filter(group => group.completed).length;
                        const assignedIntro = countAssignedRequirement(programCourses, program.id, "cs-intro");
                        const assignedCore = [
                          "cs-core-230",
                          "cs-core-231",
                          "cs-core-235",
                          "cs-core-240",
                        ].reduce((sum, id) => sum + countAssignedRequirement(programCourses, program.id, id), 0);
                        const assigned300 = countAssignedRequirement(programCourses, program.id, "cs-300");
                        const assignedElective = countAssignedRequirement(programCourses, program.id, "cs-elective");
                        const tiles = [
                          { label: "Intro", value: `${assignedIntro || (summary.csProgress.introCompleted ? 1 : 0)}/1` },
                          { label: "Core 200-level", value: `${assignedCore || completedCore}/${totalCore}` },
                          { label: "300-level CS", value: `${assigned300 || summary.csProgress.level300Count}/${summary.csProgress.level300Required}` },
                          { label: "CS Electives", value: `${assignedElective || summary.csProgress.electivesCount}/${summary.csProgress.electivesRequired}` },
                        ];
                        return (
                          <div className="grid gap-2 sm:grid-cols-4">
                            {tiles.map(tile => (
                              <div key={tile.label} className="rounded-lg bg-slate-50 px-3 py-2 text-center flex h-full flex-col items-center justify-between gap-1">
                                <div className="text-[0.55rem] uppercase tracking-wide text-slate-500">{tile.label}</div>
                                <div className="text-base font-semibold text-slate-900">{tile.value}</div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                      <div className="rounded-lg border border-slate-200 px-3 py-2 flex items-center justify-between text-[0.65rem]">
                        <div>
                          <div className="text-[0.55rem] uppercase text-slate-500">Math Supporting Course</div>
                          <div>MATH 225</div>
                        </div>
                        <div className={(countAssignedRequirement(programCourses, program.id, "cs-math") > 0 || summary.csProgress.mathSatisfied) ? "text-green-600 font-semibold" : "text-slate-500 font-semibold"}>
                          {(countAssignedRequirement(programCourses, program.id, "cs-math") > 0 || summary.csProgress.mathSatisfied) ? "✓ Done" : "Pending"}
                        </div>
                      </div>
                    </div>
                  )}

                  {program.type !== "None" && program.value && summary && summary.isBio && summary.bioProgress && (
                    <div className="mt-3 space-y-2 text-[0.65rem]">
                      {renderProgramRing()}
                      {(() => {
                        const introCellAssigned = countAssignedRequirement(programCourses, program.id, "bio-intro-cell");
                        const introOrgAssigned = countAssignedRequirement(programCourses, program.id, "bio-intro-organismal");
                        const groupCellAssigned = countAssignedRequirement(programCourses, program.id, "bio-group-cell");
                        const groupSystemsAssigned = countAssignedRequirement(programCourses, program.id, "bio-group-systems");
                        const groupCommunityAssigned = countAssignedRequirement(programCourses, program.id, "bio-group-community");
                        const groupFulfilled = [
                          groupCellAssigned > 0 || summary.bioProgress.groupCell,
                          groupSystemsAssigned > 0 || summary.bioProgress.groupSystems,
                          groupCommunityAssigned > 0 || summary.bioProgress.groupCommunity,
                        ].filter(Boolean).length;
                        const tiles = [
                          { label: "Cell Intro", value: introCellAssigned > 0 ? "✓" : summary.bioProgress.introCell ? "✓" : "0/1" },
                          { label: "Organismal Intro", value: introOrgAssigned > 0 ? "✓" : summary.bioProgress.introOrganismal ? "✓" : "0/1" },
                          { label: "200-level groups", value: `${groupFulfilled}/3` },
                          { label: "Extra 200-level", value: `${countAssignedRequirement(programCourses, program.id, "bio-extra-200") || summary.bioProgress.additional200}/${summary.bioProgress.additional200Required || 1}` },
                        ];
                        return (
                          <div className="grid gap-2 sm:grid-cols-4">
                            {tiles.map(tile => (
                              <div key={tile.label} className="rounded-lg bg-slate-50 px-3 py-2 text-center flex h-full flex-col items-center justify-between gap-1">
                                <div className="text-[0.55rem] uppercase tracking-wide text-slate-500">{tile.label}</div>
                                <div className="text-base font-semibold text-slate-900">{tile.value}</div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="rounded border px-3 py-2 text-center h-full">
                          <div className="text-[0.55rem] uppercase text-slate-500">300-level BISC</div>
                          <div className="text-base font-semibold text-slate-900">
                            {countAssignedRequirement(programCourses, program.id, "bio-300") || summary.bioProgress.level300}/{summary.bioProgress.level300Required}
                          </div>
                        </div>
                        <div className="rounded border px-3 py-2 text-center h-full">
                          <div className="text-[0.55rem] uppercase text-slate-500">BISC Elective</div>
                          <div className="text-base font-semibold text-slate-900">
                            {countAssignedRequirement(programCourses, program.id, "bio-elective") || summary.bioProgress.electiveCompleted}/{summary.bioProgress.electiveRequired}
                          </div>
                        </div>
                        <div className="rounded border px-3 py-2 text-center h-full">
                          <div className="text-[0.55rem] uppercase text-slate-500">Chemistry Courses</div>
                          <div className="text-sm font-semibold text-slate-900">
                            {(countAssignedRequirement(programCourses, program.id, "bio-chem-intro") > 0 || summary.bioProgress.chemIntroCompleted ? "Intro ✓" : "Intro")} / {(countAssignedRequirement(programCourses, program.id, "bio-chem-advanced") > 0 || summary.bioProgress.chemAdvancedCompleted ? "Adv ✓" : "Adv")}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {program.type !== "None" && program.value && summary && summary.isEnglish && summary.englishProgress && (
                    <div className="mt-3 space-y-2 text-[0.65rem]">
                      {renderProgramRing()}
                      {(() => {
                        const struct = summary.config?.englishStructure || {};
                        const topTiles = [
                          { label: "English dept courses", value: `${summary.englishProgress.englishDeptCourses}/${struct.deptMinimum || 8}` },
                          { label: "Upper-level (200+)", value: `${summary.englishProgress.upperLevelCourses}/${struct.upperLevelRequired || 7}` },
                          { label: "300-level seminars", value: `${summary.englishProgress.level300Courses}/${struct.level300Required || 2}` },
                        ];
                        const bottomTiles = [
                          { label: "Postcolonial / Ethnic", value: `${countAssignedRequirement(programCourses, program.id, "english-postcolonial")}/${struct.postcolonialRequired || 1}` },
                          { label: "Pre-1900", value: `${countAssignedRequirement(programCourses, program.id, "english-pre1900")}/${struct.pre1900Required || 3}` },
                          { label: "Pre-1800", value: `${countAssignedRequirement(programCourses, program.id, "english-pre1800")}/${struct.pre1800Required || 2}` },
                          ...(struct.creativeWritingRequired > 0
                            ? [{ label: "Creative Writing Courses", value: `${countAssignedRequirement(programCourses, program.id, "english-creative-writing")}/${struct.creativeWritingRequired}` }]
                            : []),
                        ];
                        const gridTemplate = (tiles) => ({
                          gridTemplateColumns: `repeat(${Math.min(Math.max(tiles.length, 1), 4)}, minmax(0, 1fr))`,
                        });
                        return (
                          <div className="space-y-2">
                            <div className="grid gap-2" style={gridTemplate(topTiles)}>
                              {topTiles.map(tile => (
                              <div key={tile.label} className="rounded-lg bg-slate-50 px-3 py-2 h-full">
                                <ProgramStatRow
                                  label={tile.label}
                                  value={tile.value}
                                  labelClass="text-[0.55rem] uppercase tracking-wide text-slate-500"
                                  valueClass="text-base font-semibold text-slate-900"
                                  />
                                </div>
                              ))}
                            </div>
                            <div className="grid gap-2" style={gridTemplate(bottomTiles)}>
                              {bottomTiles.map(tile => (
                                <div key={tile.label} className="rounded border px-3 py-2 h-full">
                                  <ProgramStatRow
                                    label={tile.label}
                                    value={tile.value}
                                    labelClass="text-[0.55rem] uppercase text-slate-500"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {program.type !== "None" && program.value && summary && summary.isAfr && summary.afrProgress && (
                    <div className="mt-3 space-y-2 text-[0.65rem]">
                      {renderProgramRing()}
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="rounded border px-3 py-2 text-center">
                          <div className="text-[0.55rem] uppercase text-slate-500">Intro Course</div>
                          <div className="text-base font-semibold text-slate-900">
                            {countAssignedRequirement(programCourses, program.id, "afr-intro") > 0 || summary.afrProgress.introCompleted ? "✓ AFR 105/210" : "Pending"}
                          </div>
                        </div>
                        <div className="rounded border px-3 py-2 text-center">
                          <div className="text-[0.55rem] uppercase text-slate-500">300-level AFR</div>
                          <div className="text-base font-semibold text-slate-900">
                            {countAssignedRequirement(programCourses, program.id, "afr-300") || summary.afrProgress.level300Count}/{summary.afrProgress.level300Required}
                          </div>
                        </div>
                        <div className="rounded border px-3 py-2 text-center">
                          <div className="text-[0.55rem] uppercase text-slate-500">Colloquium</div>
                          <div className="text-sm font-semibold text-slate-900">
                            {countAssignedRequirement(programCourses, program.id, "afr-colloquium") > 0 ? "Tracked" : "Attend each term"}
                          </div>
                        </div>
                      </div>
                      <div className="rounded border border-dashed px-3 py-2 text-[0.6rem] text-slate-600">
                        Choose or design a concentration (Africa, Caribbean & Latin America, United States, or General Africana). Ensure your plan spans multiple regions and disciplines.
                      </div>
                    </div>
                  )}

                  {program.type !== "None" && program.value && summary && summary.isAmst && summary.amstProgress && (
                    <div className="mt-3 space-y-2 text-[0.65rem]">
                      {renderProgramRing()}
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="rounded border px-3 py-2 text-center">
                          <div className="text-[0.55rem] uppercase text-slate-500">Intro AMST</div>
                          <div className="text-base font-semibold text-slate-900">
                            {countAssignedRequirement(programCourses, program.id, "amst-intro") > 0 || summary.amstProgress.introCompleted ? "✓ 101/121" : "Pending"}
                          </div>
                        </div>
                        <div className="rounded border px-3 py-2 text-center">
                          <div className="text-[0.55rem] uppercase text-slate-500">AMST Core</div>
                          <div className="text-base font-semibold text-slate-900">
                            {countAssignedRequirement(programCourses, program.id, "amst-core") || summary.amstProgress.coreCount}/{summary.amstProgress.coreRequired}
                          </div>
                        </div>
                        <div className="rounded border px-3 py-2 text-center">
                          <div className="text-[0.55rem] uppercase text-slate-500">300-level AMST</div>
                          <div className="text-base font-semibold text-slate-900">
                            {countAssignedRequirement(programCourses, program.id, "amst-300") || summary.amstProgress.level300Count}/{summary.amstProgress.level300Required}
                          </div>
                        </div>
                      </div>
                      <div className="rounded border border-dashed px-3 py-2 text-[0.6rem] text-slate-600">
                        Build a concentration (e.g., race/class/gender, comparative ethnic studies, Asian American or Latinx Studies) with at least three thematically linked courses in consultation with your advisor.
                      </div>
                    </div>
                  )}

                  {program.type !== "None" && program.value && summary && summary.isAnthro && summary.anthroProgress && (
                    <div className="mt-3 space-y-2 text-[0.65rem]">
                      {renderProgramRing()}
                      {(() => {
                        const tiles = [
                          { label: "ANTH 101", req: "anth-101", fallback: summary.anthroProgress.introPrimary ? "✓" : "0/1" },
                          { label: "2nd Intro", req: "anth-2nd-intro", fallback: summary.anthroProgress.introSecondary ? "✓" : "0/1" },
                          { label: "ANTH 205", req: "anth-205", fallback: summary.anthroProgress.midCourse ? "✓" : "0/1" },
                          { label: "ANTH 301", req: "anth-301", fallback: summary.anthroProgress.seminar ? "✓" : "0/1" },
                        ];
                        return (
                          <div className="grid gap-2 sm:grid-cols-4">
                            {tiles.map(tile => {
                              const assigned = countAssignedRequirement(programCourses, program.id, tile.req) > 0;
                              return (
                                <div key={tile.label} className="rounded-lg bg-slate-50 px-3 py-2 text-center flex h-full flex-col items-center justify-between gap-1">
                                  <div className="text-[0.55rem] uppercase tracking-wide text-slate-500">{tile.label}</div>
                                  <div className="text-base font-semibold text-slate-900">
                                    {assigned ? "✓" : tile.fallback}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="rounded border px-3 py-2 text-center">
                          <div className="text-[0.55rem] uppercase text-slate-500">Extra 300-level</div>
                          <div className="text-base font-semibold text-slate-900">
                            {countAssignedRequirement(programCourses, program.id, "anth-extra-300") || summary.anthroProgress.extra300Count}/{summary.anthroProgress.extra300Required}
                          </div>
                        </div>
                        <div className="rounded border px-3 py-2 text-center">
                          <div className="text-[0.55rem] uppercase text-slate-500">Anth electives</div>
                          <div className="text-base font-semibold text-slate-900">
                            {countAssignedRequirement(programCourses, program.id, "anth-elective") || summary.anthroProgress.electivesCompleted}/{summary.anthroProgress.electivesRequired}
                          </div>
                        </div>
                        <div className="rounded border px-3 py-2 text-center">
                          <div className="text-[0.55rem] uppercase text-slate-500">Experience</div>
                          <div className="text-sm font-semibold text-slate-900">
                            {countAssignedRequirement(programCourses, program.id, "anth-experience") > 0 || program.experienceComplete ? "Marked" : "Not yet"}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {program.type !== "None" && program.value && summary && !summary.isSpecial && !summary.isCS && !summary.isBio && !summary.isAnthro && !summary.isEnglish && !summary.isAfr && !summary.isAmst && (
                    <div className="mt-3 space-y-2 text-[0.65rem]">
                      {renderProgramRing()}
                      {(() => {
                        const manualRequired = new Set();
                        let manualElective = 0;
                        const manualMath = new Set();
                        programCourses.forEach(course => {
                          const reqId = getAssignedRequirementId(course, program.id);
                          if (!reqId) return;
                          if (reqId.startsWith("required-")) {
                            manualRequired.add(reqId.replace("required-", ""));
                          } else if (reqId === "generic-elective") {
                            manualElective += 1;
                          } else if (reqId.startsWith("support-")) {
                            manualMath.add(reqId.replace("support-", ""));
                          }
                        });
                        const cfg = summary.config || {};
                        const manualRequiredCount = cfg.requiredCourses
                          ? cfg.requiredCourses.filter(course => manualRequired.has(sanitizeReqKey(course))).length
                          : 0;
                        const manualMathCount = cfg.mathRequirements
                          ? cfg.mathRequirements.filter(course => manualMath.has(sanitizeReqKey(course))).length
                          : 0;
                        const displayRequired = manualRequiredCount || summary.requiredCompleted;
                        const displayElective = manualElective || summary.electiveCompleted;
                        const displayMath = manualMathCount || summary.mathCompleted;
                        const cards = [
                          <div key="required" className="rounded-lg bg-slate-50 px-3 py-2 h-full">
                            <ProgramStatRow
                              label="Required"
                              value={`${displayRequired}/${summary.requiredTotal}`}
                              labelClass="text-[0.55rem] uppercase text-slate-500"
                              valueClass="text-base font-semibold text-slate-900"
                            />
                          </div>,
                        ];
                        if (summary.electiveTotal > 0) {
                          cards.push(
                            <div key="electives" className="rounded-lg bg-slate-50 px-3 py-2 h-full">
                              <ProgramStatRow
                                label="Electives"
                                value={`${Math.min(displayElective, summary.electiveTotal)}/${summary.electiveTotal}`}
                                labelClass="text-[0.55rem] uppercase text-slate-500"
                                valueClass="text-base font-semibold text-slate-900"
                              />
                            </div>
                          );
                        }
                        if (summary.mathTotal > 0) {
                          cards.push(
                            <div key="math" className="rounded-lg bg-slate-50 px-3 py-2 h-full">
                              <ProgramStatRow
                                label="Supporting Math"
                                value={`${Math.min(displayMath, summary.mathTotal)}/${summary.mathTotal}`}
                                labelClass="text-[0.55rem] uppercase text-slate-500"
                                valueClass="text-base font-semibold text-slate-900"
                              />
                            </div>
                          );
                        }
                        if (summary.electiveTotal === 0 && summary.mathTotal === 0) {
                          cards.push(
                            <div key="progress" className="rounded-lg bg-slate-50 px-3 py-2 h-full">
                              <ProgramStatRow
                                label="Progress"
                                value={`${displayRequired}/${summary.requiredTotal || 1}`}
                                labelClass="text-[0.55rem] uppercase text-slate-500"
                                valueClass="text-base font-semibold text-slate-900"
                              />
                            </div>
                          );
                        }
                        return cards;
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
  };

  const renderRequirements = () => (
    <div className="mt-4 space-y-4">
      {/* General Requirements */}
      <div className="rounded-2xl border bg-white p-4 text-xs">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900">
            General Requirements
          </div>
          <label className="flex items-center gap-2 text-[0.7rem]">
            <input
              name="languageWaived"
              type="checkbox"
              checked={languageWaived}
              onChange={(e) => setLanguageWaived(e.target.checked)}
              className="rounded"
            />
            Waive Language Requirement
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {progress.detail.filter(r => generalRequirements.some(gr => gr.id === r.id)).map(r => (
            <div key={r.id} className="rounded-xl border px-3 py-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[0.75rem] font-medium text-slate-800">
                  {r.label}
                  {r.id === "LANG" && languageWaived && (
                    <span className="ml-1 text-green-600">(Waived)</span>
                  )}
                  {r.id === "PE" && (
                    <span className="ml-2 text-[0.6rem] text-slate-500">
                      (*One PE class = 4 units)
                    </span>
                  )}
                </span>
                <span className="text-[0.7rem] text-slate-500">
                  {r.have}/{r.targetCount}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className={cx(
                    "h-full rounded-full",
                    r.id === "LANG" && languageWaived ? "bg-green-600" : "bg-indigo-600"
                  )}
                  style={{ width: `${r.pct * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Distribution Requirements */}
      <div className="rounded-2xl border bg-white p-4 text-xs">
        <div className="mb-3 text-sm font-semibold text-slate-900">
          Distribution Requirements (3-3-3)
        </div>
        <div className="grid gap-3 md:grid-cols-1 lg:grid-cols-3">
          {progress.detail.filter(r => distributionRequirements.some(dr => dr.id === r.id)).map(r => (
            <div key={r.id} className="rounded-xl border px-3 py-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[0.75rem] font-medium text-slate-800">
                  {r.label}
                </span>
                <span className="text-[0.7rem] text-slate-500">
                  {r.have}/{r.targetCount}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-green-600"
                  style={{ width: `${r.pct * 100}%` }}
                />
              </div>
              <div className="mt-1 text-[0.65rem] text-slate-500">
                {r.id === 'GROUP1_TOTAL' && '(≥1 Language/Lit + ≥1 Arts, 3 total)'}
                {r.id === 'GROUP2_TOTAL' && '(1 SBA + 2 from EC/REP/HST)'}
                {r.id === 'GROUP3_TOTAL' && '(1 Science + 1 Math + 1 more, ≥1 lab)'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCourses = () => {
    const rows = [];
    terms.forEach(t => {
      t.slots.forEach(s => {
        if (!(s.code || s.title)) return;
        rows.push({ term: t.label, ...s });
      });
    });

    return (
      <div className="mt-4 rounded-2xl border bg-white p-4 text-xs">
        <div className="mb-3 text-sm font-semibold text-slate-900">
          Planned courses
        </div>
        {rows.length === 0 ? (
          <div className="text-[0.75rem] text-slate-500">
            No courses yet. Add courses from the Planner tab.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-[0.75rem]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="border-b px-2 py-1 text-left">Term</th>
                  <th className="border-b px-2 py-1 text-left">Code</th>
                  <th className="border-b px-2 py-1 text-left">Title</th>
                  <th className="border-b px-2 py-1 text-left">Units</th>
                  <th className="border-b px-2 py-1 text-left">Tags</th>
                  <th className="border-b px-2 py-1 text-left">Departments</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={idx} className="odd:bg-white even:bg-slate-50/60">
                    <td className="border-b px-2 py-1">{r.term}</td>
                    <td className="border-b px-2 py-1">{r.code}</td>
                    <td className="border-b px-2 py-1">{r.title}</td>
                    <td className="border-b px-2 py-1">{r.credits}</td>
                    <td className="border-b px-2 py-1">
                      {r.tags.join(", ")}
                    </td>
                    <td className="border-b px-2 py-1">
                      {r.depts.join(" / ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

const renderMASMajor = (majorReq, courses, majorValue, onChange) => {
  const {
    visualAnalysis,
    studioFoundation,
    csIntro,
    studioCore,
    csCore,
    capstone,
    additional,
    totals,
  } = computeMASProgress(courses, majorReq);

  return (
    <div className="space-y-4">
      {renderMajorIntro(majorReq)}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Introductory Courses (3 required)</div>
          <div className="space-y-2 text-xs">
            <div className={cx(
              "p-2 rounded",
              visualAnalysis.length > 0 ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-600"
            )}>
              <div className="font-medium">Visual Analysis</div>
              <div className="text-[0.65rem]">ARTH 100/WRIT 107 or CAMS 100</div>
              {visualAnalysis.length > 0 && <div className="text-[0.6rem] mt-1">✓ {visualAnalysis[0].code}</div>}
            </div>
            <div className={cx(
              "p-2 rounded",
              studioFoundation.length > 0 ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-600"
            )}>
              <div className="font-medium">Studio Foundation</div>
              <div className="text-[0.65rem]">Any 100-level ARTS course</div>
              {studioFoundation.length > 0 && <div className="text-[0.6rem] mt-1">✓ {studioFoundation[0].code}</div>}
            </div>
            <div className={cx(
              "p-2 rounded",
              csIntro.length > 0 ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-600"
            )}>
              <div className="font-medium">Computer Science</div>
              <div className="text-[0.65rem]">Any 100-level CS course</div>
              {csIntro.length > 0 && <div className="text-[0.6rem] mt-1">✓ {csIntro[0].code}</div>}
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {(visualAnalysis.length > 0 ? 1 : 0) + (studioFoundation.length > 0 ? 1 : 0) + (csIntro.length > 0 ? 1 : 0)}/3 completed
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Core Courses (6 required)</div>
          <div className="space-y-2 text-xs">
            <div className="p-2 bg-blue-50 rounded">
              <div className="font-medium">Studio Core (3 required)</div>
              <div className="text-[0.65rem] text-slate-600">Choose from ARTS/CAMS/MUS studio courses</div>
              {studioCore.slice(0, 3).map((course, i) => (
                <div key={i} className="text-[0.6rem] text-blue-700 mt-1">✓ {course.code}</div>
              ))}
              <div className="text-[0.6rem] mt-1">{Math.min(studioCore.length, 3)}/3 completed</div>
            </div>
            <div className="p-2 bg-purple-50 rounded">
              <div className="font-medium">CS Core (3 required)</div>
              <div className="text-[0.65rem] text-slate-600">Choose from CS core courses</div>
              {csCore.slice(0, 3).map((course, i) => (
                <div key={i} className="text-[0.6rem] text-purple-700 mt-1">✓ {course.code}</div>
              ))}
              <div className="text-[0.6rem] mt-1">{Math.min(csCore.length, 3)}/3 completed</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Additional Requirements</div>
          <div className="space-y-2 text-xs">
            <div className="p-2 bg-slate-50 rounded">
              <div className="font-medium">MAS Electives (3 units)</div>
              <div className="text-[0.65rem] text-slate-600">Approved interdisciplinary courses</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {Math.min(additional.length, 3)}/3 completed
              </div>
            </div>
            <div className={cx(
              "p-2 rounded",
              capstone.length > 0 ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-600"
            )}>
              <div className="font-medium">Capstone Course</div>
              <div className="text-[0.65rem]">1 required (senior year)</div>
              {capstone.length > 0 && <div className="text-[0.6rem] mt-1">✓ {capstone[0].code}</div>}
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded border p-2 text-[0.65rem]">
                <div className="text-[0.55rem] uppercase text-slate-500">Total units</div>
                <div className="text-sm font-semibold text-slate-900">{totals.totalUnits.toFixed(1)}/12</div>
              </div>
              <div className="rounded border p-2 text-[0.65rem]">
                <div className="text-[0.55rem] uppercase text-slate-500">Courses &gt;100</div>
                <div className="text-sm font-semibold text-slate-900">{totals.upperLevelCourses}/8+</div>
              </div>
              <div className="rounded border p-2 text-[0.65rem]">
                <div className="text-[0.55rem] uppercase text-slate-500">300-level</div>
                <div className="text-sm font-semibold text-slate-900">{totals.level300Count}/2+</div>
              </div>
            </div>
            <div className="p-2 bg-orange-50 rounded">
              <div className="font-medium">Online Portfolio</div>
              <div className="text-[0.65rem]">Required senior year</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const renderCSMajor = (majorReq, courses, majorValue, onChange) => {
  const progress = computeCSProgress(courses, majorReq.csStructure);
  const totalCore = progress.coreGroups.length;
  const completedCore = progress.coreGroups.filter(group => group.completed).length;
  const introLabel = majorReq.csStructure.introOptions?.join(", ") || "Intro courses";
  const mathCourse = progress.mathRequirements[0] || "MATH 225";

  return (
    <div className="space-y-4">
      {renderMajorIntro(majorReq)}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Foundation & Core</div>
            <div className="space-y-2 text-xs">
              <div className={cx(
                "flex items-center justify-between rounded border px-2 py-1",
                progress.introCompleted ? "border-green-200 bg-green-50 text-green-800" : "border-slate-200 bg-slate-50 text-slate-600"
              )}>
                <span>Intro sequence ({introLabel})</span>
                <span className="font-semibold">{progress.introCompleted ? "✓" : "0/1"}</span>
              </div>
              <div className="rounded border border-slate-200 bg-slate-50 p-2">
                <div className="mb-1 text-[0.7rem] font-semibold text-slate-700">200-level core at Wellesley</div>
                <div className="text-[0.65rem] text-slate-500 mb-2">Completion required for CS 230/231/235/240 family.</div>
                <div className="space-y-1 text-[0.65rem]">
                  {majorReq.csStructure.coreGroups.map((group, idx) => {
                    const completed = progress.coreGroups[idx]?.completed;
                    return (
                      <div key={group.id} className="flex items-center justify-between rounded bg-white px-2 py-1">
                        <span>{group.label}</span>
                        <span className={completed ? "text-green-600" : "text-slate-400"}>
                          {completed ? "✓" : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 text-[0.65rem] text-slate-600">
                  {completedCore}/{totalCore} core groups complete
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="mb-2 text-sm font-medium">Advanced CS work</div>
            <div className="space-y-2 text-xs">
              <div className="rounded bg-slate-50 px-3 py-2 flex items-center justify-between">
                <div>
                  <div className="text-[0.55rem] uppercase text-slate-500">300-level CS</div>
                  <div>Two distinct 300-level courses</div>
                </div>
                <div className="text-base font-semibold text-slate-900">
                  {progress.level300Count}/{progress.level300Required}
                </div>
              </div>
              <div className="rounded bg-slate-50 px-3 py-2 flex items-center justify-between">
                <div>
                  <div className="text-[0.55rem] uppercase text-slate-500">Additional CS electives</div>
                  <div>200+ level courses beyond the core</div>
                </div>
                <div className="text-base font-semibold text-slate-900">
                  {progress.electivesCount}/{progress.electivesRequired}
                </div>
              </div>
            </div>
          </div>

        <div className="rounded-lg border p-3 md:col-span-2">
          <div className="mb-2 text-sm font-medium">Supporting mathematics</div>
          <div className="flex items-center justify-between rounded border px-3 py-2 text-xs">
            <div>
              <div className="text-[0.55rem] uppercase text-slate-500">Required</div>
                <div>MATH 225 (Combinatorics and Graph Theory)</div>
              </div>
              <div className={progress.mathSatisfied ? "text-green-600 font-semibold" : "text-slate-500 font-semibold"}>
                {progress.mathSatisfied ? "Completed" : "Pending"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const renderBioMajor = (majorReq, courses, majorValue, onChange) => {
  const progress = computeBioProgress(courses, majorReq.bioStructure);
  const groupCompletion = [progress.groupCell, progress.groupSystems, progress.groupCommunity].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {renderMajorIntro(majorReq)}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Introductory Tier</div>
            <div className="space-y-2 text-xs">
              <div className={cx(
                "flex items-center justify-between rounded border px-2 py-1",
                progress.introCell ? "border-green-200 bg-green-50 text-green-800" : "border-slate-200 bg-slate-50 text-slate-600"
              )}>
                <span>Cellular & Molecular (BISC 110/112/116)</span>
                <span className="font-semibold">{progress.introCell ? "✓" : "0/1"}</span>
              </div>
              <div className={cx(
                "flex items-center justify-between rounded border px-2 py-1",
                progress.introOrganismal ? "border-green-200 bg-green-50 text-green-800" : "border-slate-200 bg-slate-50 text-slate-600"
              )}>
                <span>Organismal Biology (BISC 111/113)</span>
                <span className="font-semibold">{progress.introOrganismal ? "✓" : "0/1"}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="mb-2 text-sm font-medium">200-level core groups</div>
            <div className="space-y-1 text-xs">
              {["Cell Biology", "Systems Biology", "Community Biology"].map((label, idx) => {
                const flags = [progress.groupCell, progress.groupSystems, progress.groupCommunity];
                const completed = flags[idx];
                return (
                  <div key={label} className={cx(
                    "flex items-center justify-between rounded px-2 py-1",
                    completed ? "bg-green-50 text-green-700" : "bg-slate-50 text-slate-600"
                  )}>
                    <span>{label}</span>
                    <span>{completed ? "✓" : ""}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 text-[0.65rem] text-slate-600">{groupCompletion}/3 distribution groups met.</div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="mb-2 text-sm font-medium">Advanced Biology</div>
            <div className="space-y-2 text-xs">
              <div className="rounded bg-slate-50 px-3 py-2 flex items-center justify-between">
                <div>
                  <div className="text-[0.55rem] uppercase text-slate-500">Extra 200-level BISC</div>
                  <div>Any additional 200-level course</div>
                </div>
                <div className="text-base font-semibold text-slate-900">
                  {progress.additional200}/{progress.additional200Required || 1}
                </div>
              </div>
              <div className="rounded bg-slate-50 px-3 py-2 flex items-center justify-between">
                <div>
                  <div className="text-[0.55rem] uppercase text-slate-500">300-level BISC</div>
                  <div>At least two advanced seminars (≥1 lab)</div>
                </div>
                <div className="text-base font-semibold text-slate-900">
                  {progress.level300}/{progress.level300Required}
                </div>
              </div>
              <div className="rounded bg-slate-50 px-3 py-2 flex items-center justify-between">
                <div>
                  <div className="text-[0.55rem] uppercase text-slate-500">BISC Elective</div>
                  <div>Any BISC course or EXTD 225</div>
                </div>
                <div className="text-base font-semibold text-slate-900">
                  {progress.electiveCompleted}/{progress.electiveRequired}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="mb-2 text-sm font-medium">Chemistry support</div>
            <div className="space-y-2 text-xs">
              <div className={cx(
                "rounded border px-3 py-2 flex items-center justify-between",
                progress.chemIntroCompleted ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600"
              )}>
                <span>Intro chem (CHEM 105/116/120)</span>
                <span className="font-semibold">{progress.chemIntroCompleted ? "Completed" : "Pending"}</span>
              </div>
              <div className={cx(
                "rounded border px-3 py-2 flex items-center justify-between",
                progress.chemAdvancedCompleted ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600"
              )}>
                <span>Advanced CHEM course</span>
                <span className="font-semibold">{progress.chemAdvancedCompleted ? "Completed" : "Pending"}</span>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
};

const renderCustomMajor = (majorValue, onChange, displayLabel = "Custom Major") => {
  const canAddRow = customMajorRequirements.length < MAX_CUSTOM_MAJOR_REQUIREMENTS;
  const trimmedName = newCustomMajorName.trim();
  const nameExists = !!trimmedName && customMajors.some(item => item.name.toLowerCase() === trimmedName.toLowerCase());
  const canSaveCustomMajor = !!trimmedName && !nameExists;

  return (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-slate-900">{displayLabel}</div>

      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-3 py-3 text-xs text-slate-600">
        <div className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
          Name this custom plan
        </div>
        <p className="mt-1">
          Add a label to create a dedicated custom major entry in every dropdown.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            name="customMajorName"
            type="text"
            value={newCustomMajorName}
            onChange={(e) => setNewCustomMajorName(e.target.value)}
            placeholder="Name your custom major"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            maxLength={60}
          />
          <button
            type="button"
            onClick={addCustomMajor}
            disabled={!canSaveCustomMajor}
            className={cx(
              "rounded-full px-4 py-2 text-sm font-medium",
              canSaveCustomMajor
                ? "bg-indigo-600 text-white hover:bg-indigo-500"
                : "bg-slate-200 text-slate-500 cursor-not-allowed"
            )}
          >
            Add custom major
          </button>
        </div>
        {nameExists && (
          <div className="mt-1 text-[0.65rem] font-medium text-rose-600">
            That name is already in your list.
          </div>
        )}
        {customMajors.length > 0 && (
          <div className="mt-3">
            <div className="text-[0.65rem] uppercase tracking-wide text-slate-500">Your custom majors</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {customMajors.map(major => (
                <div
                  key={major.id}
                  className="flex flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[0.7rem] font-semibold text-slate-700"
                >
                  {editingCustomMajorId === major.id ? (
                    <>
                      <input
                        name="editCustomMajorName"
                        type="text"
                        value={editingCustomMajorName}
                        onChange={(e) => setEditingCustomMajorName(e.target.value)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs font-normal text-slate-800"
                        maxLength={60}
                      />
                      <button
                        type="button"
                        onClick={saveEditingCustomMajor}
                        className="rounded border border-green-300 px-2 py-0.5 text-[0.65rem] font-semibold text-green-700 hover:bg-green-50"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditingCustomMajor}
                        className="rounded border border-slate-300 px-2 py-0.5 text-[0.65rem] font-semibold text-slate-600 hover:bg-white"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <span>{major.name}</span>
                      <button
                        type="button"
                        onClick={() => startEditingCustomMajor(major)}
                        className="text-slate-400 transition hover:text-indigo-500"
                        aria-label={`Edit ${major.name}`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCustomMajor(major.id)}
                        className="text-slate-400 transition hover:text-rose-500"
                        aria-label={`Remove ${major.name}`}
                      >
                        ×
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {customMajorRequirements.map((req, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="w-6 text-right text-xs text-slate-500">{idx + 1}.</span>
            <input
              name={`customMajorRequirement-${idx}`}
              type="text"
              value={req}
              onChange={(e) => updateCustomRequirement(idx, e.target.value)}
              placeholder="Enter course or requirement name"
              className="flex-1 rounded-lg border px-3 py-2 text-sm"
              maxLength={120}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={addCustomRequirementRow}
          disabled={!canAddRow}
          className={cx(
            "rounded-full px-4 py-1.5 text-sm font-medium",
            canAddRow ? "border border-slate-300 text-slate-700 hover:bg-slate-50" : "border border-slate-200 text-slate-400 cursor-not-allowed"
          )}
        >
          {canAddRow ? "Add requirement" : "Max 15 rows reached"}
        </button>
      </div>
    </div>
  );
};

const renderCustomMinor = (minorValue, onChange, displayLabel = "Custom Minor") => {
  const canAddRow = customMinorRequirements.length < MAX_CUSTOM_MINOR_REQUIREMENTS;
  const trimmedName = newCustomMinorName.trim();
  const nameExists = !!trimmedName && customMinors.some(item => item.name.toLowerCase() === trimmedName.toLowerCase());
  const canSaveCustomMinor = !!trimmedName && !nameExists;

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-2xl border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900">{displayLabel}</div>
          <MinorSelect value={minorValue} onChange={onChange} />
        </div>

        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-3 py-3 text-xs text-slate-600">
          <div className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
            Name this custom minor
          </div>
          <p className="mt-1">
            Add a label to create a custom minor entry.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              name="customMinorName"
              type="text"
              value={newCustomMinorName}
              onChange={(e) => setNewCustomMinorName(e.target.value)}
              placeholder="Name your custom minor"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              maxLength={60}
            />
            <button
              type="button"
              onClick={addCustomMinor}
              disabled={!canSaveCustomMinor}
              className={cx(
                "rounded-full px-4 py-2 text-sm font-medium",
                canSaveCustomMinor
                  ? "bg-indigo-600 text-white hover:bg-indigo-500"
                  : "bg-slate-200 text-slate-500 cursor-not-allowed"
              )}
            >
              Add custom minor
            </button>
          </div>
          {nameExists && (
            <div className="mt-1 text-[0.65rem] font-medium text-rose-600">
              That name is already in your list.
            </div>
          )}
          {customMinors.length > 0 && (
            <div className="mt-3">
              <div className="text-[0.65rem] uppercase tracking-wide text-slate-500">Your custom minors</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {customMinors.map(minor => (
                  <div
                    key={minor.id}
                    className="flex flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[0.7rem] font-semibold text-slate-700"
                  >
                    {editingCustomMinorId === minor.id ? (
                      <>
                        <input
                          name="editCustomMinorName"
                          type="text"
                          value={editingCustomMinorName}
                          onChange={(e) => setEditingCustomMinorName(e.target.value)}
                          className="rounded border border-slate-300 px-2 py-1 text-xs font-normal text-slate-800"
                          maxLength={60}
                        />
                        <button
                          type="button"
                          onClick={saveEditingCustomMinor}
                          className="rounded border border-green-300 px-2 py-0.5 text-[0.65rem] font-semibold text-green-700 hover:bg-green-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditingCustomMinor}
                          className="rounded border border-slate-300 px-2 py-0.5 text-[0.65rem] font-semibold text-slate-600 hover:bg-white"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <span>{minor.name}</span>
                        <button
                          type="button"
                          onClick={() => startEditingCustomMinor(minor)}
                          className="text-slate-400 transition hover:text-indigo-500"
                          aria-label={`Edit ${minor.name}`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => removeCustomMinor(minor.id)}
                          className="text-slate-400 transition hover:text-rose-500"
                          aria-label={`Remove ${minor.name}`}
                        >
                          ×
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {customMinorRequirements.map((req, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-6 text-right text-xs text-slate-500">{idx + 1}.</span>
              <input
                name={`customMinorRequirement-${idx}`}
                type="text"
                value={req}
                onChange={(e) => updateCustomMinorRequirement(idx, e.target.value)}
                placeholder="Enter course or requirement name"
                className="flex-1 rounded-lg border px-3 py-2 text-sm"
                maxLength={120}
              />
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={addCustomMinorRequirementRow}
            disabled={!canAddRow}
            className={cx(
              "rounded-full px-4 py-1.5 text-sm font-medium",
              canAddRow ? "border border-slate-300 text-slate-700 hover:bg-slate-50" : "border border-slate-200 text-slate-400 cursor-not-allowed"
            )}
          >
            {canAddRow ? "Add requirement" : "Max 12 rows reached"}
          </button>
        </div>
      </div>
    </div>
  );
};

const renderMathMajor = (majorReq, courses, majorValue, onChange) => {
  const progress = computeMathProgress(courses, majorReq.mathStructure);
  return (
    <div className="space-y-4">
      {renderMajorIntro(majorReq)}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Calculus foundations</div>
          <div className="space-y-2 text-xs">
            <div className={cx(
              "flex items-center justify-between rounded border px-2 py-1",
              progress.calculus115 ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600"
            )}>
              <span>MATH 115</span>
              <span className="font-semibold">{progress.calculus115 ? "✓" : "Pending"}</span>
            </div>
            <div className={cx(
              "flex items-center justify-between rounded border px-2 py-1",
              progress.calculusSecond ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600"
            )}>
              <span>MATH 116 or MATH 120</span>
              <span className="font-semibold">{progress.calculusSecond ? "✓" : "Pending"}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Core 200-level courses</div>
          <div className="space-y-2 text-xs">
            {progress.coreCompleted.map(item => (
              <div key={item.code} className={cx(
                "flex items-center justify-between rounded border px-2 py-1",
                item.completed ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600"
              )}>
                <span>{item.code}</span>
                <span className="font-semibold">{item.completed ? "✓" : "Pending"}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">300-level anchors</div>
          <div className="space-y-2 text-xs">
            {progress.seminarCompleted.map(item => (
              <div key={item.code} className={cx(
                "flex items-center justify-between rounded border px-2 py-1",
                item.completed ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600"
              )}>
                <span>{item.code}</span>
                <span className="font-semibold">{item.completed ? "✓" : "Pending"}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded bg-slate-50 px-3 py-2 text-xs">
            <div className="text-[0.55rem] uppercase text-slate-500">Additional 300-level MATH</div>
            <div className="flex items-center justify-between">
              <span>Beyond MATH 302/305</span>
              <span className="text-base font-semibold text-slate-900">
                {progress.additional300Count}/{progress.additional300Required}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Advanced-unit count</div>
          <div className="rounded bg-slate-50 px-3 py-2 text-xs">
            <div className="text-[0.55rem] uppercase text-slate-500">MATH/STAT at 200+ level</div>
            <div className="text-base font-semibold text-slate-900">
              {progress.advancedTotal}/{progress.advancedRequired}
            </div>
            <div className="mt-1 text-[0.65rem] text-slate-500">
              Includes STAT courses; excludes MATH 350/360/370.
            </div>
          </div>
        </div>
      </div>

      {progress.presentationNote && (
        <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/60 p-3 text-[0.75rem] text-indigo-900">
          <div className="text-[0.6rem] uppercase font-semibold tracking-wide">Presentation requirement</div>
          <p className="mt-1">{progress.presentationNote}</p>
        </div>
      )}
    </div>
  );
};

const renderEconMajor = (majorReq, courses, majorValue, onChange) => {
  const progress = computeEconProgress(courses, majorReq.econStructure);
  return (
    <div className="space-y-4">
      {renderMajorIntro(majorReq)}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Microeconomics sequence</div>
            <div className="space-y-2 text-xs">
              <div className={cx(
                "flex items-center justify-between rounded border px-2 py-1",
                progress.microIntro ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600"
              )}>
                <span>ECON 101 / 101P</span>
                <span className="font-semibold">{progress.microIntro ? "✓" : "Pending"}</span>
              </div>
              <div className={cx(
                "flex items-center justify-between rounded border px-2 py-1",
                progress.microIntermediate ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600"
              )}>
                <span>ECON 201</span>
                <span className="font-semibold">{progress.microIntermediate ? "✓" : "Pending"}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="mb-2 text-sm font-medium">Macroeconomics sequence</div>
            <div className="space-y-2 text-xs">
              <div className={cx(
                "flex items-center justify-between rounded border px-2 py-1",
                progress.macroIntro ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600"
              )}>
                <span>ECON 102 / 102P</span>
                <span className="font-semibold">{progress.macroIntro ? "✓" : "Pending"}</span>
              </div>
              <div className={cx(
                "flex items-center justify-between rounded border px-2 py-1",
                progress.macroIntermediate ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600"
              )}>
                <span>ECON 202</span>
                <span className="font-semibold">{progress.macroIntermediate ? "✓" : "Pending"}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="mb-2 text-sm font-medium">Statistics & Econometrics</div>
            <div className="space-y-2 text-xs">
              <div className={cx(
                "flex items-center justify-between rounded border px-2 py-1",
                progress.statsIntroSatisfied ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600"
              )}>
                <span>ECON 103 or approved substitute</span>
                <span className="font-semibold">
                  {progress.statsIntroCourse ? "✓ ECON 103" : progress.statsIntroViaAlt ? "Alt credit" : "Pending"}
                </span>
              </div>
              <div className={cx(
                "flex items-center justify-between rounded border px-2 py-1",
                progress.statsIntermediate ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600"
              )}>
                <span>ECON 203</span>
                <span className="font-semibold">{progress.statsIntermediate ? "✓" : "Pending"}</span>
              </div>
            </div>
            {progress.statsIntroViaAlt && (
              <div className="mt-2 rounded bg-amber-50 px-3 py-2 text-[0.65rem] text-amber-900">
                Using STAT/PSYC credit in place of ECON 103? Add an extra ECON elective so you still reach nine ECON courses.
              </div>
            )}
          </div>

          <div className="rounded-lg border p-3 space-y-3">
            <div>
              <div className="mb-1 text-sm font-medium">Advanced work & electives</div>
              <div className="rounded bg-slate-50 px-3 py-2 text-xs">
                <div className="text-[0.55rem] uppercase text-slate-500">300-level ECON (at Wellesley)</div>
                <div className="text-base font-semibold text-slate-900">
                  {progress.level300Count}/{progress.level300Required}
                </div>
                <div className="mt-1 text-[0.65rem] text-slate-500">Excludes ECON 350/360/370.</div>
              </div>
            </div>
            <div className="rounded bg-slate-50 px-3 py-2 text-xs">
              <div className="text-[0.55rem] uppercase text-slate-500">Total counted courses</div>
              <div className="text-base font-semibold text-slate-900">
                {progress.totalCount}/{progress.totalRequired}
              </div>
              {progress.substitutionCourses.length > 0 && (
                <div className="mt-1 text-[0.65rem] text-slate-500">
                  Includes {progress.substitutionCourses.join(", ")}.
                </div>
              )}
            </div>
          </div>
        </div>
    </div>
  );
};

const renderEnglishMajor = (majorReq, relevantCourses, majorValue, onChange) => {
  const struct = majorReq.englishStructure || {};
  const progress = computeEnglishProgress(relevantCourses, struct);
  return (
    <div className="space-y-4">
      {renderMajorIntro(majorReq)}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Course totals</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between rounded bg-slate-50 px-2 py-1">
              <span>English dept courses</span>
              <span className="font-semibold">{progress.englishDeptCourses}/{struct.deptMinimum || 8}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Advanced coursework</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between rounded bg-slate-50 px-2 py-1">
              <span>Upper-level (200+)</span>
              <span className="font-semibold">{progress.upperLevelCourses}/{struct.upperLevelRequired || 7}</span>
            </div>
            <div className="flex items-center justify-between rounded bg-slate-50 px-2 py-1">
              <span>300-level seminars</span>
              <span className="font-semibold">{progress.level300Courses}/{struct.level300Required || 2}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-3 md:col-span-2">
          <div className="mb-2 text-sm font-medium">Distribution checkpoints</div>
          <ul className="text-xs text-slate-600 list-disc pl-5 space-y-1">
            <li>Assign individual courses to the Postcolonial/Ethnic and Pre-1900/Pre-1800 buckets using the “Counts toward program(s)” panel in the planner.</li>
            {struct.creativeWritingRequired > 0 && (
              <li>English & Creative Writing majors should mark four creative writing experiences using the same panel.</li>
            )}
            <li>Only traditional seminars count toward the two required 300-level courses (independent work and 350s do not).</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const renderAnthroMajor = (majorReq, courses, majorValue, onChange) => {
  const progress = computeAnthroProgress(courses, majorReq.anthroStructure, false);

  return (
    <div className="space-y-4">
      {renderMajorIntro(majorReq)}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Introductory Courses</div>
          <div className="space-y-2 text-xs">
            <div className={cx("flex items-center justify-between rounded border px-2 py-1", progress.introPrimary ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600") }>
              <span>ANTH 101</span>
              <span className="font-semibold">{progress.introPrimary ? "Completed" : "Pending"}</span>
            </div>
            <div className={cx("flex items-center justify-between rounded border px-2 py-1", progress.introSecondary ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600") }>
              <span>ANTH 102 or ANTH/CLCV 103</span>
              <span className="font-semibold">{progress.introSecondary ? "Completed" : "Pending"}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Core Seminars</div>
          <div className="space-y-2 text-xs">
            <div className={cx("flex items-center justify-between rounded border px-2 py-1", progress.midCourse ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600") }>
              <span>ANTH 205</span>
              <span className="font-semibold">{progress.midCourse ? "✓" : ""}</span>
            </div>
            <div className={cx("flex items-center justify-between rounded border px-2 py-1", progress.seminar ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600") }>
              <span>ANTH 301</span>
              <span className="font-semibold">{progress.seminar ? "✓" : ""}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Advanced & Electives</div>
          <div className="space-y-2 text-xs">
            <div className="rounded bg-slate-50 px-3 py-2 flex items-center justify-between">
              <div>
                <div className="text-[0.55rem] uppercase text-slate-500">Additional 300-level ANTH</div>
                <div>Beyond ANTH 301</div>
              </div>
              <div className="text-base font-semibold text-slate-900">
                {progress.extra300Count}/{progress.extra300Required}
              </div>
            </div>
            <div className="rounded bg-slate-50 px-3 py-2 flex items-center justify-between">
              <div>
                <div className="text-[0.55rem] uppercase text-slate-500">Anthropology Electives</div>
                <div>Upper-level courses to reach 9 units</div>
              </div>
              <div className="text-base font-semibold text-slate-900">
                {progress.electivesCompleted}/{progress.electivesRequired}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Beyond the classroom</div>
          <p className="text-xs text-slate-600">
            Work with your advisor to document a significant academic experience (study abroad, internship, field school, research, etc.). Track completion in your program settings on the Planner tab.
          </p>
        </div>
      </div>
    </div>
  );
};

const renderAfrMajor = (majorReq, courses, majorValue, onChange) => {
  const struct = majorReq.afrStructure || {};
  const progress = computeAfrProgress(courses, struct);
  const introLabel = struct.introOptions ? struct.introOptions.join(" / ") : "AFR 105";
  const totalTarget = majorReq.unitTarget || 9;

  return (
    <div className="space-y-4">
      {renderMajorIntro(majorReq)}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Intro requirement</div>
          <div className="text-xs text-slate-500 mb-1">{introLabel}</div>
          <div className={cx(
            "rounded border px-3 py-2 text-center text-sm font-semibold",
            progress.introCompleted ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600"
          )}>
            {progress.introCompleted ? "Completed" : "Pending"}
          </div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">300-level seminars</div>
          <div className="rounded bg-slate-50 px-3 py-2 text-center">
            <div className="text-[0.55rem] uppercase text-slate-500">AFR seminars</div>
            <div className="text-base font-semibold text-slate-900">
              {progress.level300Count}/{progress.level300Required}
            </div>
          </div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Course count</div>
          <div className="rounded bg-slate-50 px-3 py-2 text-center">
            <div className="text-[0.55rem] uppercase text-slate-500">Units toward 9</div>
            <div className="text-base font-semibold text-slate-900">
              {progress.totalCourses}/{totalTarget}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-dashed px-3 py-2 text-xs text-slate-600">
        Africana majors must attend the Africana Studies Colloquium (The Common Experience) every semester and work with their advisor to select or design a geographic/thematic concentration (Africa, Caribbean & Latin America, United States, or a custom plan).
      </div>
    </div>
  );
};

const renderAmstMajor = (majorReq, courses, majorValue, onChange) => {
  const struct = majorReq.amerStructure || {};
  const progress = computeAmstProgress(courses, struct);

  return (
    <div className="space-y-4">
      {renderMajorIntro(majorReq)}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Introductory requirement</div>
          <div className="text-xs text-slate-500 mb-1">{(struct.introOptions || []).join(" / ")}</div>
          <div className={cx(
            "rounded border px-3 py-2 text-center text-sm font-semibold",
            progress.introCompleted ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600"
          )}>
            {progress.introCompleted ? "Completed" : "Pending"}
          </div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">AMST courses</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between rounded bg-slate-50 px-2 py-1">
              <span>Core AMST courses</span>
              <span className="font-semibold">{progress.coreCount}/{progress.coreRequired}</span>
            </div>
            <div className="flex items-center justify-between rounded bg-slate-50 px-2 py-1">
              <span>300-level AMST</span>
              <span className="font-semibold">{progress.level300Count}/{progress.level300Required}</span>
            </div>
          </div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Electives & totals</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between rounded bg-slate-50 px-2 py-1">
              <span>Electives</span>
              <span className="font-semibold">{progress.electivesCount}/{progress.electivesRequired}</span>
            </div>
            <div className="flex items-center justify-between rounded bg-slate-50 px-2 py-1">
              <span>Total courses</span>
              <span className="font-semibold">{progress.totalCourses}/{majorReq.unitTarget || 9}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-dashed px-3 py-2 text-xs text-slate-600">
        Work with your advisor to build a concentration of at least three related courses (for example, race/class/gender, comparative ethnic studies, Asian American Studies, Latinx Studies, or another coherent theme).
      </div>
    </div>
  );
};

const renderMajorPlannerCard = (majorValue, setMajorValue, cardTitle = "Major Planner", options = {}) => {
  const { onRemove } = options;
  const normalizedKey = resolveMajorConfigKey(majorValue);
  const majorReq = normalizedKey ? majorRequirements[normalizedKey] : null;
  const selectedOption = majorOptions.find(option => option.value === majorValue);
  const selectedLabel = selectedOption?.label || majorValue;
  const placeholder = (() => {
    if (!majorValue) return "Choose a major from the dropdown to see its checklist.";
    if (!majorReq) return `${selectedLabel || "This major"} is not configured yet.`;
    return majorReq.description || "";
  })();
  const matchingProgram = programSelections.find(program => program.value === majorValue);
  const programCourses = matchingProgram ? getCoursesForProgram(matchingProgram.id) : [];
  const requirementOptions = matchingProgram ? programRequirementOptionsMap[matchingProgram.id] || [] : [];
  const requirementProgress = matchingProgram && requirementOptions.length
    ? computeRequirementProgress(matchingProgram.id, requirementOptions, programCourses)
    : { pct: 0, subtitle: matchingProgram ? "Mark requirements" : "Select a major" };
  const relevantCourses = majorValue ? getMajorRelevantCourses(majorValue, allCourses, programSelections) : [];
  const totalUnitsStat = majorValue ? getTotalUnitsStat(majorValue, relevantCourses) : null;
  const fallbackUnits = (() => {
    if (totalUnitsStat) return totalUnitsStat;
    const target = majorValue ? getMajorRequirementTarget(majorValue) : 0;
    if (target) return { earned: 0, target };
    return null;
  })();
  const progressLabel = matchingProgram ? "Major progress" : "Progress";
  const deriveRingStat = (stat) => {
    if (stat?.target) {
      const earned = stat.earned ?? 0;
      const pct = stat.target ? clamp01(earned / stat.target) : 0;
      return { pct, subtitle: `${formatUnitDisplay(earned)}/${stat.target} units` };
    }
    return { pct: requirementProgress.pct, subtitle: requirementProgress.subtitle };
  };

  const renderStatsBlock = (stat = totalUnitsStat || fallbackUnits) => {
    const ringData = deriveRingStat(stat);
    return (
      <div className="mt-3 flex justify-center">
        <RingStat pct={ringData.pct} label={progressLabel} subtitle={ringData.subtitle} />
      </div>
    );
  };

  const renderSummaryHeader = (showPlaceholderStats = false) => (
    <>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{cardTitle}</div>
        <div className="flex items-center gap-3">
          <MajorSelect value={majorValue} onChange={setMajorValue} />
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-xs font-semibold text-slate-500 underline-offset-2 hover:text-rose-600"
              aria-label="Remove major planner"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      {placeholder && <p className="mt-1 text-sm text-slate-600">{placeholder}</p>}
      {showPlaceholderStats ? renderStatsBlock(fallbackUnits) : majorReq && renderStatsBlock()}
    </>
  );

  if (!majorReq) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm space-y-4">
        {renderSummaryHeader(true)}
      </div>
    );
  }

  let content = null;

  if (majorValue === "Media Arts and Sciences") {
    content = renderMASMajor(majorReq, relevantCourses, majorValue, setMajorValue);
  } else if (majorValue === "Computer Science" && majorReq.csStructure) {
    content = renderCSMajor(majorReq, relevantCourses, majorValue, setMajorValue);
  } else if (majorValue === "Biological Sciences" && majorReq.bioStructure) {
    content = renderBioMajor(majorReq, relevantCourses, majorValue, setMajorValue);
  } else if (normalizedKey === "Custom Major") {
    content = renderCustomMajor(majorValue, setMajorValue, selectedLabel || "Custom Major");
  } else if (majorValue === "Mathematics" && majorReq.mathStructure) {
    content = renderMathMajor(majorReq, relevantCourses, majorValue, setMajorValue);
  } else if (majorValue === "Economics" && majorReq.econStructure) {
    content = renderEconMajor(majorReq, relevantCourses, majorValue, setMajorValue);
  } else if ((majorValue === "English" || majorValue === "English and Creative Writing") && majorReq.englishStructure) {
    content = renderEnglishMajor(majorReq, relevantCourses, majorValue, setMajorValue);
  } else if (majorValue === "Africana Studies" && majorReq.afrStructure) {
    content = renderAfrMajor(majorReq, relevantCourses, majorValue, setMajorValue);
  } else if (majorValue === "American Studies" && majorReq.amerStructure) {
    content = renderAmstMajor(majorReq, relevantCourses, majorValue, setMajorValue);
  } else if (majorValue === "Anthropology" && majorReq.anthroStructure) {
    content = renderAnthroMajor(majorReq, relevantCourses, majorValue, setMajorValue);
  } else {
    const completedRequired = majorReq.requiredCourses ? majorReq.requiredCourses.filter(req =>
      relevantCourses.some(course => codesMatch(course.code, req))
    ) : [];

    const majorElectives = relevantCourses.filter(course => {
      const dept = detectDepartmentFromCode(course.code);
      const majorDept = majorValue === "Computer Science" ? "Computer Science" :
                       majorValue === "Mathematics" ? "Mathematics" :
                       majorValue === "Economics" ? "Economics" : null;
      return dept === majorDept && !(majorReq.requiredCourses || []).some(req => codesMatch(course.code, req)) && course.level >= 200;
    });

    const completedMath = majorReq.mathRequirements ?
      majorReq.mathRequirements.filter(req =>
        relevantCourses.some(course => codesMatch(course.code, req))
      ) : [];

    content = (
      <div className="space-y-4">
        {renderMajorIntro(majorReq)}

        <div className="grid gap-4 md:grid-cols-3">
          {majorReq.requiredCourses && majorReq.requiredCourses.length > 0 && (
            <div className="rounded-lg border p-3">
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
            <div className="mt-2 text-xs text-slate-500">
              {majorElectives.length}/{majorReq.electiveCourses} completed
            </div>
          </div>

          {majorReq.mathRequirements && (
            <div className="rounded-lg border p-3">
              <div className="mb-2 text-sm font-medium">Math Requirements</div>
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
              <div className="mt-2 text-xs text-slate-500">
                {completedMath.length}/{majorReq.mathRequirements.length} completed
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm space-y-4">
      {renderSummaryHeader(false)}
      {content}
    </div>
  );
};

const renderMinorPlannerCard = (onRemove) => {
  const normalizedMinorKey = resolveMinorConfigKey(selectedMinor);
  const selectedMinorOption = minorOptions.find(option => option.value === selectedMinor);
  const selectedMinorLabel = selectedMinorOption?.label || selectedMinor;

  if (!selectedMinor) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Minor Planner</div>
            <p className="mt-1 text-sm text-slate-600">Choose a minor from the dropdown to start planning.</p>
          </div>
          <div className="flex items-center gap-3">
            <MinorSelect value={selectedMinor} onChange={setSelectedMinor} />
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="text-xs font-semibold text-slate-500 underline-offset-2 hover:text-rose-600"
                aria-label="Remove minor planner"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (normalizedMinorKey === "Custom Minor") {
    return renderCustomMinor(selectedMinor, setSelectedMinor, selectedMinorLabel || "Custom Minor");
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="text-sm font-semibold text-slate-900">{selectedMinorLabel || "Minor Planner"}</div>
        <div className="flex items-center gap-3">
          <MinorSelect value={selectedMinor} onChange={setSelectedMinor} />
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-xs font-semibold text-slate-500 underline-offset-2 hover:text-rose-600"
              aria-label="Remove minor planner"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      <p className="text-sm text-slate-600">
        This minor isn't configured yet, but you can still track it in your planner using custom notes.
      </p>
    </div>
  );
};

const renderMajor = () => {
  return (
    <div className="mt-4 space-y-6">
      <div className="space-y-6">
        {renderMajorPlannerCard(primaryMajor, setPrimaryMajor, "Primary Major")}

        {showSecondaryMajor ? (
          renderMajorPlannerCard(secondaryMajor, setSecondaryMajor, "Additional Major", {
            onRemove: () => {
              setSecondaryMajor("");
              setShowSecondaryMajor(false);
            },
          })
        ) : (
          <button
            type="button"
            onClick={() => setShowSecondaryMajor(true)}
            className="w-full rounded-3xl border-2 border-dashed border-slate-300 bg-white/60 px-4 py-3 text-sm font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
          >
            + Add another major viewer
          </button>
        )}
      </div>

      <div className="space-y-3">
        {showMinorPlanner ? (
          renderMinorPlannerCard(() => {
            setSelectedMinor("");
            setShowMinorPlanner(false);
          })
        ) : (
          <button
            type="button"
            onClick={() => setShowMinorPlanner(true)}
            className="w-full rounded-3xl border-2 border-dashed border-slate-300 bg-white/60 px-4 py-3 text-sm font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
          >
            + Add minor planner
          </button>
        )}
      </div>
    </div>
  );
};

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Top bar */}
      <header className="mb-4 flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-slate-900">
            Wellesley Academic Planner
          </h1>
          <p className="text-xs text-slate-500">
            Plan academic years, track requirements, and see your progress at a glance.
          </p>
        </div>
        <nav className="flex gap-2 text-xs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cx(
                "rounded-full px-3 py-1.5",
                activeTab === tab.id ? "bg-slate-900 text-white" : "bg-white text-slate-700 border"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {activeTab === "plan" && renderPlan()}
      {activeTab === "reqs" && renderRequirements()}
      {activeTab === "courses" && renderCourses()}
      {activeTab === "major" && renderMajor()}

      <TermDetailModal
        term={activeTermId ? termById(activeTermId) : null}
        onClose={() => setActiveTermId(null)}
        updateSlot={updateSlot}
        addSlot={addSlot}
        removeSlot={removeSlot}
        programSelections={programSelections}
        programRequirementOptions={programRequirementOptionsMap}
      />
    </div>
  );
}
