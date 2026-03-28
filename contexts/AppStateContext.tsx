"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { Team, Round, Candidate, MyVote } from "@/types";
import { createClient } from "@/lib/supabase/client";
import {
  initAppState,
  fetchRoundDetail,
  insertRound,
  insertCandidate,
  upsertVote,
} from "@/lib/supabase/queries";
import { closeRoundAction } from "@/app/actions/round";

interface AppState {
  team: Team | null;
  userId: string | null;
  loading: boolean;
  currentRound: Round | null;
  candidates: Candidate[];
  myVote: MyVote;
  createRound: (closesAt: string) => Promise<void>;
  addCandidate: (label: string, userId: string) => Promise<void>;
  vote: (candidateId: string) => Promise<void>;
  closeRound: () => Promise<void>;
  startNewRound: () => void;
}

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [team, setTeam] = useState<Team | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [myVote, setMyVote] = useState<MyVote>({
    candidateId: null,
    updatedAt: null,
  });

  const userIdRef = useRef<string | null>(null);
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) {
        if (!cancelled) setLoading(false);
        return;
      }
      setUserId(user.id);

      const appState = await initAppState(supabase);
      if (!appState || cancelled) {
        if (!cancelled) setLoading(false);
        return;
      }
      setTeam(appState.team);

      if (appState.currentRoundId && !cancelled) {
        const detail = await fetchRoundDetail(
          supabase,
          appState.currentRoundId,
          user.id,
        );
        if (detail && !cancelled) {
          setCurrentRound(detail.round);
          setCandidates(detail.candidates);
          setMyVote(detail.myVote);
        }
      }

      if (!cancelled) setLoading(false);
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!currentRound || currentRound.status !== "open") return;

    const supabase = createClient();
    const roundId = currentRound.id;

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
        (payload: { new: Record<string, string> }) => {
          const c = payload.new;
          setCandidates((prev) => {
            if (prev.some((p) => p.id === c.id)) return prev;
            return [
              ...prev,
              {
                id: c.id,
                roundId: c.round_id,
                label: c.label,
                proposedByUserId: c.proposed_by,
                voteCount: 0,
                createdAt: c.created_at,
              },
            ];
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

          const voteCounts = new Map<string, number>();
          let newMyVote: MyVote = { candidateId: null, updatedAt: null };

          for (const v of votesData ?? []) {
            voteCounts.set(
              v.candidate_id,
              (voteCounts.get(v.candidate_id) ?? 0) + 1,
            );
            if (v.user_id === uid) {
              newMyVote = {
                candidateId: v.candidate_id,
                updatedAt: v.updated_at,
              };
            }
          }

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
  }, [currentRound?.id, currentRound?.status]);

  const createRound = useCallback(
    async (closesAt: string) => {
      if (!team || !userId) return;
      const supabase = createClient();
      const newRound = await insertRound(supabase, team.id, closesAt, userId);
      if (newRound) {
        setCurrentRound(newRound);
        setCandidates([]);
        setMyVote({ candidateId: null, updatedAt: null });
      }
    },
    [team, userId],
  );

  const addCandidate = useCallback(
    async (label: string, proposedByUserId: string) => {
      if (!currentRound || currentRound.status !== "open") return;
      const supabase = createClient();
      const newCandidate = await insertCandidate(
        supabase,
        currentRound.id,
        label,
        proposedByUserId,
      );
      if (newCandidate) {
        setCandidates((prev) => [...prev, newCandidate]);
      }
    },
    [currentRound],
  );

  const vote = useCallback(
    async (candidateId: string) => {
      if (!currentRound || currentRound.status !== "open") return;
      if (!userId) return;
      if (myVote.candidateId === candidateId) return;

      const supabase = createClient();
      const result = await upsertVote(
        supabase,
        currentRound.id,
        userId,
        candidateId,
      );
      if (result) {
        const prevCandidateId = myVote.candidateId;
        setCandidates((prev) =>
          prev.map((c) => {
            if (c.id === prevCandidateId)
              return { ...c, voteCount: c.voteCount - 1 };
            if (c.id === candidateId)
              return { ...c, voteCount: c.voteCount + 1 };
            return c;
          }),
        );
        setMyVote(result);
      }
    },
    [currentRound, userId, myVote.candidateId],
  );

  const closeRound = useCallback(async () => {
    if (!currentRound || candidates.length === 0) return;

    const result = await closeRoundAction(currentRound.id);
    if ("error" in result) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[closeRound]", result.error);
      }
      return;
    }

    const updatedRound: Round = {
      ...currentRound,
      status: "closed",
      winner: {
        candidateId: result.winnerId,
        label: result.winnerLabel,
        voteCount: result.winnerVoteCount,
      },
    };
    setCurrentRound(updatedRound);
  }, [currentRound, candidates.length]);

  const startNewRound = useCallback(() => {
    setCurrentRound(null);
    setCandidates([]);
    setMyVote({ candidateId: null, updatedAt: null });
  }, []);

  const value = useMemo(
    () => ({
      team,
      userId,
      loading,
      currentRound,
      candidates,
      myVote,
      createRound,
      addCandidate,
      vote,
      closeRound,
      startNewRound,
    }),
    [
      team,
      userId,
      loading,
      currentRound,
      candidates,
      myVote,
      createRound,
      addCandidate,
      vote,
      closeRound,
      startNewRound,
    ],
  );

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
