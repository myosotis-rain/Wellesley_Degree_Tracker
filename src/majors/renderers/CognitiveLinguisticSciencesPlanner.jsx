import React from "react";
import { computeClscProgress } from "../progress.js";
import { MajorIntro } from "./shared.jsx";
import { cx } from "../../utils.js";

const StepRow = ({ step }) => (
  <div
    className={cx(
      "flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs",
      step.completed ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600"
    )}
  >
    <div>
      <div className="text-[0.6rem] uppercase tracking-wide">{step.label}</div>
      {step.fulfilledBy && <div className="text-[0.7rem] font-medium">{step.fulfilledBy}</div>}
    </div>
    <span className="text-[0.7rem] font-semibold">{step.completed ? "✓" : "Pending"}</span>
  </div>
);

export default function CognitiveLinguisticSciencesPlanner({ majorReq, courses }) {
  const progress = computeClscProgress(courses, majorReq.clscStructure || {});
  const concentrationCards = progress.concentrations || [];
  const bestConc = progress.bestConcentration || null;

  return (
    <div className="space-y-5">
      <MajorIntro majorReq={majorReq} />

      <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-2">
        <div className="text-sm font-semibold text-slate-900">Core requirements</div>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          {progress.foundation.map(step => (
            <StepRow key={step.id} step={step} />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-2">
        <div className="text-sm font-semibold text-slate-900">Concentration progress</div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {concentrationCards.map(conc => (
            <div key={conc.id} className={cx(
              "rounded border px-3 py-2 text-center",
              bestConc?.id === conc.id ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-slate-50"
            )}>
              <div className="text-[0.55rem] uppercase text-slate-500">{conc.label}</div>
              <div className="text-base font-semibold text-slate-900">
                {conc.count}/{progress.concentrationRequired}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[0.65rem] text-slate-500">
          Complete four electives in a single concentration (linguistics, psychology, computer science, or philosophy). A ninth course in another concentration is encouraged but optional.
        </p>
      </div>
    </div>
  );
}
