import { detectDepartmentFromCode, normalizeCourseCode, codesMatch } from "../utils.js";

export const computeMASProgress = (courses, majorReq) => {
  const normalizeCode = (course) => normalizeCourseCode(course.code);

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

export const computeCSProgress = (courses, csStructure) => {
  const normalizeCode = (course) => normalizeCourseCode(course.code);
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

export const computeBioProgress = (courses, bioStructure) => {
  const normalizeCode = (course) => normalizeCourseCode(course.code);
  const isBISC = (course) => normalizeCode(course).startsWith("BISC");

  const introCourses = courses.filter(isBISC).slice(0, 2);
  const cellCourse = courses.find(course =>
    bioStructure.cellGroup.some(code => codesMatch(course.code, code))
  );
  const systemsCourse = courses.find(course =>
    bioStructure.systemsGroup.some(code => codesMatch(course.code, code))
  );
  const communityCourse = courses.find(course =>
    bioStructure.communityGroup.some(code => codesMatch(course.code, code))
  );

  const midCourses = courses.filter(course =>
    bioStructure.midLevelCourses.some(code => codesMatch(course.code, code))
  );
  const labCourses = courses.filter(course =>
    bioStructure.labCourses.some(code => codesMatch(course.code, code))
  );
  const capstone = courses.filter(course =>
    bioStructure.capstoneCourses.some(code => codesMatch(course.code, code))
  );

  return {
    introCompleted: introCourses.length,
    groupCell: Boolean(cellCourse),
    groupSystems: Boolean(systemsCourse),
    groupCommunity: Boolean(communityCourse),
    midLevelCount: midCourses.length,
    labCount: labCourses.length,
    capstoneCount: capstone.length,
  };
};

export const computeMathProgress = (courses = [], mathStructure = {}) => {
  const normalizeCode = (course) => normalizeCourseCode(course.code);
  const hasCourse = (code = "") => courses.some(course => codesMatch(course.code, code));

  const calculusSequence =
    (mathStructure.calculusSequence && mathStructure.calculusSequence.length > 0)
      ? mathStructure.calculusSequence
      : ["MATH 115", "MATH 116"];
  const calculusStatus = calculusSequence.map(code => ({
    code,
    completed: hasCourse(code),
  }));

  const coreCourses = mathStructure.coreCourses || [];
  const coreStatus = coreCourses.map(code => ({
    code,
    completed: hasCourse(code),
  }));

  const seminarCourses = mathStructure.seminarCourses || [];
  const seminarStatus = seminarCourses.map(code => ({
    code,
    completed: hasCourse(code),
  }));

  const level300Courses = courses.filter(
    course => normalizeCode(course).startsWith("MATH") && (course.level || 0) >= 300
  );

  const allowedDepartments = mathStructure.allowedDepartments || ["Mathematics"];
  const excluded = new Set((mathStructure.excludedCourses || []).map(item => normalizeCourseCode(item)));
  const advancedCourses = courses.filter(course => {
    const dept = detectDepartmentFromCode(course.code);
    if (!dept || !allowedDepartments.includes(dept)) return false;
    if ((course.level || 0) < 200) return false;
    const code = normalizeCode(course);
    if (excluded.has(code)) return false;
    return true;
  }).length;

  return {
    calculusStatus,
    coreStatus,
    seminarStatus,
    level300Count: level300Courses.length,
    additional300Required: mathStructure.additional300Required || 2,
    advancedCourses,
    advancedTotalRequired: mathStructure.advancedTotalRequired || 8,
  };
};

export const computeEconProgress = (courses = [], econStructure = {}) => {
  const normalizeCode = (course) => normalizeCourseCode(course.code);
  const hasCourse = (code = "") => courses.some(course => codesMatch(course.code, code));
  const findCourseMatch = (codes = []) =>
    courses.find(course => codes.some(code => codesMatch(course.code, code)));

  const stepStatus = (id, label, options = [], meta = {}) => {
    if (!options.length) return null;
    const match = findCourseMatch(options);
    return {
      id,
      label,
      options,
      completed: Boolean(match),
      fulfilledBy: match?.code || null,
      matchedCourse: match || null,
      display: options.join(" / "),
      ...meta,
    };
  };

  const sequences = [];

  const microSteps = [
    stepStatus("micro-intro", "Introductory", econStructure.microIntro || []),
    stepStatus("micro-intermediate", "Intermediate", econStructure.microIntermediate || []),
  ].filter(Boolean);
  if (microSteps.length) {
    sequences.push({ id: "micro-sequence", title: "Microeconomics", steps: microSteps });
  }

  const macroSteps = [
    stepStatus("macro-intro", "Introductory", econStructure.macroIntro || []),
    stepStatus("macro-intermediate", "Intermediate", econStructure.macroIntermediate || []),
  ].filter(Boolean);
  if (macroSteps.length) {
    sequences.push({ id: "macro-sequence", title: "Macroeconomics", steps: macroSteps });
  }

  const statsIntroOptions = [
    ...(econStructure.statsSequence ? [econStructure.statsSequence[0]] : []),
    ...(econStructure.altStatsCredit || []),
  ].filter(Boolean);
  const econometricsOptions = (econStructure.statsSequence || []).slice(1);

  const statsSteps = [
    stepStatus(
      "stats-sequence",
      "Statistics foundation",
      statsIntroOptions,
      {
        altOptions: econStructure.altStatsCredit || [],
        altFulfilledBy: findCourseMatch(econStructure.altStatsCredit || [])?.code || null,
      }
    ),
    stepStatus(
      "econometrics",
      "Econometrics",
      econometricsOptions.length ? econometricsOptions : ["ECON 203"]
    ),
  ].filter(Boolean);
  if (statsSteps.length) {
    sequences.push({ id: "stats-sequence", title: "Data & Econometrics", steps: statsSteps });
  }

  const level300Econ = courses.filter(
    course => normalizeCode(course).startsWith("ECON") && (course.level || 0) >= 300
  );

  const usedCodes = new Set();
  const markUsed = (entry) => {
    if (!entry) return;
    if (typeof entry === "string") {
      const normalized = normalizeCourseCode(entry);
      if (normalized) usedCodes.add(normalized);
      return;
    }
    if (entry.code) {
      const normalized = normalizeCode(entry);
      if (normalized) usedCodes.add(normalized);
    }
  };

  sequences.forEach(sequence => {
    (sequence.steps || []).forEach(step => {
      if (step?.matchedCourse) {
        markUsed(step.matchedCourse);
      }
      if (step?.fulfilledBy) {
        markUsed(step.fulfilledBy);
      }
      if (step?.altFulfilledBy) {
        markUsed(step.altFulfilledBy);
      }
    });
  });

  const electiveSubSet = new Set(
    (econStructure.electiveSubstitutions || []).map(code => normalizeCourseCode(code))
  );
  const econEligibleCourses = courses.filter(course => {
    const code = normalizeCode(course);
    if (!code) return false;
    if (code.startsWith("ECON")) return true;
    return electiveSubSet.has(code);
  });
  const econCourseCount = econEligibleCourses.length;
  const electivePool = econEligibleCourses.filter(course => !usedCodes.has(normalizeCode(course)));
  const electiveRequired =
    econStructure.electiveRequired ||
    econStructure.electiveCoursesRequired ||
    econStructure.electiveCourses ||
    3;
  const electiveCount = Math.max(0, electivePool.length);

  const mathPrereqCompleted = econStructure.mathPrereq ? hasCourse(econStructure.mathPrereq) : false;

  return {
    sequences,
    econometrics: statsSteps.find(step => step?.id === "econometrics")?.completed || false,
    level300Count: level300Econ.length,
    level300Required: econStructure.level300Required || 2,
    econCourseCount,
    electiveCount,
    electiveRequired,
    mathPrereqCompleted,
    mathPrereqLabel: econStructure.mathPrereq || "",
  };
};

export const computeAnthroProgress = (courses, structure, experienceComplete = false) => {
  const normalizeCode = (course) => normalizeCourseCode(course.code);
  const matches = (course, list = []) => list.some(code => codesMatch(course.code, code));

  const introPrimary = courses.some(course => matches(course, ["ANTH 101"]));
  const introSecondary = courses.some(course => matches(course, ["ANTH 102", "ANTH 103", "ANTH/CLCV 103"]));
  const midCourse = courses.some(course => matches(course, ["ANTH 205"]));
  const seminar = courses.some(course => matches(course, ["ANTH 301"]));

  const extra300 = courses.filter(course => normalizeCode(course).startsWith("ANTH") && (course.level || 0) >= 300 && !matches(course, ["ANTH 301"]));
  const electives = courses.filter(course => normalizeCode(course).startsWith("ANTH"));

  return {
    introPrimary,
    introSecondary,
    midCourse,
    seminar,
    extra300Count: extra300.length,
    extra300Required: structure.extra300Required || 1,
    electivesCompleted: electives.length,
    electivesRequired: structure.electivesRequired || 9,
    experienceComplete,
  };
};

export const computeEnglishProgress = (courses, structure) => {
  const normalizeCode = (course) => normalizeCourseCode(course.code);
  const englishCourses = courses.filter(course => normalizeCode(course).startsWith("ENG"));
  const upperLevel = englishCourses.filter(course => (course.level || 0) >= 200);
  const level300 = englishCourses.filter(course => (course.level || 0) >= 300);

  return {
    totalCourses: courses.length,
    englishDeptCourses: englishCourses.length,
    upperLevelCourses: upperLevel.length,
    level300Courses: level300.length,
  };
};

export const computeAfrProgress = (courses, structure = {}) => {
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

export const computeAmstProgress = (courses, structure = {}) => {
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
