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
  normalizeCourseCode,
  compactCourseCode,
  codesMatch,
} from "./utils.js";
import {
  GPA_POINTS,
  LETTER_GRADE_OPTIONS,
  NON_LETTER_GRADE_OPTIONS,
} from "./constants/grades.js";
import { loadFromLocalStorage, saveToLocalStorage } from "./storage.js";
import {
  EditableYearLabel,
  MiniReqBar,
  RingStat,
  TermDetailModal,
  TermSummaryCard,
} from "./components.jsx";
import PlanProgramControls from "./components/PlanProgramControls.jsx";
import { CustomMajorManager, CustomMinorManager } from "./components/CustomProgramManager.jsx";
import { MajorSelect, MinorSelect } from "./components/ProgramSelects.jsx";
import {
  PROGRAM_TYPE_OPTIONS,
  resetProgramState,
  useProgramState,
} from "./hooks/useProgramState.js";
import {
  computeMASProgress,
  computeCSProgress,
  computeBioProgress,
  computeMathProgress,
  computeEconProgress,
  computeAnthroProgress,
  computeEnglishProgress,
  computeAfrProgress,
  computeAmstProgress,
  computeArchProgress,
  computeStudioProgress,
  computeArtHistoryProgress,
  computeBiocProgress,
  computeChphProgress,
  computeChemProgress,
  computeCamsProgress,
  computeClassicsProgress,
  computeCpltProgress,
  computeDsProgress,
  computeEalcProgress,
  computeEasProgress,
  computeEsProgress,
  computeEducationProgress,
} from "./majors/progress.js";
import { getMajorRenderer } from "./majors/renderers/index.js";

const TABS = [
  { id: "plan", label: "Planner" },
  { id: "reqs", label: "Requirements" },
  { id: "courses", label: "Courses" },
  { id: "major", label: "Major / Minor" },
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
  "Architecture",
  "Studio Art",
  "Biochemistry",
  "Chemical Physics",
  "Chemistry",
  "Cinema and Media Studies",
  "Classics",
  "Cognitive and Linguistic Sciences",
  "Comparative Literary Studies",
  "Data Science",
  "East Asian Languages and Cultures",
  "East Asian Studies",
  "Education Studies",
  "Environmental Studies",
]);

const MAX_CUSTOM_MAJOR_REQUIREMENTS = 15;
const DEFAULT_CUSTOM_MAJOR_COUNT = 9;
const CUSTOM_MAJOR_VALUE_PREFIX = "custom-major:";
const CUSTOM_MINOR_VALUE_PREFIX = "custom-minor:";
const MIN_CUSTOM_MINOR_REQUIREMENTS = 6;
const MAX_CUSTOM_MINOR_REQUIREMENTS = 12;
const DEFAULT_CUSTOM_MINOR_COUNT = 6;
const SUBJECT_NAME_SET = new Set(subjectOptions);
const DISTRIBUTION_TAG_PRIORITY = ["LL", "ARTS", "SBA", "EC", "REP", "HST", "NPS", "MM"];
const DISTRIBUTION_TAG_SET = new Set(DISTRIBUTION_TAG_PRIORITY);
const CALENDAR_SEASON_ORDER = { Winter: 1, Spring: 2, Summer: 3, Fall: 4 };
const BASE_CUSTOM_MAJOR_KEY = "custom-major:base";
const BASE_CUSTOM_MINOR_KEY = "custom-minor:base";

const createDefaultCustomMajorRequirementList = () =>
  Array(DEFAULT_CUSTOM_MAJOR_COUNT).fill("");
const createDefaultCustomMinorRequirementList = () =>
  Array(DEFAULT_CUSTOM_MINOR_COUNT).fill("");

const sanitizeRequirementList = (list, maxCount, defaultFactory) => {
  if (!Array.isArray(list)) {
    return defaultFactory();
  }
  return list
    .slice(0, maxCount)
    .map(item => (typeof item === "string" ? item : ""));
};

const buildRequirementMap = (mapSource, legacyList, {
  maxCount,
  defaultFactory,
  baseKey,
}) => {
  const result = {};
  if (mapSource && typeof mapSource === "object") {
    Object.entries(mapSource).forEach(([key, value]) => {
      result[key] = sanitizeRequirementList(value, maxCount, defaultFactory);
    });
  } else if (Array.isArray(legacyList)) {
    result[baseKey] = sanitizeRequirementList(legacyList, maxCount, defaultFactory);
  }
  if (!result[baseKey]) {
    result[baseKey] = defaultFactory();
  }
  return result;
};

const getCustomMajorRequirementKey = (value = "") => {
  if (typeof value === "string" && value.startsWith(CUSTOM_MAJOR_VALUE_PREFIX)) {
    return value;
  }
  return BASE_CUSTOM_MAJOR_KEY;
};

const getCustomMinorRequirementKey = (value = "") => {
  if (typeof value === "string" && value.startsWith(CUSTOM_MINOR_VALUE_PREFIX)) {
    return value;
  }
  return BASE_CUSTOM_MINOR_KEY;
};

const seasonFromMonth = (m) => {
  if (m === 0) return "Winter";
  if (m >= 1 && m <= 4) return "Spring";
  if (m >= 5 && m <= 7) return "Summer";
  return "Fall";
};


const calculateGPA = (terms = []) => {
  let totalCredits = 0;
  let totalPoints = 0;
  terms.forEach(term => {
    (term.slots || []).forEach(slot => {
      const grade = slot?.grade || "";
      const points = GPA_POINTS[grade];
      const credits = parseFloat(slot?.credits) || 0;
      if (points !== undefined && credits > 0) {
        totalCredits += credits;
        totalPoints += points * credits;
      }
    });
  });
  const gpa = totalCredits > 0 ? totalPoints / totalCredits : 0;
  return { gpa, totalCredits, totalPoints };
};

const isCustomMajorValue = (value = "") => {
  if (typeof value !== "string") return false;
  return value === "Custom Major" || value.startsWith(CUSTOM_MAJOR_VALUE_PREFIX);
};

const isCustomMajorOptionValue = (value = "") => {
  if (typeof value !== "string") return false;
  return value.startsWith(CUSTOM_MAJOR_VALUE_PREFIX);
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

// ---- Main App ----
export default function App() {
  const savedDataRef = useRef(resetProgramState(loadFromLocalStorage()));
  const savedData = savedDataRef.current || null;
  const currentYear = new Date().getFullYear();
  const initialStartYear = savedData?.startYear || currentYear;
  const [terms, setTerms] = useState(() => savedData?.terms || []);
  const [activeTermId, setActiveTermId] = useState(null);
  const [activeTab, setActiveTab] = useState(savedData?.activeTab || "plan");
  const [startYear, setStartYear] = useState(initialStartYear);
  const [startYearDraft, setStartYearDraft] = useState(String(initialStartYear));
  const {
    programSelections,
    setProgramSelections,
    primaryMajor,
    setPrimaryMajor,
    secondaryMajor,
    setSecondaryMajor,
    showSecondaryMajor,
    setShowSecondaryMajor,
    selectedMinor,
    setSelectedMinor,
    showMinorPlanner,
    setShowMinorPlanner,
  } = useProgramState(savedData);
  const [yearLabels, setYearLabels] = useState(
    savedData?.yearLabels || Object.fromEntries(defaultYears.map((y) => [y.id, y.label]))
  );
  const [languageWaived, setLanguageWaived] = useState(savedData?.languageWaived || false);
  const [customMajorRequirementMap, setCustomMajorRequirementMap] = useState(() =>
    buildRequirementMap(
      savedData?.customMajorRequirementMap,
      savedData?.customMajorRequirements,
      {
        maxCount: MAX_CUSTOM_MAJOR_REQUIREMENTS,
        defaultFactory: createDefaultCustomMajorRequirementList,
        baseKey: BASE_CUSTOM_MAJOR_KEY,
      }
    )
  );
  const [customMajors, setCustomMajors] = useState(() => ensureCustomMajorList(savedData?.customMajors));
  const [newCustomMajorName, setNewCustomMajorName] = useState("");
  const [customMinorRequirementMap, setCustomMinorRequirementMap] = useState(() =>
    buildRequirementMap(
      savedData?.customMinorRequirementMap,
      savedData?.customMinorRequirements,
      {
        maxCount: MAX_CUSTOM_MINOR_REQUIREMENTS,
        defaultFactory: createDefaultCustomMinorRequirementList,
        baseKey: BASE_CUSTOM_MINOR_KEY,
      }
    )
  );
  const [customMinors, setCustomMinors] = useState(() => ensureCustomMinorList(savedData?.customMinors));
  const [newCustomMinorName, setNewCustomMinorName] = useState("");
  const [editingCustomMajorId, setEditingCustomMajorId] = useState(null);
  const [editingCustomMajorName, setEditingCustomMajorName] = useState("");
  const [editingCustomMinorId, setEditingCustomMinorId] = useState(null);
  const [editingCustomMinorName, setEditingCustomMinorName] = useState("");
  const [currentTermId, setCurrentTermId] = useState(savedData?.currentTermId || "");
  const gpaSummary = useMemo(() => calculateGPA(terms), [terms]);
  useEffect(() => {
    setStartYearDraft(String(startYear));
  }, [startYear]);

  useEffect(() => {
    if (!isCustomMajorOptionValue(primaryMajor)) return;
    const exists = customMajors.some(
      (item) => createCustomMajorOptionValue(item.id) === primaryMajor
    );
    if (!exists) {
      setPrimaryMajor("Custom Major");
    }
  }, [primaryMajor, customMajors]);

  useEffect(() => {
    if (!isCustomMajorOptionValue(secondaryMajor)) return;
    const exists = customMajors.some(
      (item) => createCustomMajorOptionValue(item.id) === secondaryMajor
    );
    if (!exists) {
      setSecondaryMajor("Custom Major");
    }
  }, [secondaryMajor, customMajors]);

  const termById = (id) => terms.find(t => t.id === id) || null;

  const getSeasonForTerm = (term) => {
    if (!term) return null;
    if (term.season) return term.season;
    if (term.id?.includes("-F")) return "Fall";
    if (term.id?.includes("-S")) return "Spring";
    if (term.id?.includes("-U")) return "Summer";
    if (term.id?.includes("-W")) return "Winter";
    return null;
  };

  const getYearNumberForTerm = (term) => {
    if (!term) return null;
    if (Number.isFinite(term.year)) return term.year;
    const match = term.id?.match(/Y(\d+)-/);
    return match ? parseInt(match[1], 10) : null;
  };

  const getCalendarYearForTerm = (term) => {
    if (!term) return null;
    if (Number.isFinite(term.calendarYear)) return term.calendarYear;
    const season = getSeasonForTerm(term);
    const baseYear = getYearNumberForTerm(term) ?? 1;
    if (!season) return null;
    return (season === "Fall" || season === "Winter")
      ? startYear + (baseYear - 1)
      : startYear + baseYear;
  };

  const sortedTerms = useMemo(() => {
    const seasonOrder = { Fall: 1, Winter: 2, Spring: 3, Summer: 4 };
    return [...terms]
      .filter(Boolean)
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return (seasonOrder[a.season] || 0) - (seasonOrder[b.season] || 0);
      });
  }, [terms]);

  const termStatuses = useMemo(() => {
    const statusMap = {};
    if (!sortedTerms.length) return statusMap;
    const currentIndex = currentTermId ? sortedTerms.findIndex(term => term.id === currentTermId) : -1;
    if (currentIndex >= 0) {
      sortedTerms.forEach((term, idx) => {
        if (idx < currentIndex) statusMap[term.id] = "past";
        else if (idx === currentIndex) statusMap[term.id] = "current";
        else statusMap[term.id] = "future";
      });
      return statusMap;
    }
    const now = new Date();
    const targetSeason = seasonFromMonth(now.getMonth());
    const targetYear = now.getFullYear();
    const targetSeasonRank = CALENDAR_SEASON_ORDER[targetSeason] || 0;

    sortedTerms.forEach(term => {
      const termSeason = getSeasonForTerm(term);
      const termYear = getCalendarYearForTerm(term);
      if (!termSeason || !Number.isFinite(termYear)) {
        statusMap[term.id] = "unspecified";
        return;
      }
      const rank = CALENDAR_SEASON_ORDER[termSeason] || 0;
      if (termYear < targetYear || (termYear === targetYear && rank < targetSeasonRank)) {
        statusMap[term.id] = "past";
      } else if (termYear === targetYear && rank === targetSeasonRank) {
        statusMap[term.id] = "current";
      } else {
        statusMap[term.id] = "future";
      }
    });

    return statusMap;
  }, [sortedTerms, currentTermId, startYear]);

  const getCustomMajorRequirementsForValue = (majorValue) => {
    const key = getCustomMajorRequirementKey(majorValue);
    return customMajorRequirementMap[key] || customMajorRequirementMap[BASE_CUSTOM_MAJOR_KEY] || createDefaultCustomMajorRequirementList();
  };

  const updateCustomMajorRequirement = (majorValue, index, value) => {
    const key = getCustomMajorRequirementKey(majorValue);
    setCustomMajorRequirementMap(prev => {
      const current = prev[key] || createDefaultCustomMajorRequirementList();
      if (index < 0 || index >= current.length) return prev;
      const next = current.map((entry, i) => (i === index ? value : entry));
      return { ...prev, [key]: next };
    });
  };

  const addCustomMajorRequirementRow = (majorValue) => {
    const key = getCustomMajorRequirementKey(majorValue);
    setCustomMajorRequirementMap(prev => {
      const current = prev[key] || createDefaultCustomMajorRequirementList();
      if (current.length >= MAX_CUSTOM_MAJOR_REQUIREMENTS) return prev;
      return { ...prev, [key]: [...current, ""] };
    });
  };

  const getCustomMinorRequirementsForValue = (minorValue) => {
    const key = getCustomMinorRequirementKey(minorValue);
    return customMinorRequirementMap[key] || customMinorRequirementMap[BASE_CUSTOM_MINOR_KEY] || createDefaultCustomMinorRequirementList();
  };

  const updateCustomMinorRequirement = (minorValue, index, value) => {
    const key = getCustomMinorRequirementKey(minorValue);
    setCustomMinorRequirementMap(prev => {
      const current = prev[key] || createDefaultCustomMinorRequirementList();
      if (index < 0 || index >= current.length) return prev;
      const next = current.map((entry, i) => (i === index ? value : entry));
      return { ...prev, [key]: next };
    });
  };

  const addCustomMinorRequirementRow = (minorValue) => {
    const key = getCustomMinorRequirementKey(minorValue);
    setCustomMinorRequirementMap(prev => {
      const current = prev[key] || createDefaultCustomMinorRequirementList();
      if (current.length >= MAX_CUSTOM_MINOR_REQUIREMENTS) return prev;
      return { ...prev, [key]: [...current, ""] };
    });
  };

  const addCustomMajor = (selectMajorValue) => {
    const trimmed = newCustomMajorName.trim();
    if (!trimmed) return;
    if (customMajors.some(item => item.name.toLowerCase() === trimmed.toLowerCase())) return;
    const entry = { id: generateCustomMajorId(), name: trimmed };
    const newValue = createCustomMajorOptionValue(entry.id);
    setCustomMajors(prev => [...prev, entry]);
    setCustomMajorRequirementMap(prev => ({
      ...prev,
      [newValue]: createDefaultCustomMajorRequirementList(),
    }));
    if (typeof selectMajorValue === "function") {
      selectMajorValue(newValue);
    } else if (!primaryMajor) {
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
    if (primaryMajor === valueToRemove) {
      setPrimaryMajor("Custom Major");
    }
    if (secondaryMajor === valueToRemove) {
      setSecondaryMajor("Custom Major");
    }
    setCustomMajors(prev => prev.filter(item => item.id !== majorId));
    setProgramSelections(prev =>
      prev.map(program => {
        if (program.value === valueToRemove) {
          return { ...program, value: "Custom Major" };
        }
        return program;
      })
    );
    setPrimaryMajor(prev => (prev === valueToRemove ? "Custom Major" : prev));
    setSecondaryMajor(prev => (prev === valueToRemove ? "Custom Major" : prev));
    setCustomMajorRequirementMap(prev => {
      if (!prev[valueToRemove]) return prev;
      const next = { ...prev };
      delete next[valueToRemove];
      if (!next[BASE_CUSTOM_MAJOR_KEY]) {
        next[BASE_CUSTOM_MAJOR_KEY] = createDefaultCustomMajorRequirementList();
      }
      return next;
    });
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

  const addCustomMinor = (selectMinorValue) => {
    const trimmed = newCustomMinorName.trim();
    if (!trimmed) return;
    if (customMinors.some(item => item.name.toLowerCase() === trimmed.toLowerCase())) return;
    const entry = { id: generateCustomMinorId(), name: trimmed };
    const newValue = createCustomMinorOptionValue(entry.id);
    setCustomMinors(prev => [...prev, entry]);
    setCustomMinorRequirementMap(prev => ({
      ...prev,
      [newValue]: createDefaultCustomMinorRequirementList(),
    }));
    if (typeof selectMinorValue === "function") {
      selectMinorValue(newValue);
    } else {
      setSelectedMinor(newValue);
    }
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
    setCustomMinorRequirementMap(prev => {
      if (!prev[valueToRemove]) return prev;
      const next = { ...prev };
      delete next[valueToRemove];
      if (!next[BASE_CUSTOM_MINOR_KEY]) {
        next[BASE_CUSTOM_MINOR_KEY] = createDefaultCustomMinorRequirementList();
      }
      return next;
    });
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
      customMajorRequirementMap,
      customMajorRequirements: customMajorRequirementMap[BASE_CUSTOM_MAJOR_KEY] || [],
      customMajors,
      customMinorRequirementMap,
      customMinorRequirements: customMinorRequirementMap[BASE_CUSTOM_MINOR_KEY] || [],
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
  }, [terms, activeTab, startYear, yearLabels, languageWaived, programSelections, customMajorRequirementMap, customMajors, customMinorRequirementMap, customMinors, primaryMajor, secondaryMajor, showSecondaryMajor, selectedMinor, showMinorPlanner, currentTermId]);

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

  const handleConfirmStartYear = () => {
    const parsedDraft = parseInt(startYearDraft, 10);
    if (!Number.isFinite(parsedDraft)) return;
    const normalizedYear = parsedDraft;
    setStartYear(normalizedYear);
    setStartYearDraft(String(normalizedYear));
    setTerms(prev => {
      if (!prev.length) {
        return getDefaultTerms(normalizedYear);
      }
      return prev.map(term => {
        const derivedSeason =
          term.season ||
          (term.id?.includes("-F") ? "Fall" :
           term.id?.includes("-S") ? "Spring" :
           term.id?.includes("-U") ? "Summer" :
           term.id?.includes("-W") ? "Winter" : "Fall");
        const baseYear = Number.isFinite(term.year)
          ? term.year
          : (() => {
              const match = term.id?.match(/Y(\d+)-/);
              return match ? parseInt(match[1], 10) : 1;
            })();
        const adjustedYear = baseYear || 1;
        const actualYear =
          derivedSeason === "Fall" || derivedSeason === "Winter"
            ? normalizedYear + (adjustedYear - 1)
            : normalizedYear + adjustedYear;
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
    setCurrentTermId("");
  };

  const determineAutoCurrentTermId = useCallback(() => {
    if (!terms.length) return "";
    const now = new Date();
    const targetSeason = seasonFromMonth(now.getMonth());
    const targetYear = now.getFullYear();
    const targetRank = CALENDAR_SEASON_ORDER[targetSeason] || 0;
    const sorted = [...terms].sort((a, b) => {
      const aYear = getCalendarYearForTerm(a) || 0;
      const bYear = getCalendarYearForTerm(b) || 0;
      if (aYear !== bYear) return aYear - bYear;
      const aRank = CALENDAR_SEASON_ORDER[getSeasonForTerm(a)] || 0;
      const bRank = CALENDAR_SEASON_ORDER[getSeasonForTerm(b)] || 0;
      return aRank - bRank;
    });
    const earliest = sorted[0];
    if (earliest) {
      const earliestYear = getCalendarYearForTerm(earliest);
      const earliestRank = CALENDAR_SEASON_ORDER[getSeasonForTerm(earliest)] || 0;
      if (
        Number.isFinite(earliestYear) &&
        (earliestYear > targetYear ||
          (earliestYear === targetYear && earliestRank > targetRank))
      ) {
        return "";
      }
    }
    const exact = sorted.find(term => {
      const termSeason = getSeasonForTerm(term);
      const termYear = getCalendarYearForTerm(term);
      return termSeason === targetSeason && termYear === targetYear;
    });
    if (exact) return exact.id;
    const future = sorted.find(term => {
      const termYear = getCalendarYearForTerm(term);
      const termSeason = getSeasonForTerm(term);
      const termRank = CALENDAR_SEASON_ORDER[termSeason] || 0;
      if (!Number.isFinite(termYear)) return false;
      return termYear > targetYear || (termYear === targetYear && termRank > targetRank);
    });
    if (future) return future.id;
    return sorted[sorted.length - 1]?.id || "";
  }, [terms, startYear]);

  useEffect(() => {
    if (currentTermId && terms.some(term => term.id === currentTermId)) return;
    const guessed = determineAutoCurrentTermId();
    if (guessed) {
      setCurrentTermId(guessed);
    } else if (currentTermId) {
      setCurrentTermId("");
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

const chooseDistributionTag = (courseTags = [], counts = {}) => {
  const candidates = courseTags.filter(tag => DISTRIBUTION_TAG_PRIORITY.includes(tag));
  if (!candidates.length) return null;

  const need = (tag) => (counts[tag] || 0);

  if (candidates.includes("LL") && need("LL") < 1) return "LL";
  if (candidates.includes("ARTS") && need("ARTS") < 1) return "ARTS";
  if (candidates.includes("SBA") && need("SBA") < 1) return "SBA";

  const humanitiesTags = candidates.filter(tag => ["EC", "REP", "HST"].includes(tag));
  const humanitiesCount = Math.min((counts.EC || 0) + (counts.REP || 0) + (counts.HST || 0), 2);
  if (humanitiesTags.length && humanitiesCount < 2) {
    return humanitiesTags.sort((a, b) => (counts[a] || 0) - (counts[b] || 0))[0];
  }

  if (candidates.includes("NPS") && need("NPS") < 1) return "NPS";
  if (candidates.includes("MM") && need("MM") < 1) return "MM";

  for (const tag of DISTRIBUTION_TAG_PRIORITY) {
    if (candidates.includes(tag)) return tag;
  }

  return candidates[0];
};


  // ---- Progress calculations ----
  const progress = useMemo(() => {
    const allRequirements = [...seedRequirements, ...internalRequirements];
    const counts = Object.fromEntries(allRequirements.map(r => [r.id, 0]));
    DISTRIBUTION_TAG_PRIORITY.forEach(tag => {
      if (!counts[tag]) counts[tag] = 0;
    });
    let totalUnits = 0;
    let level300 = 0;

    const assignmentMap = Object.fromEntries(allRequirements.map(r => [r.id, []]));

    terms.forEach(t =>
      t.slots.forEach(s => {
        if (!(s.code || s.title)) return;
        const credits = Number(s.credits || 0);
        totalUnits += credits;
        if (s.level >= 300) level300 += 1;
        const courseInfo = { term: t.label, code: s.code, title: s.title, credits };
        const chosenDistributionTag = chooseDistributionTag(s.tags || [], counts);
        const assignedTags = new Set();

        if (chosenDistributionTag) {
          assignedTags.add(chosenDistributionTag);
          counts[chosenDistributionTag] = (counts[chosenDistributionTag] || 0) + 1;
          if (assignmentMap[chosenDistributionTag]) assignmentMap[chosenDistributionTag].push(courseInfo);
        }

        (s.tags || []).forEach(tag => {
          if (assignedTags.has(tag)) return;
          if (DISTRIBUTION_TAG_SET.has(tag)) return;
          if (!counts[tag]) counts[tag] = 0;
          counts[tag] += 1;
          if (assignmentMap[tag]) assignmentMap[tag].push(courseInfo);
        });

        if (s.level >= 300) {
          if (assignmentMap["300"]) assignmentMap["300"].push(courseInfo);
        }

        if (assignmentMap["UNITS"]) assignmentMap["UNITS"].push(courseInfo);
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
      assignmentMap,
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
    const secondaryMode = showSecondaryMajor ? "Major" : showMinorPlanner ? "Minor" : "None";
    const gradedUnitsLabel = gpaSummary.totalCredits === 1
      ? "1 graded unit"
      : `${formatUnitDisplay(gpaSummary.totalCredits)} graded units`;
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
        <PlanProgramControls
          startYear={startYearDraft}
          onStartYearChange={setStartYearDraft}
          onConfirmStartYear={handleConfirmStartYear}
          primaryMajor={primaryMajor}
          onPrimaryMajorChange={setPrimaryMajor}
          majorOptions={majorOptions}
          secondaryMode={secondaryMode}
          onSecondaryModeChange={handleSecondaryModeChange}
          secondaryMajor={secondaryMajor}
          onSecondaryMajorChange={setSecondaryMajor}
          selectedMinor={selectedMinor}
          onSelectedMinorChange={setSelectedMinor}
          minorOptions={minorOptions}
        />

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

        <div className="rounded-lg border bg-white px-3 py-2 text-sm">
          <div className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500">Predicted GPA</div>
          <div className="text-2xl font-semibold text-slate-900">
            {gpaSummary.totalCredits ? gpaSummary.gpa.toFixed(2) : "—"}
          </div>
          <p className="text-[0.7rem] text-slate-500">
            {gpaSummary.totalCredits
              ? `Based on ${gradedUnitsLabel} using Wellesley’s 4.0 scale.`
              : "Enter course grades to see GPA."}
          </p>
        </div>

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
                  {program.type !== "None" && program.value && summary && summary.isComparativeLit && summary.cpltProgress && (
                    <div className="mt-3 space-y-2 text-[0.65rem]">
                      {renderProgramRing()}
                      {(() => {
                        const pre1900Assigned = countAssignedRequirement(programCourses, program.id, "cplt-pre1900");
                        const concentrationAssigned = countAssignedRequirement(programCourses, program.id, "cplt-concentration");
                        const concentration300Assigned = countAssignedRequirement(programCourses, program.id, "cplt-concentration-300");
                        const cards = [
                          { label: "CPLT 180", value: summary.cpltProgress.requiredCourses.find(r => r.code === "CPLT 180")?.completed ? "✓" : "Pending" },
                          { label: "CPLT 375", value: summary.cpltProgress.requiredCourses.find(r => r.code === "CPLT 375")?.completed ? "✓" : "Pending" },
                          { label: "CPLT units", value: `${summary.cpltProgress.cpltCount}/${summary.cpltProgress.minCpltCourses}` },
                          { label: "300-level CPLT", value: summary.cpltProgress.cplt300Count },
                          { label: "Pre-1900", value: `${pre1900Assigned}/1` },
                          { label: "Concentration", value: `${concentrationAssigned}/3` },
                          { label: "Concentration 300-level", value: `${concentration300Assigned}/1` },
                        ];
                        return (
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {cards.map(card => (
                              <div key={card.label} className="rounded border px-3 py-2 h-full text-center">
                                <div className="text-[0.55rem] uppercase text-slate-500">{card.label}</div>
                                <div className="text-base font-semibold text-slate-900">{card.value}</div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {program.type !== "None" && program.value && summary && summary.isArchitecture && summary.archProgress && (
                    <div className="mt-3 space-y-2 text-[0.65rem]">
                      {renderProgramRing()}
                      {(() => {
                        const arch = summary.archProgress;
                        const cards = [
                          { label: "Foundation", value: `${arch.foundation.filter(step => step.completed).length}/${arch.foundation.length || 0}` },
                          { label: "200-level", value: `${arch.intermediateCount}/${arch.intermediateRequired}` },
                          { label: "300-level", value: `${arch.advancedCount}/${arch.advancedRequired}` },
                          { label: "Allied electives", value: `${arch.additionalCount}/${arch.additionalRequired}` },
                        ];
                        return (
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            {cards.map(card => (
                              <div key={card.label} className="rounded border px-3 py-2 h-full">
                                <ProgramStatRow
                                  label={card.label}
                                  value={card.value}
                                  labelClass="text-[0.55rem] uppercase text-slate-500"
                                  valueClass="text-base font-semibold text-slate-900"
                                />
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {program.type !== "None" && program.value && summary && summary.isStudioArt && summary.studioProgress && (
                    <div className="mt-3 space-y-2 text-[0.65rem]">
                      {renderProgramRing()}
                      {(() => {
                        const studio = summary.studioProgress;
                        const cards = [
                          { label: "Foundations", value: `${studio.foundation.filter(step => step.completed).length}/${studio.foundation.length || 0}` },
                          { label: "200+ studio", value: `${studio.upperStudioCount}/${studio.upperStudioRequired}` },
                          { label: "300-level studio", value: `${studio.level300Count}/${studio.level300Required}` },
                          { label: "Capstone", value: `${studio.capstone.filter(item => item.completed).length}/${studio.capstone.length || 0}` },
                        ];
                        return (
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            {cards.map(card => (
                              <div key={card.label} className="rounded border px-3 py-2 h-full">
                                <ProgramStatRow
                                  label={card.label}
                                  value={card.value}
                                  labelClass="text-[0.55rem] uppercase text-slate-500"
                                  valueClass="text-base font-semibold text-slate-900"
                                />
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {program.type !== "None" && program.value && summary && summary.isArtHistory && summary.artHistoryProgress && (
                    <div className="mt-3 space-y-2 text-[0.65rem]">
                      {renderProgramRing()}
                      {(() => {
                        const artHist = summary.artHistoryProgress;
                        const regionCards = [
                          { label: "Americas", complete: artHist.amerCount >= 1 },
                          { label: "Africa/MidEast/Europe", complete: artHist.emeaCount >= 1 },
                          { label: "Asia", complete: artHist.asiaCount >= 1 },
                        ];
                        const periodCards = [
                          { label: "Pre-1800", value: `${artHist.pre1800Count}/3` },
                          { label: "Post-1800", value: `${artHist.post1800Count}/1` },
                          { label: "300-level", value: `${artHist.level300Count}/${artHist.level300Required}` },
                        ];
                        return (
                          <div className="space-y-2">
                            <div className="grid gap-2 sm:grid-cols-3">
                              {regionCards.map(card => (
                                <div key={card.label} className="rounded border px-3 py-2 text-center">
                                  <div className="text-[0.55rem] uppercase text-slate-500">{card.label}</div>
                                  <div className="text-base font-semibold text-slate-900">{card.complete ? "✓" : "0/1"}</div>
                                </div>
                              ))}
                            </div>
                            <div className="grid gap-2 sm:grid-cols-3">
                              {periodCards.map(card => (
                                <div key={card.label} className="rounded border px-3 py-2 text-center">
                                  <div className="text-[0.55rem] uppercase text-slate-500">{card.label}</div>
                                  <div className="text-base font-semibold text-slate-900">{card.value}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {program.type !== "None" && program.value && summary && summary.isBiochemistry && summary.biocProgress && (
                    <div className="mt-3 space-y-2 text-[0.65rem]">
                      {renderProgramRing()}
                      {(() => {
                        const bioc = summary.biocProgress;
                        const cards = [
                          { label: "Intro sciences", value: `${bioc.foundation.filter(step => step.completed).length}/${bioc.foundation.length || 0}` },
                          { label: "BISC 200-level", value: `${bioc.bisc200.filter(step => step.completed).length}/${bioc.bisc200.length || 0}` },
                          { label: "CHEM 200-level", value: `${bioc.chem200.filter(step => step.completed).length}/${bioc.chem200.length || 0}` },
                          { label: "BISC 300-level", value: `${bioc.bisc300Count}/${bioc.bisc300Required}` },
                          { label: "CHEM 331", value: bioc.chem331Completed ? "✓" : "Pending" },
                          { label: "CHEM/BIOC 300", value: `${bioc.chem300ElectiveCount}/${bioc.chem300ElectiveRequired}` },
                          { label: "Lab-designated", value: `${bioc.labCount}/${bioc.labRequired}` },
                        ];
                        return (
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {cards.map(card => (
                              <div key={card.label} className="rounded border px-3 py-2 h-full text-center">
                                <div className="text-[0.55rem] uppercase text-slate-500">{card.label}</div>
                                <div className="text-base font-semibold text-slate-900">{card.value}</div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {program.type !== "None" && program.value && summary && summary.isChemicalPhysics && summary.chphProgress && (
                    <div className="mt-3 space-y-2 text-[0.65rem]">
                      {renderProgramRing()}
                      {(() => {
                        const chph = summary.chphProgress;
                        const cards = [
                          { label: "General chemistry", value: chph.generalChem.completed ? "✓" : "Pending" },
                          { label: "Intro PHYS", value: `${chph.physicsIntroCount}/${chph.physicsIntroTotal}` },
                          { label: "Core sequence", value: `${chph.requiredCourses.filter(item => item.completed).length}/${chph.requiredCourses.length}` },
                          { label: "Lab/Flex", value: `${chph.labChoice.filter(item => item.completed).length}/${chph.labChoice.length || 1}` },
                          { label: "CHEM 334/335", value: chph.chemAdvancedCompleted ? "✓" : "Pending" },
                          { label: "PHYS elective", value: chph.physicsElectiveCompleted ? "✓" : "Pending" },
                        ];
                        return (
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {cards.map(card => (
                              <div key={card.label} className="rounded border px-3 py-2 h-full text-center">
                                <div className="text-[0.55rem] uppercase text-slate-500">{card.label}</div>
                                <div className="text-base font-semibold text-slate-900">{card.value}</div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {program.type !== "None" && program.value && summary && summary.isDataScience && summary.dsProgress && (
                    <div className="mt-3 space-y-2 text-[0.65rem]">
                      {renderProgramRing()}
                      {(() => {
                        const ds = summary.dsProgress;
                        const foundationComplete = ds.foundation.filter(step => step.completed).length;
                        const cards = [
                          { label: "Foundations", value: `${foundationComplete}/${ds.foundation.length || 0}` },
                          { label: "CS electives", value: `${ds.csElectiveCount}/1` },
                          { label: "STAT electives", value: `${ds.statElectiveCount}/1` },
                          { label: "Capstone", value: ds.hasCapstone ? "✓" : "Pending" },
                        ];
                        return (
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            {cards.map(card => (
                              <div key={card.label} className="rounded border px-3 py-2 h-full text-center">
                                <div className="text-[0.55rem] uppercase text-slate-500">{card.label}</div>
                                <div className="text-base font-semibold text-slate-900">{card.value}</div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {program.type !== "None" && program.value && summary && summary.isEalc && summary.ealcProgress && (
                    <div className="mt-3 space-y-2 text-[0.65rem]">
                      {renderProgramRing()}
                      {(() => {
                        const ealc = summary.ealcProgress;
                        const cards = [
                          { label: "Gateway", value: ealc.gatewayCompleted ? "✓" : "Pending" },
                          { label: "Non-language", value: `${ealc.nonLanguageCount}/${ealc.nonLanguageRequired}` },
                          { label: "Survey", value: `${ealc.surveyCount}/${ealc.surveyRequired}` },
                          { label: "300-level", value: `${ealc.level300Count}/${ealc.level300Required}` },
                        ];
                        return (
                          <div className="space-y-2">
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                              {cards.map(card => (
                                <div key={card.label} className="rounded border px-3 py-2 h-full text-center">
                                  <div className="text-[0.55rem] uppercase text-slate-500">{card.label}</div>
                                  <div className="text-base font-semibold text-slate-900">{card.value}</div>
                                </div>
                              ))}
                            </div>
                            <div className="rounded border px-3 py-2 text-center">
                              <div className="text-[0.55rem] uppercase text-slate-500">Language tracks</div>
                              <div className="text-[0.7rem] text-slate-600">
                                {ealc.trackResults.map(track => (
                                  <span key={track.id} className={cx("mx-1 font-semibold", track.completed ? "text-green-600" : "text-slate-500") }>
                                    {track.label}: {track.completed ? "✓" : "Pending"}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {program.type !== "None" && program.value && summary && summary.isEastAsianStudies && summary.easProgress && (
                    <div className="mt-3 space-y-2 text-[0.65rem]">
                      {renderProgramRing()}
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded border px-3 py-2 text-center">
                          <div className="text-[0.55rem] uppercase text-slate-500">Language units</div>
                          <div className="text-base font-semibold text-slate-900">
                            {summary.easProgress.languageCount}/{summary.easProgress.languageRequired}
                          </div>
                        </div>
                        <div className="rounded border px-3 py-2 text-center">
                          <div className="text-[0.55rem] uppercase text-slate-500">Non-language units</div>
                          <div className="text-base font-semibold text-slate-900">
                            {summary.easProgress.nonLanguageCount}/{summary.easProgress.nonLanguageRequired}
                          </div>
                        </div>
                        <div className="rounded border px-3 py-2 text-center">
                          <div className="text-[0.55rem] uppercase text-slate-500">Humanities</div>
                          <div className="text-base font-semibold text-slate-900">
                            {summary.easProgress.humanitiesCount}/{summary.easProgress.humanitiesRequired}
                          </div>
                        </div>
                        <div className="rounded border px-3 py-2 text-center">
                          <div className="text-[0.55rem] uppercase text-slate-500">History/Social Science</div>
                          <div className="text-base font-semibold text-slate-900">
                            {summary.easProgress.historyCount}/{summary.easProgress.historyRequired}
                          </div>
                        </div>
                        <div className="rounded border px-3 py-2 text-center">
                          <div className="text-[0.55rem] uppercase text-slate-500">300-level non-language</div>
                          <div className="text-base font-semibold text-slate-900">
                            {summary.easProgress.nonLang300Count}/{summary.easProgress.nonLang300Required}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {program.type !== "None" && program.value && summary && summary.isEducationStudies && summary.educationProgress && (
                    <div className="mt-3 space-y-2 text-[0.65rem]">
                      {renderProgramRing()}
                      {(() => {
                        const education = summary.educationProgress;
                        const cards = [
                          { label: "Core course", value: education.coreCompleted ? (education.coreFulfilledBy || "✓") : "Pending" },
                          { label: "Research & Theory", value: `${education.researchTheoryCount}/${education.researchTheoryRequired}` },
                          { label: "Capstone", value: education.capstoneCompleted ? (education.capstoneFulfilledBy || "✓") : "Pending" },
                          { label: "EDUC 300-level", value: `${education.education300Count}/${education.education300Required}` },
                          { label: "Curriculum (max 3)", value: education.curriculumCount },
                          { label: "Electives (max 3)", value: education.electiveCount },
                          { label: "Independent study limit", value: `${education.independentStudyCount}/${education.independentStudyLimit}` },
                          { label: "Education units", value: `${education.totalCourses}/${education.totalRequired}` },
                        ];
                        return (
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            {cards.map(card => (
                              <div key={card.label} className="rounded border px-3 py-2 h-full text-center">
                                <div className="text-[0.55rem] uppercase text-slate-500">{card.label}</div>
                                <div className="text-base font-semibold text-slate-900">{card.value}</div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {program.type !== "None" && program.value && summary && summary.isChemistry && summary.chemistryProgress && (
                    <div className="mt-3 space-y-2 text-[0.65rem]">
                      {renderProgramRing()}
                      {(() => {
                        const chem = summary.chemistryProgress;
                        const cards = [
                          { label: "Intro sequence", value: `${chem.foundation.filter(step => step.completed).length}/${chem.foundation.length || 0}` },
                          { label: "Core", value: `${chem.coreCourses.filter(step => step.completed).length}/${chem.coreCourses.length || 0}` },
                          { label: "Depth electives", value: `${chem.electiveCount}/${chem.electiveRequired}` },
                          { label: "Extra 300-level", value: `${chem.additional300Count}/${chem.additional300Required}` },
                          { label: "Research", value: chem.researchCompleted ? "✓" : "Pending" },
                          { label: "Physics", value: chem.physicsMet ? "✓ PHYS 106/108" : "Pending" },
                          { label: "Physics intro", value: chem.physicsIntroMet ? "✓" : "Pending" },
                          { label: "Calculus", value: chem.mathMet ? "✓" : "Pending" },
                        ];
                        return (
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            {cards.map(card => (
                              <div key={card.label} className="rounded border px-3 py-2 h-full text-center">
                                <div className="text-[0.55rem] uppercase text-slate-500">{card.label}</div>
                                <div className="text-base font-semibold text-slate-900">{card.value}</div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {program.type !== "None" && program.value && summary && summary.isCams && summary.camsProgress && (
                    <div className="mt-3 space-y-2 text-[0.65rem]">
                      {renderProgramRing()}
                      {(() => {
                        const cams = summary.camsProgress;
                        const cards = [
                          { label: "Core (201/202)", value: `${cams.foundation.filter(step => step.completed).length}/${cams.foundation.length || 0}` },
                          { label: "Production", value: cams.productionCompleted ? "✓" : "Pending" },
                          { label: "Core electives", value: `${cams.coreMatches}/${cams.coreRequired}` },
                          { label: "300-level CAMS", value: `${cams.level300Matches}/${cams.level300Required}` },
                          { label: "Additional CAMS", value: `${cams.additionalCamsMatches}/${cams.additionalCamsRequired}` },
                        ];
                        return (
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            {cards.map(card => (
                              <div key={card.label} className="rounded border px-3 py-2 h-full text-center">
                                <div className="text-[0.55rem] uppercase text-slate-500">{card.label}</div>
                                <div className="text-base font-semibold text-slate-900">{card.value}</div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {program.type !== "None" && program.value && summary && summary.isEnvironmentalStudies && summary.esProgress && (
                    <div className="mt-3 space-y-2 text-[0.65rem]">
                      {renderProgramRing()}
                      {(() => {
                        const es = summary.esProgress;
                        const humanitiesAssigned = countAssignedRequirement(programCourses, program.id, "es-humanities");
                        const cards = [
                          { label: "Core", value: `${es.coreStatus.filter(step => step.completed).length}/${es.coreStatus.length}` },
                          { label: "Science courses", value: `${es.scienceCount}/2` },
                          { label: "Lab science", value: es.scienceLabSatisfied ? "✓" : "Pending" },
                          { label: "Elective units", value: `${es.electiveUnits.toFixed(2)}/${es.electiveUnitTarget}` },
                          { label: "Full-unit electives", value: `${es.nonIndependentFullCount}/${es.minFullCourses}` },
                          { label: "300-level elective", value: `${es.level300Count}/${es.level300Required}` },
                          { label: "Capstone", value: es.capstoneCompleted ? (es.capstoneCourse || "✓") : "Pending" },
                          { label: "ES Humanities", value: `${humanitiesAssigned}/1` },
                        ];
                        return (
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            {cards.map(card => (
                              <div key={card.label} className="rounded border px-3 py-2 h-full text-center">
                                <div className="text-[0.55rem] uppercase text-slate-500">{card.label}</div>
                                <div className="text-base font-semibold text-slate-900">{card.value}</div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {program.type !== "None" && program.value && summary && summary.isClassics && summary.classicsProgress && (
                    <div className="mt-3 space-y-2 text-[0.65rem]">
                      {renderProgramRing()}
                      {(() => {
                        const classics = summary.classicsProgress;
                        const cards = [
                          { label: "Greek", value: classics.greekCount },
                          { label: "Latin", value: classics.latinCount },
                          { label: "Language total", value: `${classics.languageTotal}/${classics.languageTotalRequired}` },
                          { label: "300-level language", value: `${classics.lang300Count}/${classics.languageMinUpper}` },
                          { label: "Civ courses", value: `${classics.civCount}/${classics.civRequired}` },
                          { label: "CLCV focus", value: `${classics.civClcvCount}/${classics.civClcvRequired}` },
                        ];
                        return (
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {cards.map(card => (
                              <div key={card.label} className="rounded border px-3 py-2 h-full text-center">
                                <div className="text-[0.55rem] uppercase text-slate-500">{card.label}</div>
                                <div className="text-base font-semibold text-slate-900">{card.value}</div>
                              </div>
                            ))}
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

                  {program.type !== "None" && program.value && summary && !summary.isSpecial && !summary.isCS && !summary.isBio && !summary.isAnthro && !summary.isEnglish && !summary.isAfr && !summary.isAmst && !summary.isArchitecture && !summary.isStudioArt && !summary.isArtHistory && !summary.isBiochemistry && !summary.isChemicalPhysics && !summary.isChemistry && !summary.isCams && !summary.isClassics && !summary.isClsc && !summary.isComparativeLit && !summary.isDataScience && !summary.isEastAsianStudies && !summary.isEducationStudies && !summary.isEnvironmentalStudies && (
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

  const renderRequirements = () => {
    const assignments = progress.assignmentMap || {};
    const uniqueCourses = (list = []) => {
      const seen = new Set();
      return list.filter(course => {
        const key = `${course.term}|${course.code}|${course.title}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };
    const getRequirementCourses = (reqId) => {
      switch (reqId) {
        case "GROUP1_TOTAL":
          return uniqueCourses([
            ...(assignments.LL || []),
            ...(assignments.ARTS || []),
          ]);
        case "GROUP2_TOTAL":
          return uniqueCourses([
            ...(assignments.SBA || []),
            ...(assignments.EC || []),
            ...(assignments.REP || []),
            ...(assignments.HST || []),
          ]);
        case "GROUP3_TOTAL":
          return uniqueCourses([
            ...(assignments.NPS || []),
            ...(assignments.MM || []),
          ]);
        default:
          return uniqueCourses(assignments[reqId] || []);
      }
    };

    const renderRequirementCard = (req, extraNote) => {
      const assignedCourses = req.id === "UNITS" ? [] : getRequirementCourses(req.id);
      return (
        <div key={req.id} className="rounded-xl border px-3 py-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[0.75rem] font-medium text-slate-800">
              {req.label}
              {req.id === "LANG" && languageWaived && (
                <span className="ml-1 text-green-600">(Waived)</span>
              )}
              {req.id === "PE" && (
                <span className="ml-2 text-[0.6rem] text-slate-500">
                  (*One PE class = 4 units)
                </span>
              )}
            </span>
            <span className="text-[0.7rem] text-slate-500">
              {req.have}/{req.targetCount}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={cx(
                "h-full rounded-full",
                req.id === "LANG" && languageWaived ? "bg-green-600" : "bg-indigo-600"
              )}
              style={{ width: `${req.pct * 100}%` }}
            />
          </div>
          {extraNote && (
            <div className="mt-1 text-[0.65rem] text-slate-500">{extraNote}</div>
          )}
          {assignedCourses.length > 0 && (
            <ul className="mt-2 text-[0.65rem] text-slate-500">
              {assignedCourses.map((course, idx) => (
                <li key={idx}>
                  {course.code || course.title || "Course"} ({course.term})
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    };

    return (
      <div className="mt-4 space-y-4">
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
            {progress.detail
              .filter(r => generalRequirements.some(gr => gr.id === r.id))
              .map(r => renderRequirementCard(r))}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 text-xs">
          <div className="mb-3 text-sm font-semibold text-slate-900">
            Distribution Requirements (3-3-3)
          </div>
          <div className="grid gap-3 md:grid-cols-1 lg:grid-cols-3">
            {progress.detail
              .filter(r => distributionRequirements.some(dr => dr.id === r.id))
              .map(r => {
                const note =
                  r.id === "GROUP1_TOTAL"
                    ? "(≥1 Language/Lit + ≥1 Arts, 3 total)"
                    : r.id === "GROUP2_TOTAL"
                      ? "(1 SBA + 2 from EC/REP/HST)"
                      : r.id === "GROUP3_TOTAL"
                        ? "(1 Science + 1 Math + 1 more, ≥1 lab)"
                        : "";
                return renderRequirementCard(r, note);
              })}
          </div>
        </div>
      </div>
    );
  };

  const renderCourses = () => {
    const plannedRows = [];
    const inProgressRows = [];
    const completedRows = [];
    const creditGrades = new Set(["CR", "P", "MCR", "MCRD", "MNCR"]);
    terms.forEach(term => {
      const termStatus = termStatuses[term.id] || "unspecified";
      (term.slots || []).forEach(slot => {
        if (!(slot.code || slot.title)) return;
        const row = { term: term.label, ...slot };
        const grade = (slot.grade || "").toUpperCase();
        const isLetter = LETTER_GRADE_OPTIONS.includes(grade);
        const isCompleted = isLetter || grade === "D" || grade === "E" || creditGrades.has(grade);
        const isInProgressGrade = grade === "IP" || grade === "IN PROGRESS";

        if (isCompleted) {
          completedRows.push(row);
          return;
        }

        if (grade === "" && termStatus === "current") {
          inProgressRows.push(row);
          return;
        }

        if (grade === "" && termStatus === "past") {
          completedRows.push(row);
          return;
        }

        if (isInProgressGrade) {
          inProgressRows.push(row);
          return;
        }

        plannedRows.push(row);
      });
    });

    const renderCourseTable = (rows, title) => (
      <div className="rounded-2xl border bg-white p-4 text-xs">
        <div className="mb-3 text-sm font-semibold text-slate-900">{title}</div>
        {rows.length === 0 ? (
          <div className="text-[0.75rem] text-slate-500">No courses to show.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-[0.75rem]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="border-b px-2 py-1 text-left">Term</th>
                  <th className="border-b px-2 py-1 text-left">Code</th>
                  <th className="border-b px-2 py-1 text-left">Title</th>
                  <th className="border-b px-2 py-1 text-left">Units</th>
                  <th className="border-b px-2 py-1 text-left">Grade</th>
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
                    <td className="border-b px-2 py-1">{r.grade || "—"}</td>
                    <td className="border-b px-2 py-1">{r.tags.join(", ")}</td>
                    <td className="border-b px-2 py-1">{r.depts.join(" / ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );

    return (
      <div className="mt-4 space-y-4">
        {renderCourseTable(inProgressRows, "In-progress courses")}
        {renderCourseTable(plannedRows, "Planned courses")}
        {renderCourseTable(completedRows, "Completed courses")}
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
  const progressLabel = matchingProgram ? "Units Toward Major" : "Units";
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
          <MajorSelect value={majorValue} onChange={setMajorValue} options={majorOptions} />
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

  if (normalizedKey === "Custom Major") {
    const activeRequirements = getCustomMajorRequirementsForValue(majorValue);
    content = (
      <CustomMajorManager
        displayLabel={selectedLabel || "Custom Major"}
        majorValue={majorValue}
        onMajorChange={setMajorValue}
        customMajorRequirements={activeRequirements}
        onRequirementChange={(idx, value) => updateCustomMajorRequirement(majorValue, idx, value)}
        onAddRequirement={() => addCustomMajorRequirementRow(majorValue)}
        customMajors={customMajors}
        newCustomMajorName={newCustomMajorName}
        onCustomMajorNameChange={setNewCustomMajorName}
        onAddCustomMajor={() => addCustomMajor(setMajorValue)}
        editingCustomMajorId={editingCustomMajorId}
        editingCustomMajorName={editingCustomMajorName}
        onEditingCustomMajorNameChange={setEditingCustomMajorName}
        onStartEditing={startEditingCustomMajor}
        onCancelEditing={cancelEditingCustomMajor}
        onSaveEditing={saveEditingCustomMajor}
        onRemoveCustomMajor={removeCustomMajor}
        maxRequirements={MAX_CUSTOM_MAJOR_REQUIREMENTS}
      />
    );
  } else {
    const MajorRenderer = getMajorRenderer(majorValue);
    content = (
      <MajorRenderer
        majorReq={majorReq}
        courses={relevantCourses}
        majorValue={majorValue}
      />
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
            <MinorSelect value={selectedMinor} onChange={setSelectedMinor} options={minorOptions} />
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
    const activeMinorRequirements = getCustomMinorRequirementsForValue(selectedMinor);
    return (
      <CustomMinorManager
        displayLabel={selectedMinorLabel || "Custom Minor"}
        minorValue={selectedMinor}
        onMinorChange={setSelectedMinor}
        minorOptions={minorOptions}
        customMinorRequirements={activeMinorRequirements}
        onRequirementChange={(idx, value) => updateCustomMinorRequirement(selectedMinor, idx, value)}
        onAddRequirement={() => addCustomMinorRequirementRow(selectedMinor)}
        customMinors={customMinors}
        newCustomMinorName={newCustomMinorName}
        onCustomMinorNameChange={setNewCustomMinorName}
        onAddCustomMinor={() => addCustomMinor(setSelectedMinor)}
        editingCustomMinorId={editingCustomMinorId}
        editingCustomMinorName={editingCustomMinorName}
        onEditingCustomMinorNameChange={setEditingCustomMinorName}
        onStartEditing={startEditingCustomMinor}
        onCancelEditing={cancelEditingCustomMinor}
        onSaveEditing={saveEditingCustomMinor}
        onRemoveCustomMinor={removeCustomMinor}
        maxRequirements={MAX_CUSTOM_MINOR_REQUIREMENTS}
      />
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="text-sm font-semibold text-slate-900">{selectedMinorLabel || "Minor Planner"}</div>
        <div className="flex items-center gap-3">
          <MinorSelect value={selectedMinor} onChange={setSelectedMinor} options={minorOptions} />
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
