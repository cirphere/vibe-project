"use client";

import { useEffect, useRef } from "react";
import type { Candidate, CandidateRow, MyVote, VoteRow } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { buildVoteSummary, toCandidateModel } from "@/lib/vote-utils";

interface UseRealtimeSyncParams {
  roundId: string | undefined;
  roundStatus: string | undefined;
  userId: string | null;
  setCandidates: React.Dispatch<React.SetStateAction<Candidate[]>>;
  setMyVote: React.Dispatch<React.SetStateAction<MyVote>>;
}

export function useRealtimeSync({
  roundId,
  roundStatus,
  userId,
  setCandidates,
  setMyVote,
}: UseRealtimeSyncParams) {
  const userIdRef = useRef<string | null>(null);
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    if (!roundId || roundStatus !== "open") return;

    const supabase = createClient();

    const channel = supabase
      .channel(`round-${roundId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "candidates",
          filter: `round_id=eq.${roundId}`,
        },
        (payload: { new: CandidateRow }) => {
          const row = payload.new;
          setCandidates((prev) => {
            if (prev.some((p) => p.id === row.id)) return prev;
            return [...prev, toCandidateModel(row)];
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "votes",
          filter: `round_id=eq.${roundId}`,
        },
        async () => {
          const uid = userIdRef.current;
          if (!uid) return;

          const { data: votesData } = await supabase
            .from("votes")
            .select("candidate_id, user_id, updated_at")
            .eq("round_id", roundId);

          const { voteCounts, myVote: newMyVote } = buildVoteSummary(
            (votesData ?? []) as VoteRow[],
            uid,
          );

          setCandidates((prev) =>
            prev.map((c) => ({
              ...c,
              voteCount: voteCounts.get(c.id) ?? 0,
            })),
          );
          setMyVote(newMyVote);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roundId, roundStatus, setCandidates, setMyVote]);
}
