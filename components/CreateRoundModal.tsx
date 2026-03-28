"use client";

import { useState } from "react";

interface CreateRoundModalProps {
  onConfirm: (closesAt: string) => void;
  onCancel: () => void;
}

function getDefaultTime(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1);
  d.setMinutes(d.getMinutes() >= 30 ? 30 : 0, 0, 0);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function CreateRoundModal({
  onConfirm,
  onCancel,
}: CreateRoundModalProps) {
  const [time, setTime] = useState(getDefaultTime);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const [hours, minutes] = time.split(":").map(Number);
    const closesAt = new Date();
    closesAt.setHours(hours, minutes, 0, 0);
    if (closesAt.getTime() <= Date.now()) {
      closesAt.setDate(closesAt.getDate() + 1);
    }
    onConfirm(closesAt.toISOString());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          새 라운드 열기
        </h3>

        <form onSubmit={handleSubmit}>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            마감 시각
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            투표가 마감될 시각을 선택하세요
          </p>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              취소
            </button>
            <button
              type="submit"
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              열기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
