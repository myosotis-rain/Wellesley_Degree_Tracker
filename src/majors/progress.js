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
  if (!bioStructure || typeof bioStructure !== "object") {
    return {
      introCompleted: 0,
      groupCell: false,
      groupSystems: false,
      groupCommunity: false,
      midLevelCount: 0,
      labCount: 0,
      capstoneCount: 0,
      additional200: 0,
      additional200Required: 0,
      level300: 0,
      level300Required: 0,
      electiveCompleted: 0,
      electiveRequired: 0,
      chemIntroCompleted: false,
      chemAdvancedCompleted: false,
    };
  }
  const normalizeCode = (course) => normalizeCourseCode(course.code);
  const isBISC = (course) => normalizeCode(course).startsWith("BISC");

  const cellGroup = Array.isArray(bioStructure.cellGroup) ? bioStructure.cellGroup : [];
  const systemsGroup = Array.isArray(bioStructure.systemsGroup) ? bioStructure.systemsGroup : [];
  const communityGroup = Array.isArray(bioStructure.communityGroup) ? bioStructure.communityGroup : [];
  const introCellOptions = Array.isArray(bioStructure.introCell) ? bioStructure.introCell : [];
  const introOrganismalOptions = Array.isArray(bioStructure.introOrganismal) ? bioStructure.introOrganismal : [];
  const midLevelCoursesCfg = Array.isArray(bioStructure.midLevelCourses) ? bioStructure.midLevelCourses : [];
  const labCoursesCfg = Array.isArray(bioStructure.labCourses) ? bioStructure.labCourses : [];
  const capstoneCoursesCfg = Array.isArray(bioStructure.capstoneCourses) ? bioStructure.capstoneCourses : [];
  const additional200Options = Array.isArray(bioStructure.additional200Options) ? bioStructure.additional200Options : [];
  const electiveAdditionalOptions = Array.isArray(bioStructure.electiveAdditionalOptions) ? bioStructure.electiveAdditionalOptions : [];
  const chemIntroOptions = Array.isArray(bioStructure.chemIntroOptions) ? bioStructure.chemIntroOptions : [];
  const chemAdvancedOptions = Array.isArray(bioStructure.chemAdvancedOptions) ? bioStructure.chemAdvancedOptions : [];
  const chemAdvancedPrefix = bioStructure.chemAdvancedPrefix || "";

  const introCourses = courses.filter(isBISC).slice(0, 2);
  const cellCourse = courses.find(course =>
    cellGroup.some(code => codesMatch(course.code, code))
  );
  const systemsCourse = courses.find(course =>
    systemsGroup.some(code => codesMatch(course.code, code))
  );
  const communityCourse = courses.find(course =>
    communityGroup.some(code => codesMatch(course.code, code))
  );

  const midCourses = courses.filter(course =>
    midLevelCoursesCfg.some(code => codesMatch(course.code, code))
  );
  const labCourses = courses.filter(course =>
    labCoursesCfg.some(code => codesMatch(course.code, code))
  );
  const capstone = courses.filter(course =>
    capstoneCoursesCfg.some(code => codesMatch(course.code, code))
  );
  const additional200 = courses.filter(course =>
    additional200Options.some(code => codesMatch(course.code, code))
  );
  const electiveAddl = courses.filter(course =>
    electiveAdditionalOptions.some(code => codesMatch(course.code, code))
  );
  const chemAdvancedFromPrefix = chemAdvancedPrefix
    ? courses.some(course => {
        const code = normalizeCode(course.code);
        const match = code.match(/([A-Z]+)\s*(\d+)/);
        if (!match) return false;
        const [, prefix, num] = match;
        return prefix === chemAdvancedPrefix.toUpperCase() && parseInt(num, 10) >= 200;
      })
    : false;

  return {
    introCompleted: introCourses.length,
    groupCell: Boolean(cellCourse),
    groupSystems: Boolean(systemsCourse),
    groupCommunity: Boolean(communityCourse),
    midLevelCount: midCourses.length,
    labCount: labCourses.length,
    capstoneCount: capstone.length,
    additional200: additional200.length,
    additional200Required: bioStructure.additional200Required || 1,
    level300: courses.filter(course => (course.level || 0) >= 300).length,
    level300Required: bioStructure.level300Required || 2,
    electiveCompleted: electiveAddl.length,
    electiveRequired: bioStructure.electiveRequired || 1,
    chemIntroCompleted: courses.some(course =>
      chemIntroOptions.some(code => codesMatch(course.code, code))
    ),
    chemAdvancedCompleted: courses.some(course =>
      chemAdvancedOptions.some(code => codesMatch(course.code, code))
    ) || chemAdvancedFromPrefix,
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

export const computeArchProgress = (courses = [], archStructure = {}) => {
  const normalizeCode = (course) => normalizeCourseCode(course.code);
  const foundation = (archStructure.foundation || []).map(block => {
    const match = courses.find(course => (block.options || []).some(opt => codesMatch(course.code, opt)));
    return {
      id: block.id,
      label: block.label,
      options: block.options || [],
      completed: Boolean(match),
      fulfilledBy: match?.code || null,
    };
  });

  const departmentOf = (course) => detectDepartmentFromCode(course.code);
  const levelOf = (course) => course.level || 0;

  const isDeptIncluded = (course, allowed = []) => allowed.includes(departmentOf(course));

  const intermediateCourses = courses.filter(course => {
    const lvl = levelOf(course);
    if (lvl < 200 || lvl >= 300) return false;
    return isDeptIncluded(course, archStructure.intermediateDepartments || []);
  });

  const advancedCourses = courses.filter(course => {
    if (levelOf(course) < 300) return false;
    return isDeptIncluded(course, archStructure.advancedDepartments || []);
  });

  const advancedWellesleyCount = advancedCourses.filter(course =>
    isDeptIncluded(course, archStructure.advancedWellesleyDepartments || [])
  ).length;

  const additionalCourses = courses.filter(course =>
    isDeptIncluded(course, archStructure.additionalDepartments || [])
  );

  const totalUnits = courses.reduce((sum, course) => sum + Number(course.credits || 0), 0);

  return {
    foundation,
    intermediateCount: intermediateCourses.length,
    intermediateRequired: archStructure.intermediateRequired || 2,
    advancedCount: advancedCourses.length,
    advancedRequired: archStructure.advancedRequired || 2,
    advancedWellesleyCount,
    additionalCount: additionalCourses.length,
    additionalRequired: archStructure.additionalRequired || 2,
    totalUnits,
    totalUnitsRequired: archStructure.totalUnitsRequired || 11,
  };
};

export const computeStudioProgress = (courses = [], studioStructure = {}) => {
  const foundation = (studioStructure.foundation || []).map(block => {
    const options = block.options || [];
    const match = options.length
      ? courses.find(course => options.some(opt => codesMatch(course.code, opt)))
      : null;
    return {
      id: block.id,
      label: block.label,
      options,
      completed: Boolean(match),
      fulfilledBy: match?.code || null,
    };
  });

  const levelOf = (course) => course.level || 0;
  const prefix = (course) => (course.code || "").split(/\s+/)[0];
  const allowedStudio = new Set(studioStructure.allowedStudioDepartments || []);

  const eligibleStudioCourses = courses.filter(course =>
    allowedStudio.has(detectDepartmentFromCode(course.code))
  );
  const upperStudioCourses = eligibleStudioCourses.filter(course => levelOf(course) >= 200);
  const level300Studio = eligibleStudioCourses.filter(course => levelOf(course) >= 300);

  const capstoneCourses = (studioStructure.capstoneCourses || []).map(code => ({
    code,
    completed: courses.some(course => codesMatch(course.code, code)),
  }));

  return {
    foundation,
    upperStudioCount: upperStudioCourses.length,
    upperStudioRequired: studioStructure.upperStudioRequired || 5,
    level300Count: level300Studio.length,
    level300Required: studioStructure.level300Required || 2,
    capstone: capstoneCourses,
  };
};

export const computeArtHistoryProgress = (courses = [], artHistoryStructure = {}) => {
  const foundation = (artHistoryStructure.foundation || []).map(block => {
    const match = courses.find(course => (block.options || []).some(opt => codesMatch(course.code, opt)));
    return {
      id: block.id,
      label: block.label,
      options: block.options || [],
      completed: Boolean(match),
      fulfilledBy: match?.code || null,
    };
  });

  const countMatches = (courseList = []) =>
    courses.filter(course => courseList.some(code => codesMatch(course.code, code))).length;

  const amerCount = countMatches(artHistoryStructure.regionAmericas);
  const emeaCount = countMatches(artHistoryStructure.regionEMEA);
  const asiaCount = countMatches(artHistoryStructure.regionAsia);
  const pre1800Count = countMatches(artHistoryStructure.pre1800);
  const post1800Count = countMatches(artHistoryStructure.post1800);
  const level300Count = courses.filter(course => detectDepartmentFromCode(course.code) === "Art History" && (course.level || 0) >= 300).length;

  return {
    foundation,
    amerCount,
    emeaCount,
    asiaCount,
    pre1800Count,
    post1800Count,
    level300Count,
    level300Required: artHistoryStructure.level300Required || 2,
  };
};

export const computeBiocProgress = (courses = [], biocStructure = {}) => {
  const foundation = (biocStructure.foundation || []).map(block => {
    const match = courses.find(course => (block.options || []).some(opt => codesMatch(course.code, opt)));
    return {
      id: block.id,
      label: block.label,
      options: block.options || [],
      completed: Boolean(match),
      fulfilledBy: match?.code || null,
    };
  });

  const evaluateGroup = (group = []) =>
    group.map(req => {
      const match = courses.find(course => (req.options || []).some(opt => codesMatch(course.code, opt)));
      return {
        id: req.id,
        label: req.label,
        completed: Boolean(match),
        fulfilledBy: match?.code || null,
      };
    });

  const bisc200 = evaluateGroup(biocStructure.bisc200 || []);
  const chem200 = evaluateGroup(biocStructure.chem200 || []);

  const matchListCount = (list = []) =>
    courses.filter(course => list.some(code => codesMatch(course.code, code))).length;

  const bisc300Count = matchListCount(biocStructure.bisc300Courses);
  const chem331Completed = courses.some(course => (biocStructure.chem300Required || []).some(code => codesMatch(course.code, code)));
  const chem300ElectiveCount = matchListCount(biocStructure.chem300Electives);
  const labCourses = new Set((biocStructure.labCourses || []).map(code => code.toUpperCase()))
  const labCount = courses.filter(course => {
    const code = normalizeCourseCode(course.code);
    return labCourses.has(code);
  }).length;
  const researchCompleted = courses.some(course => (biocStructure.researchCourses || []).some(code => codesMatch(course.code, code)));

  return {
    foundation,
    bisc200,
    chem200,
    bisc300Count,
    bisc300Required: 2,
    chem331Completed,
    chem300ElectiveCount,
    chem300ElectiveRequired: 1,
    labCount,
    labRequired: 2,
    researchCompleted,
  };
};

export const computeChphProgress = (courses = [], chphStructure = {}) => {
  const hasCourse = (code = "") => courses.some(course => codesMatch(course.code, code));
  const findMatch = (options = []) => courses.find(course => options.some(opt => codesMatch(course.code, opt)));
  const normalizeOptions = (list = []) => list.map(code => code.toUpperCase());

  const generalChemAlt = hasCourse(chphStructure.generalChemAlt?.[0] || "");
  const genChemIntroMatch = generalChemAlt
    ? true
    : Boolean(findMatch(chphStructure.generalChemIntro || []));
  const genChemSecondMatch = generalChemAlt
    ? true
    : Boolean(findMatch(chphStructure.generalChemSecond || []));

  const generalChem = {
    completed: generalChemAlt ? true : (genChemIntroMatch && genChemSecondMatch),
    fulfilledByAlt: generalChemAlt,
  };

  const physicsIntroCount = (chphStructure.physicsIntro || []).filter(hasCourse).length;
  const requiredCourses = (chphStructure.requiredCourses || []).map(code => ({ code, completed: hasCourse(code) }));
  const labChoice = (chphStructure.labChoice || []).map(block => {
    const match = findMatch(block.options || []);
    return {
      id: block.id,
      label: block.label,
      completed: Boolean(match),
      fulfilledBy: match?.code || null,
    };
  });
  const chemAdvancedMatch = findMatch(chphStructure.chemAdvancedOptions || []);
  const physicsElectiveMatch = findMatch(chphStructure.physicsElectives || []);

  return {
    generalChem,
    physicsIntroCount,
    physicsIntroTotal: (chphStructure.physicsIntro || []).length,
    requiredCourses,
    labChoice,
    chemAdvancedCompleted: Boolean(chemAdvancedMatch),
    physicsElectiveCompleted: Boolean(physicsElectiveMatch),
  };
};

export const computeChemProgress = (courses = [], chemStructure = {}) => {
  const hasCourse = (code = "") => courses.some(course => codesMatch(course.code, code));
  const findMatch = (options = []) => courses.find(course => options.some(opt => codesMatch(course.code, opt)));

  const tookAltSequence = (chemStructure.altSequence || []).some(code => hasCourse(code));
  const foundation = (chemStructure.foundation || []).map(block => {
    let completed = block.options?.some(opt => hasCourse(opt)) || false;
    if (block.id === "chem-205" && tookAltSequence) completed = true;
    const match = block.options?.length ? findMatch(block.options) : null;
    return {
      id: block.id,
      label: block.label,
      completed,
      fulfilledBy: completed && match ? match.code : null,
    };
  });

  const coreCourses = (chemStructure.coreCourses || []).map(code => ({ code, completed: hasCourse(code) }));

  const electiveOptions = chemStructure.electivePool || [];
  const electiveCount = courses.filter(course => electiveOptions.some(code => codesMatch(course.code, code))).length;
  const electiveRequired = chemStructure.electiveRequired || 3;

  const excludedExtra = new Set((chemStructure.excludedExtra300 || []).map(code => code.toUpperCase()));
  const additional300Count = courses.filter(course => {
    if ((course.level || 0) < 300) return false;
    if (detectDepartmentFromCode(course.code) !== "Chemistry") return false;
    const code = normalizeCourseCode(course.code);
    return !excludedExtra.has(code);
  }).length;

  const researchCompleted = courses.some(course => (chemStructure.researchCourses || []).some(code => codesMatch(course.code, code)));

  const physicsMet = (chemStructure.physicsRequirement || []).some(code => hasCourse(code));
  const physicsIntroMet = (chemStructure.physicsIntro || []).some(code => hasCourse(code));
  const mathMet = (chemStructure.mathRequirement || []).some(code => hasCourse(code));

  return {
    foundation,
    coreCourses,
    electiveCount,
    electiveRequired,
    additional300Count,
    additional300Required: chemStructure.additional300Required || 1,
    researchCompleted,
    physicsMet,
    physicsIntroMet,
    mathMet,
  };
};

export const computeCamsProgress = (courses = [], camsStructure = {}) => {
  const matchCourse = (options = []) => courses.find(course => options.some(opt => codesMatch(course.code, opt)));
  const foundation = (camsStructure.foundation || []).map(block => {
    const match = matchCourse(block.options || []);
    return {
      id: block.id,
      label: block.label,
      completed: Boolean(match),
      fulfilledBy: match?.code || null,
    };
  });

  const productionCompleted = Boolean(matchCourse(camsStructure.productionCourses || []));
  const coreMatches = courses.filter(course => (camsStructure.coreCourses || []).some(opt => codesMatch(course.code, opt))).length;
  const level300Matches = courses.filter(course => (camsStructure.level300Courses || []).some(opt => codesMatch(course.code, opt))).length;
  const additionalCamsMatches = courses.filter(course => course.code?.startsWith("CAMS")).length;

  return {
    foundation,
    productionCompleted,
    coreMatches,
    coreRequired: 4,
    level300Matches,
    level300Required: camsStructure.level300Required || 2,
    additionalCamsMatches,
    additionalCamsRequired: camsStructure.additionalCamsRequired || 1,
  };
};

export const computeClassicsProgress = (courses = [], classicsStructure = {}) => {
  const deptOf = (course) => detectDepartmentFromCode(course.code);
  const levelOf = (course) => course.level || 0;
  const isGreek = (course) => deptOf(course) === "Greek";
  const isLatin = (course) => deptOf(course) === "Latin";

  const languageCourses = courses.filter(course => isGreek(course) || isLatin(course));
  const greekCount = languageCourses.filter(isGreek).length;
  const latinCount = languageCourses.filter(isLatin).length;
  const lang300Count = languageCourses.filter(course => levelOf(course) >= 300).length;
  const lang100Count = languageCourses.filter(course => levelOf(course) < 200).length;

  const codesMatchList = (course, list = []) => (list || []).some(code => codesMatch(course.code, code));
  const civCourses = courses.filter(course => codesMatchList(course, classicsStructure.civCourseCodes));
  const civCount = civCourses.length;
  const civClcvCount = civCourses.filter(course => deptOf(course) === "Classical Civilization" || course.code?.startsWith("CLCV")).length;
  const civ100Count = civCourses.filter(course => levelOf(course) < 200).length;

  return {
    greekCount,
    latinCount,
    languageTotal: languageCourses.length,
    lang300Count,
    lang100Count,
    civCount,
    civRequired: classicsStructure.civRequired || 4,
    civClcvCount,
    civClcvRequired: classicsStructure.civClcvRequired || 2,
    civ100Count,
    civMax100: classicsStructure.civMax100 || 1,
    languageTotalRequired: classicsStructure.languageTotalRequired || 6,
    languageMinUpper: classicsStructure.languageMinUpper || 2,
    languageMaxIntro: classicsStructure.languageMaxIntro || 2,
  };
};

export const computeClscProgress = (courses = [], clscStructure = {}) => {
  const matchesDeptOrPrefix = (course, entry = {}) => {
    const dept = detectDepartmentFromCode(course.code);
    if ((entry.departments || []).includes(dept)) return true;
    const prefixes = entry.prefixes || [];
    if (prefixes.some(prefix => course.code?.startsWith(prefix))) return true;
    return false;
  };

  const foundation = (clscStructure.core || []).map(block => {
    let completed = false;
    let fulfilledBy = null;
    if (block.options && block.options.length) {
      const match = courses.find(course => block.options.some(opt => codesMatch(course.code, opt)));
      completed = Boolean(match);
      fulfilledBy = match?.code || null;
    } else if (block.dept || block.prefixes) {
      const match = courses.find(course => matchesDeptOrPrefix(course, block));
      completed = Boolean(match);
      fulfilledBy = match?.code || null;
    }
    return { id: block.id, label: block.label, completed, fulfilledBy };
  });

  const concentrations = (clscStructure.concentrations || []).map(conc => {
    const count = courses.filter(course => matchesDeptOrPrefix(course, conc)).length;
    return { ...conc, count };
  });
  const bestConcentration = concentrations.reduce((best, current) => (current.count > (best?.count || 0) ? current : best), null);

  return {
    foundation,
    concentrations,
    bestConcentration,
    concentrationRequired: clscStructure.concentrationElectivesRequired || 4,
  };
};

export const computeCpltProgress = (courses = [], cpltStructure = {}) => {
  const isCpltCourse = (course) => (course.code || "").startsWith("CPLT");
  const cpltCourses = courses.filter(isCpltCourse);
  const cpltCount = cpltCourses.length;
  const cplt300Count = cpltCourses.filter(course => (course.level || 0) >= 300).length;

  const requiredCourses = (cpltStructure.requiredCourses || []).map(code => ({
    code,
    completed: courses.some(course => codesMatch(course.code, code)),
  }));

  const totalCourses = courses.length;

  return {
    requiredCourses,
    cpltCount,
    cplt300Count,
    totalCourses,
    minCpltCourses: cpltStructure.minCpltCourses || 5,
    totalRequired: cpltStructure.totalRequired || 9,
  };
};

export const computeDsProgress = (courses = [], dsStructure = {}) => {
  const foundation = (dsStructure.foundations || []).map(block => {
    const match = courses.find(course => (block.options || []).some(opt => codesMatch(course.code, opt)));
    return {
      id: block.id,
      label: block.label,
      options: block.options || [],
      completed: Boolean(match),
      fulfilledBy: match?.code || null,
    };
  });

  const matchesElective = (course, options = []) => options.some(opt => codesMatch(course.code, opt));
  const csElectiveCount = courses.filter(course => matchesElective(course, dsStructure.electivesCS)).length;
  const statElectiveCount = courses.filter(course => matchesElective(course, dsStructure.electivesStat)).length;

  const hasCapstone = courses.some(course => (dsStructure.capstoneOptions || []).some(opt => codesMatch(course.code, opt)));

  return {
    foundation,
    csElectiveCount,
    statElectiveCount,
    hasCapstone,
  };
};

export const computeEalcProgress = (courses = [], ealcStructure = {}) => {
  const gatewayMatch = courses.some(course => codesMatch(course.code, ealcStructure.gateway || ""));
  const trackResults = Object.entries(ealcStructure.tracks || {}).map(([key, track]) => {
    let bestSequence = null;
    (track.sequences || []).forEach(seq => {
      const completed = seq.every(code => courses.some(course => codesMatch(course.code, code)));
      if (completed && !bestSequence) {
        bestSequence = seq;
      }
    });
    return {
      id: key,
      label: track.label,
      completed: Boolean(bestSequence),
    };
  });

  const isLanguageCourse = (course) => {
    const code = (course.code || "").toUpperCase();
    return code.startsWith("CHIN") || code.startsWith("JPN") || code.startsWith("KOR");
  };

  const languageCourses = courses.filter(isLanguageCourse);
  const level300Count = languageCourses.filter(course => (course.level || 0) >= 300).length;

  const nonLanguageCourses = courses.filter(course => !isLanguageCourse(course));
  const nonLanguageCount = nonLanguageCourses.length;
  const surveyCount = nonLanguageCourses.filter(course => {
    const level = course.level || 0;
    return level >= 200 && level < 300;
  }).length;

  return {
    gatewayCompleted: gatewayMatch,
    trackResults,
    nonLanguageCount,
    nonLanguageRequired: ealcStructure.nonLanguageRequired || 2,
    surveyCount,
    surveyRequired: ealcStructure.surveyRequired || 1,
    level300Count,
    level300Required: ealcStructure.level300Required || 2,
  };
};

export const computeEasProgress = (courses = [], easStructure = {}) => {
  const languagePrefixes = easStructure.languagePrefixes || ["CHIN", "JPN", "KOR"];
  const isLanguageCourse = (course) => {
    const code = (course.code || "").toUpperCase();
    return languagePrefixes.some((prefix) => code.startsWith(prefix));
  };

  const languageCourses = courses.filter(
    (course) => isLanguageCourse(course) && (course.level || 0) >= 200
  );
  const nonLanguageCourses = courses.filter((course) => !isLanguageCourse(course));

  const belongsTo = (course, list = []) => list.some((code) => codesMatch(course.code, code));

  const humanitiesCount = nonLanguageCourses.filter((course) => belongsTo(course, easStructure.humanitiesCourses || [])).length;
  const historyCount = nonLanguageCourses.filter((course) => belongsTo(course, easStructure.historyCourses || [])).length;
  const nonLanguageCount = nonLanguageCourses.length;
  const nonLang300Count = nonLanguageCourses.filter((course) => (course.level || 0) >= 300).length;

  return {
    languageCount: languageCourses.length,
    languageRequired: easStructure.languageRequired || 4,
    nonLanguageCount,
    nonLanguageRequired: easStructure.nonLanguageRequired || 6,
    humanitiesCount,
    humanitiesRequired: easStructure.humanitiesRequired || 1,
    historyCount,
    historyRequired: easStructure.historyRequired || 1,
    nonLang300Count,
    nonLang300Required: easStructure.concentration300Required || 2,
    concentrationRequired: easStructure.concentrationRequired || 3,
  };
};

export const computeEsProgress = (courses = [], esStructure = {}) => {
  const normalizeCode = (course) => normalizeCourseCode(course.code);
  const matches = (course, list = []) => (list || []).some(code => codesMatch(course.code || course, code));

  const coreStatus = (esStructure.coreCourses || []).map(block => {
    const match = courses.find(course => matches(course, block.options || []));
    return {
      id: block.id,
      label: block.label,
      options: block.options || [],
      completed: Boolean(match),
      fulfilledBy: match?.code || null,
    };
  });

  const usedCodes = new Set(
    coreStatus
      .filter(step => step.completed)
      .map(step => normalizeCourseCode(step.fulfilledBy || ""))
      .filter(Boolean)
  );

  const scienceCourseOptions = esStructure.scienceCourseOptions || [];
  const scienceIntroOptions = esStructure.scienceIntroOptions || [];
  const labSet = new Set((esStructure.labCourses || []).map(code => normalizeCourseCode(code)));

  const scienceMatches = [];
  courses.forEach(course => {
    if (!matches(course, scienceCourseOptions)) return;
    const code = normalizeCode(course);
    if (!code || scienceMatches.some(item => item.code === code)) return;
    scienceMatches.push({
      course,
      code,
      isLab: labSet.has(code),
    });
  });

  const disallowPair = new Set(["ES 100", "ES 101"].map(code => normalizeCourseCode(code)));
  let introCourse = scienceMatches.find(item => matches({ code: item.code }, scienceIntroOptions));
  let additionalCourse = null;

  if (introCourse) {
    const available = scienceMatches.filter(item => item.code !== introCourse.code);
    additionalCourse = available.find(item => item.isLab) || available[0] || null;
    if (additionalCourse && disallowPair.has(introCourse.code) && disallowPair.has(additionalCourse.code)) {
      const alt = available.find(item => !disallowPair.has(item.code));
      additionalCourse = alt || null;
    }
  } else if (scienceMatches.length > 0) {
    introCourse = scienceMatches[0];
    additionalCourse = scienceMatches[1] || null;
  }

  if (introCourse && !additionalCourse) {
    const available = scienceMatches.filter(item => item.code !== introCourse.code);
    if (available.length) {
      additionalCourse = available.find(item => item.isLab) || available[0] || null;
      if (additionalCourse && disallowPair.has(introCourse.code) && disallowPair.has(additionalCourse.code)) {
        const alt = available.find(item => !disallowPair.has(item.code));
        additionalCourse = alt || null;
      }
    }
  }

  const scienceSelections = [introCourse, additionalCourse].filter(Boolean);
  let scienceLabSatisfied = scienceSelections.some(item => item.isLab);
  if (!scienceLabSatisfied) {
    const extraLab = scienceMatches.find(item => item.isLab && (!introCourse || item.code !== introCourse.code));
    if (extraLab) {
      additionalCourse = extraLab;
      scienceSelections[scienceSelections.length - 1] = extraLab;
      scienceLabSatisfied = true;
    }
  }

  scienceSelections.forEach(item => usedCodes.add(item.code));

  const capstoneCourse = courses.find(course => matches(course, esStructure.capstoneOptions || []));
  if (capstoneCourse) usedCodes.add(normalizeCode(capstoneCourse));

  const electiveStructure = esStructure.electiveStructure || {};
  const electiveDepartments = new Set((electiveStructure.allowedDepartments || []).map(String));
  const electiveCodes = new Set((electiveStructure.allowedCourseCodes || []).map(code => normalizeCourseCode(code)));
  const independentCodes = new Set((electiveStructure.independentStudyCourses || []).map(code => normalizeCourseCode(code)));

  const electiveCandidates = courses.filter(course => {
    const code = normalizeCode(course);
    if (!code || usedCodes.has(code)) return false;
    if (electiveCodes.has(code)) return true;
    const dept = detectDepartmentFromCode(course.code);
    if (dept && electiveDepartments.has(dept)) return true;
    return false;
  });

  const electiveUnits = electiveCandidates.reduce((sum, course) => sum + (Number(course.credits) || 0), 0);
  const nonIndependentFull = electiveCandidates.filter(course => {
    const code = normalizeCode(course);
    const credits = Number(course.credits) || 0;
    return credits >= 0.99 && !independentCodes.has(code);
  });

  const level300NonIndependent = nonIndependentFull.filter(course => (course.level || 0) >= 300);

  const totalRequired = esStructure.totalRequired || esStructure.unitTarget || 10;

  return {
    coreStatus,
    scienceIntro: introCourse?.course || null,
    scienceAdditional: additionalCourse?.course || null,
    scienceCount: scienceSelections.length,
    scienceLabSatisfied,
    capstoneCompleted: Boolean(capstoneCourse),
    capstoneCourse: capstoneCourse?.code || null,
    electiveUnits,
    electiveUnitTarget: electiveStructure.creditTarget || 4,
    electiveCourseCount: electiveCandidates.length,
    nonIndependentFullCount: nonIndependentFull.length,
    minFullCourses: electiveStructure.minFullCourses || 2,
    level300Count: level300NonIndependent.length,
    level300Required: electiveStructure.min300LevelFullCourses || 1,
    totalRequired,
  };
};

export const computeEducationProgress = (courses = [], educationStructure = {}) => {
  const matches = (course, list = []) =>
    (list || []).some(code => codesMatch(course.code, code));
  const normalizeCode = (course) => normalizeCourseCode(course.code);

  const coreCourse = courses.find(course => matches(course, educationStructure.coreCourses || []));
  const researchTheoryCourses = courses.filter(course =>
    matches(course, educationStructure.researchTheoryCourses || [])
  );
  const curriculumCourses = courses.filter(course =>
    matches(course, educationStructure.curriculumTeachingCourses || [])
  );
  const electiveCourses = courses.filter(course =>
    matches(course, educationStructure.electiveCourses || [])
  );
  const capstoneCourses = courses.filter(course =>
    matches(course, educationStructure.capstoneCourses || [])
  );
  const independentStudies = courses.filter(course =>
    matches(course, educationStructure.independentStudyCourses || [])
  );

  const educationPrefixCourses = courses.filter(course => normalizeCode(course).startsWith("EDUC"));
  const education300Courses = educationPrefixCourses.filter(course => (course.level || 0) >= 300);

  const majorEligibleCourses = courses.filter(course => {
    if (normalizeCode(course).startsWith("EDUC")) return true;
    if (matches(course, educationStructure.researchTheoryCourses || [])) return true;
    if (matches(course, educationStructure.curriculumTeachingCourses || [])) return true;
    if (matches(course, educationStructure.electiveCourses || [])) return true;
    return false;
  });

  return {
    coreCompleted: Boolean(coreCourse),
    coreFulfilledBy: coreCourse?.code || null,
    researchTheoryCount: researchTheoryCourses.length,
    researchTheoryRequired: educationStructure.researchTheoryRequired || 4,
    curriculumCount: curriculumCourses.length,
    curriculumMax: educationStructure.curriculumMax || 3,
    electiveCount: electiveCourses.length,
    electiveMax: educationStructure.electiveMax || 3,
    capstoneCount: capstoneCourses.length,
    capstoneCompleted: capstoneCourses.length >= (educationStructure.capstoneRequired || 1),
    capstoneRequired: educationStructure.capstoneRequired || 1,
    capstoneFulfilledBy: capstoneCourses[0]?.code || null,
    educationDeptCount: educationPrefixCourses.length,
    education300Count: education300Courses.length,
    education300Required: educationStructure.education300Required || 2,
    independentStudyCount: independentStudies.length,
    independentStudyLimit: educationStructure.independentStudyLimit || 1,
    totalCourses: majorEligibleCourses.length,
    totalRequired: educationStructure.totalRequired || 9,
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
