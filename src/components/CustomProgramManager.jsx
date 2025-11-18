import React, { useMemo } from "react";
import { cx } from "../utils.js";
import { MinorSelect } from "./ProgramSelects.jsx";

export function CustomMajorManager({
  displayLabel,
  majorValue,
  onMajorChange,
  customMajorRequirements,
  onRequirementChange,
  onAddRequirement,
  customMajors,
  newCustomMajorName,
  onCustomMajorNameChange,
  onAddCustomMajor,
  editingCustomMajorId,
  editingCustomMajorName,
  onEditingCustomMajorNameChange,
  onStartEditing,
  onCancelEditing,
  onSaveEditing,
  onRemoveCustomMajor,
  maxRequirements,
}) {
  const trimmedName = newCustomMajorName.trim();
  const nameExists = useMemo(
    () => !!trimmedName && customMajors.some(item => item.name.toLowerCase() === trimmedName.toLowerCase()),
    [trimmedName, customMajors]
  );
  const canAddRow = customMajorRequirements.length < maxRequirements;
  const canSaveCustomMajor = !!trimmedName && !nameExists;
  const isBaseSelection = majorValue === "Custom Major";

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
            onChange={(e) => onCustomMajorNameChange(e.target.value)}
            placeholder="Name your custom major"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            maxLength={60}
          />
          <button
            type="button"
            onClick={onAddCustomMajor}
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
                        onChange={(e) => onEditingCustomMajorNameChange(e.target.value)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs font-normal text-slate-800"
                        maxLength={60}
                      />
                      <button
                        type="button"
                        onClick={onSaveEditing}
                        className="rounded border border-green-300 px-2 py-0.5 text-[0.65rem] font-semibold text-green-700 hover:bg-green-50"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={onCancelEditing}
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
                        onClick={() => onStartEditing(major)}
                        className="text-slate-400 transition hover:text-indigo-500"
                        aria-label={`Edit ${major.name}`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveCustomMajor(major.id)}
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

      {isBaseSelection ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white/80 px-3 py-3 text-[0.75rem] text-slate-600">
          <div className="text-[0.6rem] font-semibold uppercase tracking-wide text-slate-500">
            Select a named custom major
          </div>
          <p className="mt-1 leading-snug">
            Use the field above to add a custom major, then pick that named entry from the major dropdown at the top of this card to enter requirement rows. The default placeholder will stay blank until you switch.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {customMajorRequirements.map((req, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-6 text-right text-xs text-slate-500">{idx + 1}.</span>
                <input
                  name={`customMajorRequirement-${idx}`}
                  type="text"
                  value={req}
                  onChange={(e) => onRequirementChange(idx, e.target.value)}
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
              onClick={onAddRequirement}
              disabled={!canAddRow}
              className={cx(
                "rounded-full px-4 py-1.5 text-sm font-medium",
                canAddRow ? "border border-slate-300 text-slate-700 hover:bg-slate-50" : "border border-slate-200 text-slate-400 cursor-not-allowed"
              )}
            >
              {canAddRow ? "Add requirement" : `Max ${maxRequirements} rows reached`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function CustomMinorManager({
  displayLabel,
  minorValue,
  onMinorChange,
  minorOptions,
  customMinorRequirements,
  onRequirementChange,
  onAddRequirement,
  customMinors,
  newCustomMinorName,
  onCustomMinorNameChange,
  onAddCustomMinor,
  editingCustomMinorId,
  editingCustomMinorName,
  onEditingCustomMinorNameChange,
  onStartEditing,
  onCancelEditing,
  onSaveEditing,
  onRemoveCustomMinor,
  maxRequirements,
}) {
  const trimmedName = newCustomMinorName.trim();
  const nameExists = useMemo(
    () => !!trimmedName && customMinors.some(item => item.name.toLowerCase() === trimmedName.toLowerCase()),
    [trimmedName, customMinors]
  );
  const canAddRow = customMinorRequirements.length < maxRequirements;
  const canSaveCustomMinor = !!trimmedName && !nameExists;
  const isBaseSelection = minorValue === "Custom Minor";

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-2xl border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900">{displayLabel}</div>
          <MinorSelect value={minorValue} onChange={onMinorChange} options={minorOptions} />
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
              onChange={(e) => onCustomMinorNameChange(e.target.value)}
              placeholder="Name your custom minor"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              maxLength={60}
            />
            <button
              type="button"
              onClick={onAddCustomMinor}
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
                          onChange={(e) => onEditingCustomMinorNameChange(e.target.value)}
                          className="rounded border border-slate-300 px-2 py-1 text-xs font-normal text-slate-800"
                          maxLength={60}
                        />
                        <button
                          type="button"
                          onClick={onSaveEditing}
                          className="rounded border border-green-300 px-2 py-0.5 text-[0.65rem] font-semibold text-green-700 hover:bg-green-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={onCancelEditing}
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
                          onClick={() => onStartEditing(minor)}
                          className="text-slate-400 transition hover:text-indigo-500"
                          aria-label={`Edit ${minor.name}`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveCustomMinor(minor.id)}
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

        {isBaseSelection ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-3 text-[0.75rem] text-slate-600">
            <div className="text-[0.6rem] font-semibold uppercase tracking-wide text-slate-500">
              Select a named custom minor
            </div>
            <p className="mt-1 leading-snug">
              Once you add a custom minor, pick it from the dropdown above (instead of the default placeholder) to enter requirement rows and keep everything organized.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-4 space-y-2">
              {customMinorRequirements.map((req, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-6 text-right text-xs text-slate-500">{idx + 1}.</span>
                  <input
                    name={`customMinorRequirement-${idx}`}
                    type="text"
                    value={req}
                    onChange={(e) => onRequirementChange(idx, e.target.value)}
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
                onClick={onAddRequirement}
                disabled={!canAddRow}
                className={cx(
                  "rounded-full px-4 py-1.5 text-sm font-medium",
                  canAddRow ? "border border-slate-300 text-slate-700 hover:bg-slate-50" : "border border-slate-200 text-slate-400 cursor-not-allowed"
                )}
              >
                {canAddRow ? "Add requirement" : `Max ${maxRequirements} rows reached`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
