import React from "react";

const ProgramSelect = ({
  label,
  id,
  value,
  onChange,
  options,
  placeholder = "Select",
  disabled = false,
  className = "",
}) => (
  <div className={`flex min-w-0 items-center gap-1.5 ${className}`}>
    {label && (
      <label
        className="flex-none whitespace-nowrap text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500"
        htmlFor={id}
      >
        {label}
      </label>
    )}
    <select
      id={id}
      name={id}
      autoComplete="off"
      className="min-w-0 flex-1 rounded border px-2 py-1 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      <option value="">{placeholder}</option>
      {options.map(option => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  </div>
);

export default function PlanProgramControls({
  startYear,
  onStartYearChange,
  onConfirmStartYear,
  primaryMajor,
  onPrimaryMajorChange,
  majorOptions,
  secondaryMode,
  onSecondaryModeChange,
  secondaryMajor,
  onSecondaryMajorChange,
  selectedMinor,
  onSelectedMinorChange,
  minorOptions,
}) {
  return (
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
          onChange={(e) => onStartYearChange(parseInt(e.target.value, 10))}
          className="w-20 rounded border px-2 py-1"
          min="2020"
          max="2030"
        />
        <button
          type="button"
          onClick={onConfirmStartYear}
          className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50"
        >
          Confirm
        </button>
      </div>
      <div className="mt-3 flex flex-nowrap items-center gap-3 overflow-hidden">
        <ProgramSelect
          label="Program 1"
          id="program-1-select"
          value={primaryMajor}
          onChange={onPrimaryMajorChange}
          options={majorOptions}
          className="flex-1"
        />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <label
            className="flex-none whitespace-nowrap text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500"
            htmlFor="program-2-mode"
          >
            Program 2
          </label>
          <select
            id="program-2-mode"
            name="program2Mode"
            autoComplete="off"
            className="w-20 flex-none rounded border px-2 py-1 text-sm"
            value={secondaryMode}
            onChange={(e) => onSecondaryModeChange(e.target.value)}
          >
            <option value="None">None</option>
            <option value="Major">Major</option>
            <option value="Minor">Minor</option>
          </select>
          {secondaryMode !== "None" && (
            <ProgramSelect
              label=""
              id="program-2-select"
              value={secondaryMode === "Major" ? secondaryMajor : selectedMinor}
              onChange={secondaryMode === "Major" ? onSecondaryMajorChange : onSelectedMinorChange}
              options={secondaryMode === "Major" ? majorOptions : minorOptions}
              placeholder="Select"
              className="flex-1"
            />
          )}
        </div>
      </div>
    </div>
  );
}
