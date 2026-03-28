import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { initAppState, fetchHistory } from "@/lib/supabase/queries";
import type { HistoryItem } from "@/types";

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  return `${month}월 ${day}일 (${weekday})`;
}

function HistoryCard({ item }: { item: HistoryItem }) {
  return (
    <li className="flex items-center justify-between rounded-xl bg-white px-5 py-4 shadow-sm ring-1 ring-gray-100 transition-shadow hover:shadow-md dark:bg-gray-800 dark:ring-gray-700">
      <div className="flex items-center gap-4">
        <span className="text-2xl">🍴</span>
        <div>
          <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {item.menuLabel}
          </p>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {formatDate(item.decidedAt)}
          </p>
        </div>
      </div>
      <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-sm font-medium text-orange-600 dark:bg-orange-900/40 dark:text-orange-300">
        👍 {item.voteCount}표
      </span>
    </li>
  );
}

function EmptyHistory() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2">
      <div className="mb-2 text-6xl">📋</div>
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
        아직 이력이 없습니다
      </h2>
      <p className="text-gray-500 dark:text-gray-400">투표가 완료되면 여기에 기록됩니다.</p>
    </div>
  );
}

export default async function HistoryPage() {
  const supabase = await createClient();
  const appState = await initAppState(supabase);
  if (!appState) redirect("/login");

  const history = await fetchHistory(supabase, appState.team.id);

  if (history.length === 0) {
    return <EmptyHistory />;
  }

  return (
    <section>
      <h1 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">최근 확정 메뉴</h1>
      <ul className="flex flex-col gap-3">
        {history.map((item) => (
          <HistoryCard key={item.roundId} item={item} />
        ))}
      </ul>
    </section>
  );
}
