import React from "react";

export const MajorSelect = ({
  value,
  onChange,
  options = [],
  placeholder = "Select a major",
  name = "majorSelect",
}) => (
  <select
    name={name}
    autoComplete="off"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="rounded border px-3 py-1 text-sm"
  >
    <option value="">{placeholder}</option>
    {options.map(option => (
      <option key={option.value} value={option.value}>{option.label}</option>
    ))}
  </select>
);

export const MinorSelect = ({
  value,
  onChange,
  options = [],
  placeholder = "Select a minor",
  name = "minorSelect",
}) => (
  <select
    name={name}
    autoComplete="off"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="rounded border px-3 py-1 text-sm"
  >
    <option value="">{placeholder}</option>
    {options.map(option => (
      <option key={option.value} value={option.value}>{option.label}</option>
    ))}
  </select>
);
