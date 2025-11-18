import React from "react";
import { cx } from "../../utils.js";
import { computeBioProgress } from "../progress.js";
import { MajorIntro } from "./shared.jsx";

export default function BioMajorPlanner({ majorReq, courses }) {
  const progress = computeBioProgress(courses, majorReq.bioStructure);
  const groupCompletion = [progress.groupCell, progress.groupSystems, progress.groupCommunity].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <MajorIntro majorReq={majorReq} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Introductory Tier</div>
          <div className="space-y-2 text-xs">
            <div className={cx(
              "flex items-center justify-between rounded border px-2 py-1",
              progress.introCompleted >= 1 ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600"
            )}>
              <span>First BISC course</span>
              <span className="font-semibold">{progress.introCompleted >= 1 ? "✓" : "Pending"}</span>
            </div>
            <div className={cx(
              "flex items-center justify-between rounded border px-2 py-1",
              progress.introCompleted >= 2 ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600"
            )}>
              <span>Second BISC course</span>
              <span className="font-semibold">{progress.introCompleted >= 2 ? "✓" : "Pending"}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Breadth Groups</div>
          <div className="space-y-2 text-xs">
            {[
              { label: "Cell & Molecular", completed: progress.groupCell },
              { label: "Organismal/Systems", completed: progress.groupSystems },
              { label: "Ecology/Community", completed: progress.groupCommunity },
            ].map(item => (
              <div
                key={item.label}
                className={cx(
                  "flex items-center justify-between rounded border px-2 py-1",
                  item.completed ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600"
                )}
              >
                <span>{item.label}</span>
                <span className="font-semibold">{item.completed ? "✓" : "Pending"}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-slate-500">{groupCompletion}/3 groups complete</div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Mid-level & Labs</div>
          <div className="space-y-2 text-xs">
            <div className="rounded bg-slate-50 px-3 py-2 flex items-center justify-between">
              <div>
                <div className="text-[0.55rem] uppercase text-slate-500">Mid-level courses</div>
                <div>Progress toward advanced electives</div>
              </div>
              <div className="text-base font-semibold text-slate-900">{progress.midLevelCount}</div>
            </div>
            <div className="rounded bg-slate-50 px-3 py-2 flex items-center justify-between">
              <div>
                <div className="text-[0.55rem] uppercase text-slate-500">Lab experiences</div>
                <div>Hands-on requirements</div>
              </div>
              <div className="text-base font-semibold text-slate-900">{progress.labCount}</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Capstone</div>
          <div className="rounded bg-slate-50 px-3 py-2 text-center">
            <div className="text-[0.55rem] uppercase text-slate-500">Advanced seminar</div>
            <div className="text-base font-semibold text-slate-900">{progress.capstoneCount}/1</div>
          </div>
        </div>
      </div>
    </div>
  );
}
