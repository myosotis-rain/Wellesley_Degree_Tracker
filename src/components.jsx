import { useEffect, useRef, useState } from "react";
import { requirementTagOptions, subjectOptions } from "./data.js";
import { clamp01, cx, detectDepartmentFromCode } from "./utils.js";

// ---- UI helpers ----
export const Pill = ({ children, className }) => (
  <span className={cx("inline-flex items-center rounded-full border px-2 py-1 text-xs", className)}>
    {children}
  </span>
);

export const RingStat = ({ pct, label, subtitle }) => {
  const p = clamp01(pct);
  const deg = p * 360;
  return (
    <div className="flex flex-col items-center text-center text-xs">
      <div className="relative h-20 w-20">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(#1e40af ${deg}deg, #e5e7eb 0deg)`,
          }}
        />
        <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
          <span className="text-sm font-semibold text-slate-900">
            {Math.round(p * 100)}%
          </span>
        </div>
      </div>
      <div className="mt-1 text-[0.7rem] font-medium text-slate-800">{label}</div>
      {subtitle && (
        <div className="mt-0.5 text-[0.65rem] text-slate-500">{subtitle}</div>
      )}
    </div>
  );
};

export const MiniReqBar = ({ label, have, target, pct }) => {
  const pctValue = pct ?? clamp01(target ? have / target : 0);
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between text-[0.7rem]">
        <span>{label}</span>
        <span className="text-[0.65rem]">
          {have}/{target}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-indigo-500"
          style={{ width: `${pctValue * 100}%` }}
        />
      </div>
    </div>
  );
};

// ---- Editable Year Label ----
export const EditableYearLabel = ({ year, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempLabel, setTempLabel] = useState(year.label || "");

  useEffect(() => {
    setTempLabel(year.label || "");
  }, [year.label]);

  const handleSubmit = () => {
    if (tempLabel.trim() && tempLabel !== year.label) {
      onUpdate(year.id, tempLabel.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempLabel(year.label);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={tempLabel}
          onChange={(e) => setTempLabel(e.target.value)}
          className="rounded border px-2 py-1 text-sm font-semibold text-slate-800"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') handleCancel();
          }}
          onBlur={handleSubmit}
          autoFocus
        />
        <button
          type="button"
          onClick={handleSubmit}
          className="text-[0.6rem] text-green-600 hover:text-green-700"
        >
          ✓
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="text-[0.6rem] text-red-600 hover:text-red-700"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="text-sm font-semibold text-slate-800 hover:text-indigo-600 underline decoration-dotted"
    >
      {year.label}
    </button>
  );
};

// ---- Term cards (left column) ----
export const TermSummaryCard = ({ term, onOpen, onRemove, canRemove, onYearChange, status = "unspecified" }) => {
  const nonEmptySlots = term.slots.filter(s => s.code || s.title);
  const [isEditingYear, setIsEditingYear] = useState(false);
  const [tempYear, setTempYear] = useState(term.calendarYear);
  const STATUS_PALETTE = {
    current: { border: "#a7d9fb", background: "rgba(27,157,229,0.12)", pillBg: "#1B9DE5", pillText: "#ffffff" },
    future: { border: "#e0e6f0", background: "#f7f8fb" },
  };
  const statusBorderClasses = {
    past: "border-slate-200 bg-white",
    current: "border-transparent",
    future: "border-transparent",
    unspecified: "border-slate-200 bg-white",
  };
  const statusLabels = {
    current: "Current term",
  };

  const handleYearSubmit = () => {
    if (tempYear !== term.calendarYear) {
      onYearChange(term.id, tempYear);
    }
    setIsEditingYear(false);
  };

  const handleYearCancel = () => {
    setTempYear(term.calendarYear);
    setIsEditingYear(false);
  };

  return (
    <div className="relative group">
      <div
        onClick={onOpen}
        className={cx(
          "group flex h-full w-full flex-col rounded-[14px] border px-3 py-2 text-left transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer",
          statusBorderClasses[status] || statusBorderClasses.unspecified
        )}
        style={
          status === "current"
            ? {
                borderColor: STATUS_PALETTE.current.border,
                backgroundColor: STATUS_PALETTE.current.background,
              }
            : status === "future"
              ? {
                  borderColor: STATUS_PALETTE.future.border,
                  backgroundColor: STATUS_PALETTE.future.background,
                }
              : {}
        }
      >
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <div className={cx("text-[0.75rem] font-semibold text-slate-800", status==="future" && "italic text-slate-500")}>
            {term.season || term.label.split(' ')[0]}
          </div>
          {isEditingYear ? (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <input
                type="number"
                value={tempYear}
                onChange={(e) => setTempYear(parseInt(e.target.value))}
                className="w-16 rounded border px-1 text-[0.65rem]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleYearSubmit();
                  if (e.key === 'Escape') handleYearCancel();
                }}
                autoFocus
              />
              <button
                type="button"
                onClick={handleYearSubmit}
                className="text-[0.6rem] text-green-600 hover:text-green-700"
              >
                ✓
              </button>
              <button
                type="button"
                onClick={handleYearCancel}
                className="text-[0.6rem] text-red-600 hover:text-red-700"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingYear(true);
              }}
              className="text-[0.65rem] text-slate-500 hover:text-indigo-600 underline"
            >
              {term.calendarYear}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 text-[0.65rem]">
          {status === "current" && (
            <span className="rounded-full bg-[#1B9DE5] px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-wide text-white">
              {statusLabels[status]}
            </span>
          )}
          <span className="text-[0.65rem] text-slate-400 group-hover:text-indigo-500">
            Edit
          </span>
        </div>
      </div>
      <div className={cx("space-y-1 text-[0.7rem]", status==="future" && "italic text-slate-500")}>
        {nonEmptySlots.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-2 py-2 text-[0.65rem] text-slate-400">
            No courses yet. Click to add.
          </div>
        )}
        {nonEmptySlots.slice(0, 3).map((s, i) => (
          <div key={i} className="flex items-start justify-between">
            <div className="truncate">
              <div className="text-[0.7rem] font-medium truncate">
                {s.code || "Course"}
              </div>
              <div className="text-[0.65rem] text-slate-500 truncate">
                {s.title || "Tap to edit details"}
              </div>
            </div>
            <div className="ml-2 text-[0.65rem] text-slate-500">
              {(s.credits || 0).toFixed(1)}
            </div>
          </div>
        ))}
        {nonEmptySlots.length > 3 && (
          <div className="text-[0.6rem] text-slate-400">
            + {nonEmptySlots.length - 3} more…
          </div>
        )}
      </div>
      </div>
      {canRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -right-2 -top-2 rounded-full border border-rose-200 bg-white px-2 py-0.5 text-[0.6rem] text-rose-600 opacity-0 shadow-sm transition hover:bg-rose-50 group-hover:opacity-100"
        >
          ×
        </button>
      )}
    </div>
  );
};

// ---- Term detail modal ----
export function TermDetailModal({
  term,
  onClose,
  updateSlot,
  addSlot,
  removeSlot,
  programSelections = [],
  programRequirementOptions = {},
}) {
  if (!term) return null;

  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const savedIndicatorTimer = useRef(null);

  useEffect(() => {
    setShowSavedIndicator(false);
    if (savedIndicatorTimer.current) {
      clearTimeout(savedIndicatorTimer.current);
      savedIndicatorTimer.current = null;
    }
  }, [term.id]);

  useEffect(() => {
    return () => {
      if (savedIndicatorTimer.current) clearTimeout(savedIndicatorTimer.current);
    };
  }, []);

  const markSaved = () => {
    setShowSavedIndicator(true);
    if (savedIndicatorTimer.current) clearTimeout(savedIndicatorTimer.current);
    savedIndicatorTimer.current = setTimeout(() => {
      setShowSavedIndicator(false);
      savedIndicatorTimer.current = null;
    }, 2000);
  };

  const updateField = (slotIdx, field, value) => {
    updateSlot(term.id, slotIdx, (s) => {
      const updated = { ...s, [field]: value };
      // Auto-detect course level and department from course code
      if (field === 'code' && value) {
        const codeUpper = value.trim().toUpperCase();
        const match = codeUpper.match(/([A-Z]+)\s*(\d{3})/); // Find department and 3-digit number
        if (match) {
          const deptCode = match[1];
          const courseNum = parseInt(match[2]);

          // Set course level
          if (courseNum >= 100 && courseNum < 200) updated.level = 100;
          else if (courseNum >= 200 && courseNum < 300) updated.level = 200;
          else if (courseNum >= 300) updated.level = 300;

          // Auto-set PE courses to 4.0 credits
          if (deptCode === 'PE') {
            updated.credits = 4.0;
          }

          // Auto-detect department from course code
          const detectedDept = detectDepartmentFromCode(deptCode);
          if (detectedDept && s.source === "Wellesley") {
            updated.depts = [detectedDept];
          }

          // Auto-add 300-level tag for distribution requirement
          if (courseNum >= 300) {
            if (!updated.tags.includes("300")) {
              updated.tags = [...(updated.tags || []), "300"];
            }
          } else {
            // Remove 300 tag if not 300-level
            updated.tags = updated.tags.filter(tag => tag !== "300");
          }
        }
      }
      return updated;
    });
    markSaved();
  };

  const toggleTag = (slotIdx, id) => {
    updateSlot(term.id, slotIdx, (s) => {
      const has = s.tags.includes(id);
      return { ...s, tags: has ? s.tags.filter(t => t !== id) : [...s.tags, id] };
    });
    markSaved();
  };

  const toggleDept = (slotIdx, dept) => {
    updateSlot(term.id, slotIdx, (s) => {
      const has = s.depts.includes(dept);
      const newDepts = has ? s.depts.filter(d => d !== dept) : [dept, ...s.depts.filter(d => d !== dept)];
      return { ...s, depts: newDepts };
    });
    markSaved();
  };

  const toggleProgramAssignment = (slotIdx, programId) => {
    updateSlot(term.id, slotIdx, (s) => {
      const programs = { ...(s.programs || {}) };
      if (programs[programId]) {
        delete programs[programId];
      } else {
        programs[programId] = { requirement: "" };
      }
      return { ...s, programs };
    });
    markSaved();
  };

  const setProgramRequirement = (slotIdx, programId, requirementId) => {
    updateSlot(term.id, slotIdx, (s) => {
      const programs = { ...(s.programs || {}) };
      if (!programs[programId]) return s;
      programs[programId] = { ...(programs[programId] || {}), requirement: requirementId };
      return { ...s, programs };
    });
    markSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Edit term
            </div>
            <div className="text-sm font-semibold text-slate-900">{term.label}</div>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-600">
            {showSavedIndicator && (
              <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[0.65rem] font-medium text-emerald-700">
                <span aria-hidden="true">✓</span>
                <span>Changes saved</span>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-300 px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Done
            </button>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          {term.slots.map((slot, i) => (
            <div key={i} className="rounded-xl border p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[0.7rem] font-semibold text-slate-800">
                    Course {i + 1}
                  </span>
                  {slot.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {slot.tags.map(t => (
                        <span
                          key={t}
                          className="rounded-full bg-indigo-50 px-2 py-0.5 text-[0.6rem] text-indigo-700"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    removeSlot(term.id, i);
                    markSaved();
                  }}
                  className="rounded-full border border-rose-200 px-2 py-0.5 text-[0.6rem] text-rose-600 hover:bg-rose-50"
                >
                  Remove
                </button>
              </div>

              <div className="grid gap-2 md:grid-cols-5">
                <input
                  className="rounded-lg border px-2 py-1 text-[0.7rem] md:col-span-1"
                  placeholder="Code (e.g. CS 111)"
                  value={slot.code}
                  onChange={(e) => updateField(i, "code", e.target.value)}
                />
                <input
                  className="rounded-lg border px-2 py-1 text-[0.7rem] md:col-span-3"
                  placeholder="Title"
                  value={slot.title}
                  onChange={(e) => updateField(i, "title", e.target.value)}
                />
                <input
                  className="rounded-lg border px-2 py-1 text-[0.7rem] md:col-span-1"
                  placeholder="Units"
                  type="number"
                  min="0"
                  step="0.25"
                  value={slot.credits}
                  onChange={(e) =>
                    updateField(i, "credits", parseFloat(e.target.value || "0"))
                  }
                />
              </div>

              <div className="mt-2 grid gap-2 md:grid-cols-3">
                <div className="rounded-lg border bg-slate-50 px-2 py-2">
                  <div className="mb-1 text-[0.7rem] font-semibold text-slate-700">
                    Requirement tags
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {requirementTagOptions.map(opt => {
                      const active = slot.tags.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggleTag(i, opt.id)}
                          className={cx(
                            "rounded-full border px-2 py-0.5 text-[0.65rem]",
                            active
                              ? "border-indigo-600 bg-indigo-600 text-white"
                              : "border-slate-300 bg-white text-slate-700"
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-lg border bg-slate-50 px-2 py-2">
                  <div className="mb-1 flex items-center justify-between text-[0.7rem]">
                    <span className="font-semibold text-slate-700">
                      Subject(s)
                    </span>
                    <select
                      className="rounded-md border px-1 py-0.5 text-[0.65rem]"
                      value={slot.source}
                      onChange={(e) => updateField(i, "source", e.target.value)}
                    >
                      <option>Wellesley</option>
                      <option>MIT</option>
                      <option>Babson</option>
                      <option>Olin</option>
                      <option>StudyAbroad</option>
                      <option>Transfer</option>
                      <option>Other</option>
                    </select>
                  </div>

                  {slot.source === "Wellesley" ? (
                    <div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto pr-1">
                      {(() => {
                        const activeSet = new Set(slot.depts);
                        const sorted = [
                          ...slot.depts.filter(name => subjectOptions.includes(name)),
                          ...subjectOptions.filter(name => !activeSet.has(name)),
                        ];
                        return sorted.map(name => {
                          const active = slot.depts.includes(name);
                          return (
                            <button
                              key={name}
                              type="button"
                              onClick={() => toggleDept(i, name)}
                              className={cx(
                                "rounded-full border px-2 py-0.5 text-[0.65rem]",
                                active
                                  ? "border-sky-600 bg-sky-600 text-white"
                                  : "border-slate-300 bg-white text-slate-700"
                              )}
                            >
                              {name}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  ) : (
                    <input
                      className="mt-1 w-full rounded-lg border px-2 py-1 text-[0.7rem]"
                      placeholder="Dept / program (e.g. MIT EECS)"
                      value={slot.depts[0] || ""}
                      onChange={(e) => updateField(i, "depts", [e.target.value])}
                    />
                  )}
                </div>

                {programSelections.some(p => p.type !== "None" && p.value) && (
                  <div className="rounded-lg border bg-slate-50 px-2 py-2">
                    <div className="mb-1 text-[0.7rem] font-semibold text-slate-700">
                      Counts toward program(s)
                    </div>
                    <div className="space-y-2 text-[0.65rem]">
                      {programSelections.map(program => {
                        if (program.type === "None" || !program.value) return null;
                        const assigned = Boolean(slot.programs?.[program.id]);
                        const requirementOptions = programRequirementOptions[program.id] || [];
                        return (
                          <div key={program.id} className="rounded bg-white p-2">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={assigned}
                                onChange={() => toggleProgramAssignment(i, program.id)}
                                className="rounded"
                              />
                              <span className="flex-1 font-medium text-slate-700">
                                {program.label} • {program.value}
                              </span>
                            </label>
                            {assigned && requirementOptions.length > 0 && (
                              <select
                                className="mt-2 w-full rounded border px-2 py-1 text-[0.65rem]"
                                value={slot.programs?.[program.id]?.requirement || ""}
                                onChange={(e) => setProgramRequirement(i, program.id, e.target.value)}
                              >
                                <option value="">Select requirement</option>
                                {requirementOptions.map(opt => (
                                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <p className="mt-1 text-[0.6rem] text-slate-500">
                      Assign each course to the requirement it fulfills for that program.
                    </p>
                  </div>
                )}

                <div className="rounded-lg border bg-slate-50 px-2 py-2">
                  <div className="mb-1 text-[0.7rem] font-semibold text-slate-700">
                    Notes
                  </div>
                  <textarea
                    className="h-20 w-full rounded-lg border px-2 py-1 text-[0.7rem]"
                    placeholder="Optional notes about why you're taking this, cross-reg info, etc."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => {
              addSlot(term.id);
              markSaved();
            }}
            className="rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
          >
            + Add course
          </button>
        </div>
      </div>
    </div>
  );
}
