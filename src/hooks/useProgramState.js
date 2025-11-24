import { useEffect, useMemo, useState } from "react";

export const PROGRAM_TYPE_OPTIONS = ["Major", "Minor", "None"];

export const DEFAULT_PROGRAM_SELECTIONS = [
  { id: "programA", label: "Program 1", type: "Major", value: "", experienceComplete: false },
  { id: "programB", label: "Program 2", type: "None", value: "", experienceComplete: false },
];

export const ensureProgramSelections = (saved) => {
  if (!Array.isArray(saved)) return DEFAULT_PROGRAM_SELECTIONS.map(entry => ({ ...entry }));
  return DEFAULT_PROGRAM_SELECTIONS.map(template => {
    const match = saved.find(item => item.id === template.id);
    if (!match) return { ...template };
    const rawType = match.type === "Second Major" ? "Major" : match.type;
    const normalizedType = PROGRAM_TYPE_OPTIONS.includes(rawType) ? rawType : template.type;
    return { ...template, ...match, type: normalizedType };
  });
};

export const resetProgramState = (data) => {
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

const alignInitialProgramSelections = (rawSelections, snapshot) => {
  const selections = rawSelections.map(entry => ({ ...entry }));
  const primarySlot = selections.find(entry => entry.id === "programA");
  if (primarySlot) {
    primarySlot.type = "Major";
    if (snapshot?.primaryMajor) {
      primarySlot.value = snapshot.primaryMajor;
    }
  }

  const secondarySlot = selections.find(entry => entry.id === "programB");
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
  return selections;
};

const deriveInitialProgramView = (alignedSelections, snapshot) => {
  const primarySlot = alignedSelections.find(entry => entry.id === "programA");
  const secondarySlot = alignedSelections.find(entry => entry.id === "programB");
  const primaryMajor =
    snapshot?.primaryMajor ||
    (primarySlot?.type === "Major" ? primarySlot.value || "" : "");

  const secondaryMajor =
    snapshot?.secondaryMajor ||
    (secondarySlot?.type === "Major" ? secondarySlot.value || "" : "");

  const selectedMinor =
    snapshot?.selectedMinor ||
    (secondarySlot?.type === "Minor" ? secondarySlot.value || "" : "");

  const showSecondaryMajor =
    typeof snapshot?.showSecondaryMajor === "boolean"
      ? snapshot.showSecondaryMajor
      : secondarySlot?.type === "Major" && !!secondarySlot.value;

  const showMinorPlanner =
    typeof snapshot?.showMinorPlanner === "boolean"
      ? snapshot.showMinorPlanner
      : secondarySlot?.type === "Minor" && !!secondarySlot.value;

  return {
    primaryMajor,
    secondaryMajor,
    selectedMinor,
    showSecondaryMajor,
    showMinorPlanner,
  };
};

export const useProgramState = (savedData) => {
  const initialSelections = useMemo(() => {
    const ensured = ensureProgramSelections(savedData?.programSelections);
    return alignInitialProgramSelections(ensured, savedData);
  }, [savedData]);

  const initialView = useMemo(
    () => deriveInitialProgramView(initialSelections, savedData),
    [initialSelections, savedData]
  );

  const [programSelections, setProgramSelections] = useState(initialSelections);
  const [primaryMajor, setPrimaryMajor] = useState(initialView.primaryMajor);
  const [secondaryMajor, setSecondaryMajor] = useState(initialView.secondaryMajor);
  const [showSecondaryMajor, setShowSecondaryMajor] = useState(initialView.showSecondaryMajor);
  const [selectedMinor, setSelectedMinor] = useState(initialView.selectedMinor);
  const [showMinorPlanner, setShowMinorPlanner] = useState(initialView.showMinorPlanner);

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
        if (current.type !== updated.type || current.value !== updated.value) {
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

  return {
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
  };
};
