import {
  computeAnthroProgress,
  computeAfrProgress,
  computeAmstProgress,
  computeArchProgress,
  computeArtHistoryProgress,
  computeBiocProgress,
  computeBioProgress,
  computeCamsProgress,
  computeChemProgress,
  computeChphProgress,
  computeClassicsProgress,
  computeClscProgress,
  computeCpltProgress,
  computeCSProgress,
  computeDsProgress,
  computeEalcProgress,
  computeEasProgress,
  computeEducationProgress,
  computeEconProgress,
  computeEsProgress,
  computeMASProgress,
  computeStudioProgress,
  computeEnglishProgress,
} from "./progress.js";
import { majorRequirements, subjectOptions } from "../data.js";
import { detectDepartmentFromCode, normalizeCourseCode, codesMatch } from "../utils.js";

const SUBJECT_NAME_SET = new Set(subjectOptions);

const splitCodes = (entry = "") => entry.split("/").map(part => part.trim()).filter(Boolean);
const matchesAny = (course, list = []) =>
  list.some(entry => splitCodes(entry).some(code => codesMatch(course.code, code)));

const defaultResolveMajorConfigKey = (value = "") => {
  if (!value) return "";
  if (majorRequirements[value]) return value;
  return "";
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

export const summarizeProgramProgress = (programName, courses, programMeta = {}, resolveMajorConfigKey = defaultResolveMajorConfigKey) => {
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
  if (programName === "Economics" && config.econStructure) {
    return { config, isEcon: true, econProgress: computeEconProgress(courses, config.econStructure) };
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
  if (config.archStructure) {
    return {
      config,
      isArchitecture: true,
      archProgress: computeArchProgress(courses, config.archStructure),
    };
  }
  if (config.studioStructure) {
    return {
      config,
      isStudioArt: true,
      studioProgress: computeStudioProgress(courses, config.studioStructure),
    };
  }
  if (config.artHistoryStructure) {
    return {
      config,
      isArtHistory: true,
      artHistoryProgress: computeArtHistoryProgress(courses, config.artHistoryStructure),
    };
  }
  if (config.biocStructure) {
    return {
      config,
      isBiochemistry: true,
      biocProgress: computeBiocProgress(courses, config.biocStructure),
    };
  }
  if (config.chphStructure) {
    return {
      config,
      isChemicalPhysics: true,
      chphProgress: computeChphProgress(courses, config.chphStructure),
    };
  }
  if (config.chemStructure) {
    return {
      config,
      isChemistry: true,
      chemistryProgress: computeChemProgress(courses, config.chemStructure),
    };
  }
  if (config.camsStructure) {
    return {
      config,
      isCams: true,
      camsProgress: computeCamsProgress(courses, config.camsStructure),
    };
  }
  if (config.classicsStructure) {
    return {
      config,
      isClassics: true,
      classicsProgress: computeClassicsProgress(courses, config.classicsStructure),
    };
  }
  if (config.clscStructure) {
    return {
      config,
      isClsc: true,
      clscProgress: computeClscProgress(courses, config.clscStructure),
    };
  }
  if (config.cpltStructure) {
    return {
      config,
      isComparativeLit: true,
      cpltProgress: computeCpltProgress(courses, config.cpltStructure),
    };
  }
  if (config.dsStructure) {
    return {
      config,
      isDataScience: true,
      dsProgress: computeDsProgress(courses, config.dsStructure),
    };
  }
  if (config.easStructure) {
    return {
      config,
      isEastAsianStudies: true,
      easProgress: computeEasProgress(courses, config.easStructure),
    };
  }
  if (config.ealcStructure) {
    return {
      config,
      isEalc: true,
      ealcProgress: computeEalcProgress(courses, config.ealcStructure),
    };
  }
  if (config.esStructure) {
    return {
      config,
      isEnvironmentalStudies: true,
      esProgress: computeEsProgress(courses, config.esStructure),
    };
  }
  if (config.educationStructure) {
    return {
      config,
      isEducationStudies: true,
      educationProgress: computeEducationProgress(courses, config.educationStructure),
    };
  }
  if (config.lasStructure) {
    return {
      config,
      isLas: true,
      lasProgress: computeLasProgress(courses, config.lasStructure, config.unitTarget),
      requiredTotal: 0,
      requiredCompleted: 0,
      electiveTotal: 0,
      electiveCompleted: 0,
      mathTotal: 0,
      mathCompleted: 0,
    };
  }
  if (config.merStructure) {
    return {
      config,
      isMer: true,
      merProgress: computeMerProgress(courses, config.merStructure, config.unitTarget),
      requiredTotal: 0,
      requiredCompleted: 0,
      electiveTotal: 0,
      electiveCompleted: 0,
      mathTotal: 0,
      mathCompleted: 0,
    };
  }
  if (config.mesStructure) {
    return {
      config,
      isMes: true,
      mesProgress: computeMesProgress(courses, config.mesStructure, config.unitTarget),
      requiredTotal: 0,
      requiredCompleted: 0,
      electiveTotal: 0,
      electiveCompleted: 0,
      mathTotal: 0,
      mathCompleted: 0,
    };
  }
  if (config.musicStructure) {
    return {
      config,
      isMusic: true,
      musicProgress: computeMusicProgress(courses, config.musicStructure, config.unitTarget),
      requiredTotal: 0,
      requiredCompleted: 0,
      electiveTotal: 0,
      electiveCompleted: 0,
      mathTotal: 0,
      mathCompleted: 0,
    };
  }
  if (normalizedKey === "French" && config.frenchStructure) {
    return {
      config,
      isFrench: true,
      frenchProgress: computeFrenchProgress(courses, config.frenchStructure),
      requiredTotal: 0,
      requiredCompleted: 0,
      electiveTotal: 0,
      electiveCompleted: 0,
      mathTotal: 0,
      mathCompleted: 0,
    };
  }
  if (normalizedKey === "French Cultural Studies" && config.frenchCulturalStructure) {
    return {
      config,
      isFrenchCultural: true,
      frenchCulturalProgress: computeFrenchCulturalProgress(courses, config.frenchCulturalStructure),
      requiredTotal: 0,
      requiredCompleted: 0,
      electiveTotal: 0,
      electiveCompleted: 0,
      mathTotal: 0,
      mathCompleted: 0,
    };
  }
  if (normalizedKey === "Geosciences" && config.geosciencesStructure) {
    return {
      config,
      isGeosciences: true,
      geosciencesProgress: computeGeosciencesProgress(courses, config.geosciencesStructure),
      requiredTotal: 0,
      requiredCompleted: 0,
      electiveTotal: 0,
      electiveCompleted: 0,
      mathTotal: 0,
      mathCompleted: 0,
    };
  }
  if (normalizedKey === "German Studies" && config.germanStructure) {
    return {
      config,
      isGermanStudies: true,
      germanStudiesProgress: computeGermanStudiesProgress(courses, config.germanStructure),
      requiredTotal: 0,
      requiredCompleted: 0,
      electiveTotal: 0,
      electiveCompleted: 0,
      mathTotal: 0,
      mathCompleted: 0,
    };
  }
  if (normalizedKey === "History" && config.historyStructure) {
    return {
      config,
      isHistory: true,
      historyProgress: computeHistoryProgress(courses, config.historyStructure),
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

export const programRequirementOptionSets = {
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
    { id: "econ-elective", label: "ECON Elective", required: 1 },
  ],
  "Comparative Literary Studies": [
    { id: "cplt-pre1900", label: "Pre-1900 Course", required: 1 },
    { id: "cplt-concentration", label: "Concentration Courses", required: 3 },
    { id: "cplt-concentration-300", label: "Concentration 300-level", required: 1 },
  ],
  "Education Studies": [
    { id: "educ-core", label: "Core (EDUC 120/214/215/216)", required: 1 },
    { id: "educ-research", label: "Education Research & Theory", required: 4 },
    { id: "educ-capstone", label: "Capstone / Thesis", required: 1 },
    { id: "educ-300", label: "300-level EDUC Courses", required: 2 },
  ],
  "Environmental Studies": [
    { id: "es-core", label: "Core: ES 102 & ES 214", required: 2 },
    { id: "es-science", label: "Science / NPS courses", required: 2 },
    { id: "es-humanities", label: "ES Humanities (HST/LL/REP/ARTS)", required: 1 },
    { id: "es-electives", label: "ES Electives", required: 4 },
    { id: "es-300", label: "300-level ES elective", required: 1 },
    { id: "es-capstone", label: "Capstone (ES 300/399)", required: 1 },
  ],
  French: [
    { id: "fren-foundation", label: "Foundation (FREN 210/211/212)", required: 1 },
    { id: "fren-300", label: "300-level French (in French)", required: 2 },
    { id: "fren-senior-300", label: "Senior year 300-level", required: 1 },
    { id: "fren-english-course", label: "English-taught French course (optional)", required: 0 },
    { id: "fren-elective", label: "French elective", required: 5 },
  ],
  "French Cultural Studies": [
    { id: "frcs-fren207", label: "FREN 207", required: 1 },
    { id: "frcs-foundation", label: "Foundation (FREN 210/211/212)", required: 1 },
    { id: "frcs-300", label: "300-level French", required: 2 },
    { id: "frcs-french-elective", label: "French elective", required: 1 },
    { id: "frcs-other-dept", label: "Other department course", required: 4 },
  ],
  "Italian Studies": [
    { id: "itas-foundation", label: "Foundation (ITAS 209/210/220/272)", required: 1 },
    { id: "itas-300", label: "300-level Italian (in dept)", required: 2 },
    { id: "itas-outside-dept", label: "Related outside course (optional)", required: 0 },
    { id: "itas-elective", label: "Italian Studies elective", required: 6 },
  ],
  Geosciences: [
    { id: "geos-core-100", label: "Core 100-level (GEOS 101/102)", required: 1 },
    { id: "geos-core-200", label: "Core 200-level (GEOS 200/200X)", required: 1 },
    { id: "geos-core-203", label: "GEOS 203", required: 1 },
    { id: "geos-300-lab", label: "300-level GEOS with lab (Wellesley)", required: 1 },
    { id: "geos-300-elective", label: "300-level GEOS elective", required: 2 },
    { id: "geos-200-elective", label: "200-level GEOS elective", required: 2 },
    { id: "geos-cognate", label: "STEM cognate course", required: 4 },
  ],
  "German Studies": [
    { id: "ger-advanced", label: "German course (above GER 102)", required: 6 },
    { id: "ger-english", label: "Related course (English)", required: 3 },
  ],
  History: [
    { id: "hist-300-seminar", label: "300-level seminar", required: 1 },
    { id: "hist-300-other", label: "300-level course", required: 1 },
    { id: "hist-non-western", label: "Non-Western history", required: 1 },
    { id: "hist-western", label: "Western history", required: 1 },
    { id: "hist-premodern", label: "Premodern history", required: 1 },
    { id: "hist-elective", label: "History elective", required: 4 },
  ],
  "Jewish Studies": [
    { id: "jwst-intro", label: "JWST 102 / REL 102", required: 1 },
    { id: "jwst-300", label: "300-level Jewish Studies", required: 2 },
    { id: "jwst-concentration", label: "Concentration course", required: 4 },
    { id: "jwst-language", label: "Language course (intermediate)", required: 2 },
  ],
  "Custom Major": [],
};

export const sanitizeReqKey = (key = "") => key.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export const getRequirementOptionsForMajor = (majorName, resolveMajorConfigKey = defaultResolveMajorConfigKey) => {
  const normalizedKey = resolveMajorConfigKey(majorName);
  if (!normalizedKey) return [];
  if (programRequirementOptionSets[normalizedKey]) {
    return programRequirementOptionSets[normalizedKey];
  }
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

export const getAssignedRequirementId = (course, programId) =>
  programId ? course.programs?.[programId]?.requirement || "" : "";

export const countAssignedRequirement = (courses, programId, requirementId) => {
  if (!programId || !requirementId) return 0;
  return courses.filter(course => getAssignedRequirementId(course, programId) === requirementId).length;
};

export const getCoursesForProgram = (programId, allCourses) => {
  const flagged = allCourses.filter(course => course.programs?.[programId]);
  if (flagged.length > 0) return flagged;
  return allCourses;
};

export const computeRequirementProgress = (programId, requirementOptions, programCourses) => {
  if (!requirementOptions.length) return { pct: 0, subtitle: "Awaiting assignments" };
  const total = requirementOptions.length;
  let sum = 0;
  requirementOptions.forEach(opt => {
    const required = opt.required || 1;
    const assigned = countAssignedRequirement(programCourses, programId, opt.id);
    sum += Math.min(assigned / required, 1);
  });
  const pct = Math.max(0, Math.min(1, sum / total));
  return { pct, subtitle: `${Math.round(pct * 100)}% complete` };
};

export const getMajorRelevantCourses = (majorValue, allCourses, programSelections, resolveMajorConfigKey = defaultResolveMajorConfigKey) => {
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

export const getMajorRequirementTarget = (majorName, resolveMajorConfigKey = defaultResolveMajorConfigKey) => {
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

const isLevel300 = (course) => {
  if (Number.isFinite(course?.level)) return course.level >= 300;
  const match = normalizeCourseCode(course.code).match(/(\d+)/);
  return match ? parseInt(match[1], 10) >= 300 : false;
};

export const computeLasProgress = (courses, lasStructure = {}, unitTarget = 9) => {
  const languageCourses = courses.filter(course => {
    const match = normalizeCourseCode(course.code).match(/^(SPAN|PORT)\s*(\d+)/);
    return match ? parseInt(match[2], 10) >= 241 : false;
  });
  const surveyCourses = courses.filter(course => matchesAny(course, lasStructure.surveyCourses));
  const humanitiesCourses = courses.filter(course => matchesAny(course, lasStructure.humanitiesCourses));
  const socialCourses = courses.filter(course => matchesAny(course, lasStructure.socialScienceCourses));
  const humanities300 = humanitiesCourses.filter(isLevel300);
  const social300 = socialCourses.filter(isLevel300);
  return {
    units: courses.length,
    unitTarget,
    language: languageCourses.length,
    surveys: surveyCourses.length,
    humanities: humanitiesCourses.length,
    humanities300: humanities300.length,
    social: socialCourses.length,
    social300: social300.length,
  };
};

export const computeMerProgress = (courses, merStructure = {}, unitTarget = 9) => {
  const poolMatches = courses.filter(course => matchesAny(course, merStructure.coursePool));
  const above100 = poolMatches.filter(course => {
    if (Number.isFinite(course?.level)) return course.level > 100;
    const match = normalizeCourseCode(course.code).match(/(\d+)/);
    return match ? parseInt(match[1], 10) > 100 : false;
  });
  const level300 = poolMatches.filter(isLevel300);
  return {
    units: poolMatches.length,
    unitTarget,
    above100: above100.length,
    level300: level300.length,
    above100Target: merStructure.concentrationAbove100 || 4,
    level300Target: merStructure.level300Required || 2,
  };
};

export const computeMesProgress = (courses, mesStructure = {}, unitTarget = 9) => {
  const languageCourses = courses.filter(course => {
    const match = normalizeCourseCode(course.code).match(/^ARAB\s*(\d+)/);
    return match ? parseInt(match[1], 10) >= 200 : false;
  });
  const concentrationCourses = courses.filter(course => matchesAny(course, mesStructure.coursePool));
  const level300 = concentrationCourses.filter(isLevel300);
  const seminar = concentrationCourses.find(course => isLevel300(course) && (course.title || "").toLowerCase().includes("seminar"));
  return {
    units: courses.length,
    unitTarget,
    language: languageCourses.length,
    concentration: concentrationCourses.length,
    concentrationTarget: mesStructure.concentrationCoursesRequired || 4,
    level300: level300.length,
    level300Target: mesStructure.level300Required || 2,
    seminarCode: seminar?.code || "",
  };
};

export const computeMusicProgress = (courses, musicStructure = {}, unitTarget = 10) => {
  const req = musicStructure.newRequirements || {};
  const theory = courses.filter(course => matchesAny(course, req.theoryCourses));
  const history = courses.filter(course => matchesAny(course, req.historyCultureCourses));
  const electives = courses.filter(course => matchesAny(course, req.electiveExamples));
  const capstone = courses.filter(course => matchesAny(course, req.capstoneCourses));
  const ensembles = courses.filter(course => matchesAny(course, req.ensembleCourses));
  return {
    units: courses.length,
    unitTarget,
    theory: theory.length,
    theoryTarget: req.theoryRequired || 3,
    history: history.length,
    historyTarget: req.historyCultureRequired || 4,
    elective: electives.length,
    electiveTarget: req.electiveRequired || 1,
    capstone: capstone.length,
    capstoneTarget: req.capstoneRequired || 1,
    ensemble: ensembles.length,
    ensembleTarget: req.ensembleRequired || 1,
  };
};

export const computeFrenchProgress = (courses, frenchStructure = {}) => {
  const frenchCourses = courses.filter(course => normalizeCourseCode(course.code).startsWith("FREN"));
  const above201 = frenchCourses.filter(course => {
    const match = normalizeCourseCode(course.code).match(/FREN\s*(\d+)/);
    return match ? parseInt(match[1], 10) > 201 : false;
  });
  const foundation = above201.filter(course => matchesAny(course, frenchStructure.foundationOptions || []));
  const level300 = frenchCourses.filter(isLevel300);
  return {
    totalCompleted: frenchCourses.length,
    totalRequired: frenchStructure.unitTarget || 9,
    above201: above201.length,
    foundation: foundation.length,
    foundationTarget: frenchStructure.foundationOptions ? 1 : 0,
    level300: level300.length,
    level300Target: frenchStructure.level300Required || 2,
  };
};

export const computeFrenchCulturalProgress = (courses, structure = {}) => {
  const frenchLike = courses.filter(course => {
    const code = normalizeCourseCode(course.code);
    return code.startsWith("FREN") || code.startsWith("FRST");
  });
  const above201 = frenchLike.filter(course => {
    const match = normalizeCourseCode(course.code).match(/FR(EN|ST)\s*(\d+)/);
    return match ? parseInt(match[2], 10) > 201 : false;
  });
  const foundation = frenchLike.filter(course => matchesAny(course, structure.foundationOptions || []));
  const level300 = frenchLike.filter(isLevel300);
  const total = courses.length;
  const otherDept = total - frenchLike.length;
  return {
    totalCompleted: total,
    totalRequired: structure.totalRequired || 8,
    frenchUnits: frenchLike.length,
    frenchTarget: structure.frenchUnitsRequired || 4,
    foundation: foundation.length,
    foundationTarget: structure.foundationRequired || 1,
    above201: above201.length,
    level300: level300.length,
    level300Target: structure.level300Required || 2,
    otherDept,
    otherDeptTarget: structure.otherDepartmentUnits || 4,
  };
};

export const computeGeosciencesProgress = (courses, structure = {}) => {
  const geosCourses = courses.filter(course => normalizeCourseCode(course.code).startsWith("GEOS"));
  const core100 = geosCourses.filter(course => matchesAny(course, structure.core100Options || [])).slice(0, 1).length;
  const core200 = geosCourses.filter(course => matchesAny(course, structure.core200Required || [])).length;
  const core203 = geosCourses.filter(course => matchesAny(course, ["GEOS 203"])).slice(0, 1).length;
  const level300 = geosCourses.filter(isLevel300).length;
  const level300Lab = geosCourses.filter(isLevel300).find(course => (course.title || "").toLowerCase().includes("lab")) ? 1 : 0;
  const level200 = geosCourses.filter(course => {
    const match = normalizeCourseCode(course.code).match(/GEOS\s*(\d+)/);
    return match ? parseInt(match[1], 10) >= 200 && parseInt(match[1], 10) < 300 : false;
  }).length;
  const electives = Math.max(0, geosCourses.length - (core100 + core200 + core203));
  return {
    totalCompleted: geosCourses.length,
    totalRequired: structure.totalRequired || 12,
    core100,
    core200,
    core203,
    level300,
    level300Lab,
    level200,
    level300Target: structure.level300ElectivesRequired || 3,
    level300LabTarget: structure.level300WellesleyWithLabRequired || 1,
    level200Target: structure.coreRequired || 3,
    elective: electives,
    electiveTarget: structure.electivesRequired || 5,
  };
};

export const computeGermanStudiesProgress = (courses, structure = {}) => {
  const germanCourses = courses.filter(course => {
    const code = normalizeCourseCode(course.code);
    return code.startsWith("GER") || code.startsWith("GRMN");
  });
  const above102 = germanCourses.filter(course => {
    const match = normalizeCourseCode(course.code).match(/(GER|GRMN)\s*(\d+)/);
    return match ? parseInt(match[1], 10) > 102 : false;
  });
  const level300 = germanCourses.filter(isLevel300);
  const englishCourses = courses.length - germanCourses.length;
  return {
    totalCompleted: courses.length,
    totalRequired: structure.totalRequired || 9,
    germanAbove102: above102.length,
    germanTarget: structure.aboveGER102Required || 6,
    level300: level300.length,
    englishCourses,
    englishMax: structure.englishTaughtAllowed || 3,
  };
};

export const computeHistoryProgress = (courses, structure = {}) => {
  const histCourses = courses.filter(course => normalizeCourseCode(course.code).startsWith("HIST"));
  const level300 = histCourses.filter(isLevel300).length;
  const seminar = histCourses.find(course => isLevel300(course) && (course.title || "").toLowerCase().includes("seminar")) ? 1 : 0;
  const nonWestern = histCourses.find(course => {
    const title = (course.title || "").toLowerCase();
    return (structure.nonWesternOptions || []).some(option => title.includes(option.toLowerCase()));
  }) ? 1 : 0;
  const western = histCourses.find(course => {
    const title = (course.title || "").toLowerCase();
    return (structure.westernOptions || []).some(option => title.includes(option.toLowerCase()));
  }) ? 1 : 0;
  const premodern = histCourses.find(course => {
    const title = (course.title || "").toLowerCase();
    return title.includes("medieval") || title.includes("ancient") || title.includes("classical") || title.includes("renaissance") || title.includes("early modern");
  }) ? 1 : 0;
  return {
    totalCompleted: histCourses.length,
    totalRequired: structure.totalRequired || 9,
    level300,
    level300Target: structure.level300Required || 2,
    seminar,
    nonWestern,
    western,
    premodern,
  };
};
