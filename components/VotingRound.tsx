"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppState } from "@/contexts/AppStateContext";

export default function VotingRound() {
  const {
    currentRound: round,
    candidates,
    myVote,
    userId,
    addCandidate,
    vote,
    closeRound,
    startNewRound,
  } = useAppState();

  const [newMenuLabel, setNewMenuLabel] = useState("");
  const [remainingText, setRemainingText] = useState("");
  const [proposing, setProposing] = useState(false);
  const [voting, setVoting] = useState(false);
  const [closing, setClosing] = useState(false);

  const isClosed = round?.status === "closed";
  const winnerCandidate =
    isClosed && round?.winner
      ? candidates.find((c) => c.id === round.winner!.candidateId) ?? null
      : null;

  const computeRemaining = useCallback(() => {
    if (!round?.closesAt) return "";
    const diff = new Date(round.closesAt).getTime() - Date.now();
    if (diff <= 0) return "마감 시간 경과";
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1_000);
    if (h > 0) return `${h}시간 ${m}분 ${s}초 남음`;
    if (m > 0) return `${m}분 ${s}초 남음`;
    return `${s}초 남음`;
  }, [round?.closesAt]);

  useEffect(() => {
    if (isClosed) return;
    setRemainingText(computeRemaining());
    const id = setInterval(() => setRemainingText(computeRemaining()), 1_000);
    return () => clearInterval(id);
  }, [computeRemaining, isClosed]);

  if (!round) return null;

  const closesAtDisplay = round.closesAt
    ? new Date(round.closesAt).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const handlePropose = async () => {
    const label = newMenuLabel.trim();
    if (!label || !userId || proposing) return;
    setProposing(true);
    try {
      await addCandidate(label, userId);
      setNewMenuLabel("");
    } finally {
      setProposing(false);
    }
  };

  const handleVote = async (candidateId: string) => {
    if (voting) return;
    setVoting(true);
    try {
      await vote(candidateId);
    } finally {
      setVoting(false);
    }
  };

  const sortedCandidates = [...candidates].sort((a, b) => {
    if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  if (isClosed) {
    return (
      <div className="flex flex-1 flex-col gap-5">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">투표 마감</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                마감 {closesAtDisplay}
              </p>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              마감
            </span>
          </div>
        </div>

        {winnerCandidate && (
          <div className="rounded-xl border-2 border-orange-400 bg-gradient-to-br from-orange-50 to-amber-50 p-6 text-center shadow-sm dark:border-orange-500 dark:from-orange-950/40 dark:to-amber-950/30">
            <div className="mb-2 text-4xl">🏆</div>
            <p className="mb-1 text-sm font-medium text-orange-600 dark:text-orange-400">
              오늘의 메뉴
            </p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {winnerCandidate.label}
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {winnerCandidate.voteCount}표로 선정
            </p>
          </div>
        )}

        <div>
          <h4 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">전체 결과</h4>
          <ul className="flex flex-col gap-2">
            {sortedCandidates.map((candidate, idx) => {
              const isWinner = candidate.id === winnerCandidate?.id;
              const voted = myVote.candidateId === candidate.id;

              return (
                <li
                  key={candidate.id}
                  className={`flex items-center justify-between rounded-xl border px-5 py-4 ${
                    isWinner
                      ? "border-orange-300 bg-orange-50 dark:border-orange-600 dark:bg-orange-950/30"
                      : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        isWinner
                          ? "bg-orange-500 text-white"
                          : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span
                      className={`text-base font-medium ${
                        isWinner ? "text-orange-700 dark:text-orange-400" : "text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      {candidate.label}
                    </span>
                    {isWinner && (
                      <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs font-semibold text-white">
                        선정
                      </span>
                    )}
                    {voted && (
                      <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                        내 투표
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      isWinner ? "text-orange-600 dark:text-orange-400" : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {candidate.voteCount}표
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            * 동점 시 먼저 제안된 후보가 선정됩니다.
          </p>
        </div>

        <button
          type="button"
          onClick={startNewRound}
          className="mt-2 rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          새 라운드 시작하기
        </button>
      </div>
    );
  }

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
              {remainingText && (
                <>
                  {" · "}
                  <span className="font-medium text-orange-600 dark:text-orange-400">
                    {remainingText}
                  </span>
                </>
              )}
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
            const voted = myVote.candidateId === candidate.id;

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
                        voted ? "text-orange-700 dark:text-orange-400" : "text-gray-900 dark:text-gray-100"
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
                      voted ? "text-orange-600 dark:text-orange-400" : "text-gray-500 dark:text-gray-400"
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
              await closeRound();
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
