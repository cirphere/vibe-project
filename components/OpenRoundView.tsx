"use client";

import { useState } from "react";
import type { Candidate } from "@/types";
import RemainingTimer from "./RemainingTimer";

interface OpenRoundViewProps {
  closesAt: string | null;
  closesAtDisplay: string;
  candidates: Candidate[];
  myVoteCandidateId: string | null;
  userId: string | null;
  onPropose: (label: string) => Promise<void>;
  onVote: (candidateId: string) => Promise<void>;
  onClose: () => Promise<void>;
}

export default function OpenRoundView({
  closesAt,
  closesAtDisplay,
  candidates,
  myVoteCandidateId,
  userId,
  onPropose,
  onVote,
  onClose,
}: OpenRoundViewProps) {
  const [newMenuLabel, setNewMenuLabel] = useState("");
  const [proposing, setProposing] = useState(false);
  const [voting, setVoting] = useState(false);
  const [closing, setClosing] = useState(false);

  const handlePropose = async () => {
    const label = newMenuLabel.trim();
    if (!label || !userId || proposing) return;
    setProposing(true);
    try {
      await onPropose(label);
      setNewMenuLabel("");
    } finally {
      setProposing(false);
    }
  };

  const handleVote = async (candidateId: string) => {
    if (voting) return;
    setVoting(true);
    try {
      await onVote(candidateId);
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              투표 진행 중
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              마감 {closesAtDisplay}
              <RemainingTimer closesAt={closesAt} />
            </p>
          </div>
          <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">
            진행 중
          </span>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handlePropose();
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={newMenuLabel}
          onChange={(e) => setNewMenuLabel(e.target.value)}
          placeholder="메뉴를 제안해보세요"
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
        />
        <button
          type="submit"
          disabled={!newMenuLabel.trim() || proposing}
          className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 dark:focus:ring-offset-gray-950"
        >
          {proposing ? "제안 중…" : "제안"}
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {candidates.length === 0 ? (
          <li className="rounded-xl border border-dashed border-gray-300 py-12 text-center text-sm text-gray-400 dark:border-gray-600 dark:text-gray-500">
            아직 제안된 메뉴가 없습니다.
            <br />
            첫 번째 메뉴를 제안해보세요!
          </li>
        ) : (
          candidates.map((candidate) => {
            const voted = myVoteCandidateId === candidate.id;

            return (
              <li key={candidate.id}>
                <button
                  type="button"
                  disabled={voting}
                  onClick={() => handleVote(candidate.id)}
                  className={`flex w-full items-center justify-between rounded-xl border px-5 py-4 text-left transition-all ${
                    voted
                      ? "border-orange-400 bg-orange-50 ring-1 ring-orange-400 dark:border-orange-500 dark:bg-orange-950/30 dark:ring-orange-500"
                      : "border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-orange-700 dark:hover:bg-orange-950/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                        voted
                          ? "border-orange-500 bg-orange-500"
                          : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700"
                      }`}
                    >
                      {voted && (
                        <svg
                          viewBox="0 0 12 12"
                          className="h-3 w-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M2.5 6l2.5 2.5 4.5-5" />
                        </svg>
                      )}
                    </span>

                    <span
                      className={`text-base font-medium ${
                        voted
                          ? "text-orange-700 dark:text-orange-400"
                          : "text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      {candidate.label}
                    </span>

                    {voted && (
                      <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs font-semibold text-white">
                        내 투표
                      </span>
                    )}
                  </div>

                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      voted
                        ? "text-orange-600 dark:text-orange-400"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {candidate.voteCount}표
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>

      {candidates.length > 0 && (
        <button
          type="button"
          disabled={closing}
          onClick={async () => {
            if (closing) return;
            setClosing(true);
            try {
              await onClose();
            } finally {
              setClosing(false);
            }
          }}
          className="rounded-lg border-2 border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-600 transition-colors hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400 dark:hover:border-red-700 dark:hover:bg-red-950/50"
        >
          {closing ? "마감 중…" : "투표 마감하기"}
        </button>
      )}
    </div>
  );
}
