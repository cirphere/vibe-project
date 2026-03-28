import type { Candidate } from "@/types";

interface ClosedRoundViewProps {
  closesAtDisplay: string;
  winnerCandidate: Candidate | null;
  sortedCandidates: Candidate[];
  myVoteCandidateId: string | null;
  onStartNewRound: () => void;
}

export default function ClosedRoundView({
  closesAtDisplay,
  winnerCandidate,
  sortedCandidates,
  myVoteCandidateId,
  onStartNewRound,
}: ClosedRoundViewProps) {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              투표 마감
            </h2>
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
        <h4 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
          전체 결과
        </h4>
        <ul className="flex flex-col gap-2">
          {sortedCandidates.map((candidate, idx) => {
            const isWinner = candidate.id === winnerCandidate?.id;
            const voted = myVoteCandidateId === candidate.id;

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
                      isWinner
                        ? "text-orange-700 dark:text-orange-400"
                        : "text-gray-900 dark:text-gray-100"
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
                    isWinner
                      ? "text-orange-600 dark:text-orange-400"
                      : "text-gray-500 dark:text-gray-400"
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
        onClick={onStartNewRound}
        className="mt-2 rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        새 라운드 시작하기
      </button>
    </div>
  );
}
