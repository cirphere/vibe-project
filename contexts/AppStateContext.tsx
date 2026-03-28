"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import type { Team, Round, Candidate, MyVote, CloseRoundResult } from "@/types";
import { createClient } from "@/lib/supabase/client";
import {
  initAppState,
  fetchRoundDetail,
  insertRound,
  insertCandidate,
  upsertVote,
} from "@/lib/supabase/queries";
import { closeRoundAction } from "@/app/actions/round";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

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

const EMPTY_VOTE: MyVote = { candidateId: null, updatedAt: null };

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [team, setTeam] = useState<Team | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [myVote, setMyVote] = useState<MyVote>(EMPTY_VOTE);

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

  useRealtimeSync({
    roundId: currentRound?.id,
    roundStatus: currentRound?.status,
    userId,
    setCandidates,
    setMyVote,
  });

  const createRoundFn = useCallback(
    async (closesAt: string) => {
      if (!team || !userId) return;
      const supabase = createClient();
      const newRound = await insertRound(supabase, team.id, closesAt, userId);
      if (newRound) {
        setCurrentRound(newRound);
        setCandidates([]);
        setMyVote(EMPTY_VOTE);
      }
    },
    [team, userId],
  );

  const addCandidateFn = useCallback(
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

  const voteFn = useCallback(
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

  const closeRoundFn = useCallback(async () => {
    if (!currentRound || candidates.length === 0) return;

    const result: CloseRoundResult = await closeRoundAction(currentRound.id);
    if ("error" in result) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[closeRound]", result.error);
      }
      return;
    }

    setCurrentRound({
      ...currentRound,
      status: "closed",
      winner: {
        candidateId: result.winnerId,
        label: result.winnerLabel,
        voteCount: result.winnerVoteCount,
      },
    });
  }, [currentRound, candidates.length]);

  const startNewRound = useCallback(() => {
    setCurrentRound(null);
    setCandidates([]);
    setMyVote(EMPTY_VOTE);
  }, []);

  const value = useMemo(
    () => ({
      team,
      userId,
      loading,
      currentRound,
      candidates,
      myVote,
      createRound: createRoundFn,
      addCandidate: addCandidateFn,
      vote: voteFn,
      closeRound: closeRoundFn,
      startNewRound,
    }),
    [
      team,
      userId,
      loading,
      currentRound,
      candidates,
      myVote,
      createRoundFn,
      addCandidateFn,
      voteFn,
      closeRoundFn,
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
