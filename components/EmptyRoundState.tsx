interface EmptyRoundStateProps {
  onOpenRound: () => void;
}

export default function EmptyRoundState({ onOpenRound }: EmptyRoundStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <div className="text-center">
        <div className="mb-4 text-6xl">🍽️</div>
        <h2 className="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-100">
          진행 중인 투표가 없습니다
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          라운드를 열어 팀원들과 오늘의 메뉴를 정해보세요!
        </p>
      </div>
      <button
        onClick={onOpenRound}
        className="rounded-lg bg-orange-500 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
      >
        라운드 열기
      </button>
    </div>
  );
}
