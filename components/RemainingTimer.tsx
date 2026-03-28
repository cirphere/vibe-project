"use client";

import { useState, useEffect } from "react";

export default function RemainingTimer({
  closesAt,
}: {
  closesAt: string | null;
}) {
  const [text, setText] = useState("");

  useEffect(() => {
    if (!closesAt) return;

    function compute() {
      const diff = new Date(closesAt!).getTime() - Date.now();
      if (diff <= 0) return "마감 시간 경과";
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      if (h > 0) return `${h}시간 ${m}분 ${s}초 남음`;
      if (m > 0) return `${m}분 ${s}초 남음`;
      return `${s}초 남음`;
    }

    setText(compute());
    const id = setInterval(() => setText(compute()), 1_000);
    return () => clearInterval(id);
  }, [closesAt]);

  if (!text) return null;
  return (
    <>
      {" · "}
      <span className="font-medium text-orange-600 dark:text-orange-400">
        {text}
      </span>
    </>
  );
}
