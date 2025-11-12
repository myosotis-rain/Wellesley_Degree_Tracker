import { useEffect, useMemo, useRef, useState } from "react";
import {
  distributionRequirements,
  generalRequirements,
  internalRequirements,
  majorRequirements,
  seedRequirements,
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
  { id: "major", label: "Major" },
];

const PROGRAM_TYPE_OPTIONS = ["Major", "Second Major", "Minor", "None"];

const DEFAULT_PROGRAM_SELECTIONS = [
  { id: "programA", label: "Program 1", type: "None", value: "", experienceComplete: false },
  { id: "programB", label: "Program 2", type: "None", value: "", experienceComplete: false },
];

const ensureProgramSelections = (saved) => {
  if (!Array.isArray(saved)) return DEFAULT_PROGRAM_SELECTIONS;
  return DEFAULT_PROGRAM_SELECTIONS.map(template => {
    const match = saved.find(item => item.id === template.id);
    return match ? { ...template, ...match } : template;
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
  const config = majorRequirements[programName];
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

  const requiredCourses = config.requiredCourses || [];
  const requiredCompleted = requiredCourses.filter(req =>
    courses.some(course => course.code === req)
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
    courses.some(course => course.code === req)
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
    { id: "mas-intro", label: "Intro Courses (3)" },
    { id: "mas-studio", label: "Studio Core (3)" },
    { id: "mas-cs", label: "CS Core (3)" },
    { id: "mas-electives", label: "MAS Electives (3)" },
    { id: "mas-capstone", label: "Capstone Course" },
    { id: "mas-portfolio", label: "Portfolio / Senior Deliverable" },
  ],
  "Computer Science": [
    { id: "cs-intro", label: "Intro (CS 111/112)" },
    { id: "cs-core-230", label: "CS 230 Series" },
    { id: "cs-core-231", label: "CS 231" },
    { id: "cs-core-235", label: "CS 235" },
    { id: "cs-core-240", label: "CS 240" },
    { id: "cs-300", label: "300-level CS" },
    { id: "cs-elective", label: "CS Elective (200+)" },
    { id: "cs-math", label: "Supporting Math (MATH 225)" },
  ],
  "Biological Sciences": [
    { id: "bio-intro-cell", label: "Intro: Cell & Molecular" },
    { id: "bio-intro-organismal", label: "Intro: Organismal" },
    { id: "bio-group-cell", label: "200-level: Cell Biology" },
    { id: "bio-group-systems", label: "200-level: Systems Biology" },
    { id: "bio-group-community", label: "200-level: Community Biology" },
    { id: "bio-extra-200", label: "Additional 200-level BISC" },
    { id: "bio-300", label: "300-level BISC" },
    { id: "bio-elective", label: "BISC Elective / EXTD 225" },
    { id: "bio-chem-intro", label: "Intro Chemistry" },
    { id: "bio-chem-advanced", label: "Advanced Chemistry" },
  ],
  Anthropology: [
    { id: "anth-101", label: "ANTH 101" },
    { id: "anth-2nd-intro", label: "Second Intro (ANTH 102/103)" },
    { id: "anth-205", label: "ANTH 205" },
    { id: "anth-301", label: "ANTH 301" },
    { id: "anth-extra-300", label: "Additional 300-level" },
    { id: "anth-elective", label: "Anthropology Elective" },
    { id: "anth-experience", label: "Field / Experience" },
  ],
};

const getRequirementOptionsForMajor = (majorName) => {
  if (programRequirementOptionSets[majorName]) return programRequirementOptionSets[majorName];
  const config = majorRequirements[majorName];
  if (!config) return [];
  const options = [];
  (config.requiredCourses || []).forEach(course => {
    options.push({ id: `required-${sanitizeReqKey(course)}`, label: `Required: ${course}` });
  });
  if (config.electiveCourses) {
    options.push({ id: "generic-elective", label: "Major Elective" });
  }
  (config.mathRequirements || []).forEach(course => {
    options.push({ id: `support-${sanitizeReqKey(course)}`, label: `Supporting: ${course}` });
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
    majorReq.coreCourses.studioCore.some(req => course.code === req)
  );
  const csCore = courses.filter(course =>
    majorReq.coreCourses.csCore.some(req => course.code === req)
  );
  const capstone = courses.filter(course =>
    majorReq.capstoneCourses.some(req => course.code === req)
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
  const csCourses = courses.filter(course => normalizeCode(course).startsWith("CS"));
  const excluded = new Set((csStructure.excludedCourses || []).map(code => code.toUpperCase()));

  const used = new Set();
  const markUsed = (course) => used.add(normalizeCode(course));

  const introCompleted = csCourses.some(course => {
    const code = normalizeCode(course);
    if (csStructure.introOptions?.includes(code)) {
      markUsed(course);
      return true;
    }
    return false;
  });

  const coreGroups = (csStructure.coreGroups || []).map(group => {
    const completedCourse = csCourses.find(course => {
      const code = normalizeCode(course);
      return group.options.includes(code) && !used.has(code);
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

// ---- Main App ----
export default function App() {
  const savedDataRef = useRef(loadFromLocalStorage());
  const savedData = savedDataRef.current || null;
  const initialStartYear = savedData?.startYear || 2024;
  const initialProgramSelections = ensureProgramSelections(savedData?.programSelections);
  const primaryProgramValue = initialProgramSelections.find(p => p.id === "programA" && p.type !== "None" && p.value)?.value;

  const [terms, setTerms] = useState(() => savedData?.terms || getDefaultTerms(initialStartYear));
  const [activeTermId, setActiveTermId] = useState(null);
  const [activeTab, setActiveTab] = useState(savedData?.activeTab || "plan");
  const [startYear, setStartYear] = useState(initialStartYear);
  const [programSelections, setProgramSelections] = useState(initialProgramSelections);
  const [selectedMajor, setSelectedMajor] = useState(
    savedData?.selectedMajor || primaryProgramValue || "Computer Science"
  );
  const [yearLabels, setYearLabels] = useState(
    savedData?.yearLabels || Object.fromEntries(defaultYears.map((y) => [y.id, y.label]))
  );
  const [languageWaived, setLanguageWaived] = useState(savedData?.languageWaived || false);

  const termById = (id) => terms.find(t => t.id === id) || null;

  // Auto-save to localStorage whenever data changes
  useEffect(() => {
    const dataToSave = {
      terms,
      activeTab,
      startYear,
      selectedMajor,
      yearLabels,
      languageWaived,
      programSelections,
    };
    saveToLocalStorage(dataToSave);
  }, [terms, activeTab, startYear, selectedMajor, yearLabels, languageWaived, programSelections]);

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

  const addYear = () => {
    const maxYear = Math.max(...terms.map(t => t.year), 0);
    const newYear = maxYear + 1;
    const latestCalendarYear = Math.max(...terms.map(t => t.calendarYear || startYear), startYear);

    const newTerms = [
      {
        id: `Y${newYear}-F`,
        label: `Fall ${latestCalendarYear + newYear - 1}`,
        year: newYear,
        season: "Fall",
        calendarYear: latestCalendarYear + newYear - 1,
        slots: [newSlot(), newSlot(), newSlot(), newSlot()]
      },
      {
        id: `Y${newYear}-S`,
        label: `Spring ${latestCalendarYear + newYear}`,
        year: newYear,
        season: "Spring", 
        calendarYear: latestCalendarYear + newYear,
        slots: [newSlot(), newSlot(), newSlot(), newSlot()]
      }
    ];

    setTerms(prev => [...prev, ...newTerms]);
  };

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
    setTerms(getDefaultTerms(year));
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

  const programOptions = Object.keys(majorRequirements);

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
        if (field === "type" && value === "None") {
          updated.value = "";
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

  const getCoursesForProgram = (programId) => {
    const flagged = allCourses.filter(course => course.programs?.[programId]);
    if (flagged.length > 0) return flagged;
    return allCourses;
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

  const renderPlan = () => (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl border bg-white p-3">
          <label className="text-sm font-medium text-slate-700">Start Year:</label>
          <input
            type="number"
            value={startYear}
            onChange={(e) => updateStartYear(parseInt(e.target.value, 10))}
            className="w-20 rounded border px-2 py-1 text-sm"
            min="2020"
            max="2030"
          />
          <button
            type="button"
            onClick={addYear}
            className="rounded-xl border border-indigo-200 bg-white px-3 py-1 text-sm font-medium text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50"
          >
            Auto-fill Years
          </button>
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
                      className="rounded bg-amber-100 px-2 py-1 text-amber-700 hover:bg-amber-200"
                    >
                      + Fall
                    </button>
                  )}
                  {!spring && (
                    <button
                      onClick={() => addTerm(y.id, 'Spring')}
                      className="rounded bg-emerald-100 px-2 py-1 text-emerald-700 hover:bg-emerald-200"
                    >
                      + Spring
                    </button>
                  )}
                  {!summer && (
                    <button
                      onClick={() => addTerm(y.id, 'Summer')}
                      className="rounded bg-orange-100 px-2 py-1 text-orange-700 hover:bg-orange-200"
                    >
                      + Summer
                    </button>
                  )}
                  {!winter && (
                    <button
                      onClick={() => addTerm(y.id, 'Winter')}
                      className="rounded bg-blue-100 px-2 py-1 text-blue-700 hover:bg-blue-200"
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
                  />
                )}
                {winter && (
                  <TermSummaryCard
                    term={winter}
                    onOpen={() => setActiveTermId(winter.id)}
                    onRemove={() => removeTerm(winter.id)}
                    canRemove={canRemoveTerm(winter.id)}
                    onYearChange={updateTermYear}
                  />
                )}
                {spring && (
                  <TermSummaryCard
                    term={spring}
                    onOpen={() => setActiveTermId(spring.id)}
                    onRemove={() => removeTerm(spring.id)}
                    canRemove={canRemoveTerm(spring.id)}
                    onYearChange={updateTermYear}
                  />
                )}
                {summer && (
                  <TermSummaryCard
                    term={summer}
                    onOpen={() => setActiveTermId(summer.id)}
                    onRemove={() => removeTerm(summer.id)}
                    canRemove={canRemoveTerm(summer.id)}
                    onYearChange={updateTermYear}
                  />
                )}
              </div>
            </div>
          );
        })}
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
          <p className="mb-3 text-[0.65rem] text-slate-500">
            Choose up to two programs to keep their requirements visible while you build your plan.
          </p>
          <div className="space-y-3">
            {programSelections.map(program => {
              const programCourses = program.value ? getCoursesForProgram(program.id) : [];
              const summary = program.value ? summarizeProgramProgress(program.value, programCourses, program) : null;
              return (
                <div key={program.id} className="rounded-xl border px-3 py-3">
                  <div className="flex flex-col gap-2 text-[0.65rem] sm:flex-row sm:items-center">
                    <div className="text-[0.65rem] font-semibold text-slate-600">
                      {program.label}
                    </div>
                    <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                      <select
                        className="w-full rounded-lg border px-2 py-1 sm:w-auto"
                        value={program.type}
                        onChange={(e) => updateProgramSelection(program.id, "type", e.target.value)}
                      >
                        {PROGRAM_TYPE_OPTIONS.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      <select
                        className="w-full rounded-lg border px-2 py-1 sm:flex-1"
                        value={program.value}
                        onChange={(e) => updateProgramSelection(program.id, "value", e.target.value)}
                        disabled={program.type === "None"}
                      >
                        <option value="">Select program</option>
                        {programOptions.map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {program.type !== "None" && !program.value && (
                    <div className="mt-3 text-[0.65rem] text-slate-500">
                      Pick a program to see its requirement checklist here.
                    </div>
                  )}

                  {program.type !== "None" && program.value && summary && summary.isSpecial && summary.masProgress && (
                    <div className="mt-3 space-y-2 text-[0.65rem]">
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
                      <div className="space-y-2">
                        <div className="rounded-lg bg-indigo-50 px-3 py-2 text-indigo-900">
                          <div className="flex items-center justify-between">
                            <span className="text-[0.6rem] uppercase">Capstone Ready</span>
                            <span className="text-sm font-semibold">
                              {countAssignedRequirement(programCourses, program.id, "mas-capstone") > 0 ||
                              summary.masProgress.capstone.length > 0
                                ? "✓ Completed"
                                : "Not yet"}
                            </span>
                          </div>
                          <p className="mt-1 text-[0.6rem]">
                            Media Arts and Sciences combines studio, CS, and media culture. Use the Major tab for the full checklist.
                          </p>
                        </div>
                        <div className="rounded-lg border border-indigo-100 bg-white px-3 py-2">
                          <div className="flex items-center justify-between text-[0.6rem] text-slate-500">
                            <span>Total units</span>
                            <span className="text-sm font-semibold text-slate-900">
                              {summary.masProgress.totals.totalUnits.toFixed(1)}/12
                            </span>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[0.6rem] text-slate-500">
                            <span>Courses above 100</span>
                            <span className="text-sm font-semibold text-slate-900">
                              {summary.masProgress.totals.upperLevelCourses}/8+
                            </span>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[0.6rem] text-slate-500">
                            <span>300-level courses</span>
                            <span className="text-sm font-semibold text-slate-900">
                              {summary.masProgress.totals.level300Count}/2+
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {program.type !== "None" && program.value && summary && summary.isCS && summary.csProgress && (
                    <div className="mt-3 space-y-2 text-[0.65rem]">
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
                        <div className="rounded border px-3 py-2 text-center">
                          <div className="text-[0.55rem] uppercase text-slate-500">300-level BISC</div>
                          <div className="text-base font-semibold text-slate-900">
                            {countAssignedRequirement(programCourses, program.id, "bio-300") || summary.bioProgress.level300}/{summary.bioProgress.level300Required}
                          </div>
                        </div>
                        <div className="rounded border px-3 py-2 text-center">
                          <div className="text-[0.55rem] uppercase text-slate-500">BISC Elective</div>
                          <div className="text-base font-semibold text-slate-900">
                            {countAssignedRequirement(programCourses, program.id, "bio-elective") || summary.bioProgress.electiveCompleted}/{summary.bioProgress.electiveRequired}
                          </div>
                        </div>
                        <div className="rounded border px-3 py-2 text-center">
                          <div className="text-[0.55rem] uppercase text-slate-500">Chemistry Courses</div>
                          <div className="text-sm font-semibold text-slate-900">
                            {(countAssignedRequirement(programCourses, program.id, "bio-chem-intro") > 0 || summary.bioProgress.chemIntroCompleted ? "Intro ✓" : "Intro")} / {(countAssignedRequirement(programCourses, program.id, "bio-chem-advanced") > 0 || summary.bioProgress.chemAdvancedCompleted ? "Adv ✓" : "Adv")}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {program.type !== "None" && program.value && summary && summary.isAnthro && summary.anthroProgress && (
                    <div className="mt-3 space-y-2 text-[0.65rem]">
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

                  {program.type !== "None" && program.value && summary && !summary.isSpecial && !summary.isCS && !summary.isBio && !summary.isAnthro && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
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
                        return (
                          <>
                            <div className="rounded-lg bg-slate-50 px-3 py-2">
                              <div className="text-[0.55rem] uppercase text-slate-500">Required</div>
                              <div className="text-base font-semibold text-slate-900">
                                {displayRequired}/{summary.requiredTotal}
                              </div>
                            </div>
                            {summary.electiveTotal > 0 && (
                              <div className="rounded-lg bg-slate-50 px-3 py-2">
                                <div className="text-[0.55rem] uppercase text-slate-500">Electives</div>
                                <div className="text-base font-semibold text-slate-900">
                                  {Math.min(displayElective, summary.electiveTotal)}/{summary.electiveTotal}
                                </div>
                              </div>
                            )}
                            {summary.mathTotal > 0 && (
                              <div className="rounded-lg bg-slate-50 px-3 py-2">
                                <div className="text-[0.55rem] uppercase text-slate-500">Supporting Math</div>
                                <div className="text-base font-semibold text-slate-900">
                                  {Math.min(displayMath, summary.mathTotal)}/{summary.mathTotal}
                                </div>
                              </div>
                            )}
                            {summary.electiveTotal === 0 && summary.mathTotal === 0 && (
                              <div className="rounded-lg bg-slate-50 px-3 py-2">
                                <div className="text-[0.55rem] uppercase text-slate-500">Progress</div>
                                <div className="text-base font-semibold text-slate-900">
                                  {displayRequired}/{summary.requiredTotal || 1}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-3 text-[0.75rem]">
          <div className="mb-2 text-sm font-semibold text-slate-900">
            Distribution Groups (3-3-3)
          </div>
          <MiniReqBar
            label="Group 1: Humanities & Arts"
            have={getReq("GROUP1_TOTAL").have}
            target={3}
          />
          <div className="text-[0.6rem] text-slate-500 ml-2 mb-2">
            (≥1 Language/Lit + ≥1 Arts, 3 total)
          </div>
          <MiniReqBar
            label="Group 2: Social Sciences"
            have={getReq("GROUP2_TOTAL").have}
            target={3}
          />
          <div className="text-[0.6rem] text-slate-500 ml-2 mb-2">
            (1 SBA + 2 from EC/REP/HST)
          </div>
          <MiniReqBar
            label="Group 3: Science & Math"
            have={getReq("GROUP3_TOTAL").have}
            target={3}
          />
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
  );

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

const renderMASMajor = (majorReq, allCourses) => {
  const {
    visualAnalysis,
    studioFoundation,
    csIntro,
    studioCore,
    csCore,
    capstone,
    additional,
    totals,
  } = computeMASProgress(allCourses, majorReq);

    return (
      <div className="mt-4 space-y-4">
        <div className="rounded-2xl border bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">Media Arts and Sciences Major</div>
            <select
              value={selectedMajor}
              onChange={(e) => setSelectedMajor(e.target.value)}
              className="rounded border px-3 py-1 text-sm"
            >
              {Object.keys(majorRequirements).map(major => (
                <option key={major} value={major}>{major}</option>
              ))}
            </select>
          </div>

          <div className="mb-4 text-xs text-slate-600">
            {majorReq.description}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Introductory Requirements */}
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

            {/* Core Courses */}
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

            {/* Capstone & Other Requirements */}
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
      </div>
    );
};

const renderCSMajor = (majorReq, allCourses) => {
  const progress = computeCSProgress(allCourses, majorReq.csStructure);
  const totalCore = progress.coreGroups.length;
  const completedCore = progress.coreGroups.filter(group => group.completed).length;
  const introLabel = majorReq.csStructure.introOptions?.join(", ") || "Intro courses";
  const mathCourse = progress.mathRequirements[0] || "MATH 225";

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-2xl border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900">Computer Science Major</div>
          <select
            value={selectedMajor}
            onChange={(e) => setSelectedMajor(e.target.value)}
            className="rounded border px-3 py-1 text-sm"
          >
            {Object.keys(majorRequirements).map(major => (
              <option key={major} value={major}>{major}</option>
            ))}
          </select>
        </div>

        <div className="mb-4 text-xs text-slate-600">{majorReq.description}</div>

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
    </div>
  );
};

const renderBioMajor = (majorReq, allCourses) => {
  const progress = computeBioProgress(allCourses, majorReq.bioStructure);
  const groupCompletion = [progress.groupCell, progress.groupSystems, progress.groupCommunity].filter(Boolean).length;

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-2xl border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900">Biological Sciences Major</div>
          <select
            value={selectedMajor}
            onChange={(e) => setSelectedMajor(e.target.value)}
            className="rounded border px-3 py-1 text-sm"
          >
            {Object.keys(majorRequirements).map(major => (
              <option key={major} value={major}>{major}</option>
            ))}
          </select>
        </div>

        <div className="mb-4 text-xs text-slate-600">{majorReq.description}</div>

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
    </div>
  );
};

const renderAnthroMajor = (majorReq, allCourses) => {
  const progress = computeAnthroProgress(allCourses, majorReq.anthroStructure, false);

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-2xl border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900">Anthropology Major</div>
          <select
            value={selectedMajor}
            onChange={(e) => setSelectedMajor(e.target.value)}
            className="rounded border px-3 py-1 text-sm"
          >
            {Object.keys(majorRequirements).map(major => (
              <option key={major} value={major}>{major}</option>
            ))}
          </select>
        </div>

        <div className="mb-4 text-xs text-slate-600">{majorReq.description}</div>

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
    </div>
  );
};

  const renderMajor = () => {
    const majorReq = majorRequirements[selectedMajor];
    if (!majorReq) return null;

    if (selectedMajor === "Media Arts and Sciences") {
      return renderMASMajor(majorReq, allCourses);
    }
    if (selectedMajor === "Computer Science" && majorReq.csStructure) {
      return renderCSMajor(majorReq, allCourses);
    }
    if (selectedMajor === "Biological Sciences" && majorReq.bioStructure) {
      return renderBioMajor(majorReq, allCourses);
    }
    if (selectedMajor === "Anthropology" && majorReq.anthroStructure) {
      return renderAnthroMajor(majorReq, allCourses);
    }

    const completedRequired = majorReq.requiredCourses ? majorReq.requiredCourses.filter(req => 
      allCourses.some(course => course.code === req)
    ) : [];

    const majorElectives = allCourses.filter(course => {
      const dept = detectDepartmentFromCode(course.code);
      const majorDept = selectedMajor === "Computer Science" ? "Computer Science" : 
                       selectedMajor === "Mathematics" ? "Mathematics" :
                       selectedMajor === "Economics" ? "Economics" : null;
      return dept === majorDept && !majorReq.requiredCourses?.includes(course.code) && course.level >= 200;
    });

    const completedMath = majorReq.mathRequirements ? 
      majorReq.mathRequirements.filter(req => 
        allCourses.some(course => course.code === req)
      ) : [];

    return (
      <div className="mt-4 space-y-4">
        <div className="rounded-2xl border bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">Major Requirements</div>
            <select
              value={selectedMajor}
              onChange={(e) => setSelectedMajor(e.target.value)}
              className="rounded border px-3 py-1 text-sm"
            >
              {Object.keys(majorRequirements).map(major => (
                <option key={major} value={major}>{major}</option>
              ))}
            </select>
          </div>

          <div className="mb-4 text-xs text-slate-600">
            {majorReq.description}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
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
