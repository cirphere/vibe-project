"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { Team, Round, Candidate, MyVote, HistoryItem } from "@/types";
import { createClient } from "@/lib/supabase/client";
import {
  fetchMyTeam,
  fetchCurrentRoundId,
  fetchRoundDetail,
  fetchHistory,
  insertRound,
  insertCandidate,
  upsertVote,
  closeRound as closeRoundInDb,
} from "@/lib/supabase/queries";

interface AppState {
  team: Team | null;
  userId: string | null;
  loading: boolean;
  currentRound: Round | null;
  candidates: Candidate[];
  myVote: MyVote;
  history: HistoryItem[];
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
  const [history, setHistory] = useState<HistoryItem[]>([]);

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

      const myTeam = await fetchMyTeam(supabase);
      if (!myTeam || cancelled) {
        if (!cancelled) setLoading(false);
        return;
      }
      setTeam(myTeam);

      const [roundId, historyItems] = await Promise.all([
        fetchCurrentRoundId(supabase, myTeam.id),
        fetchHistory(supabase, myTeam.id),
      ]);

      if (!cancelled) setHistory(historyItems);

      if (roundId && !cancelled) {
        const detail = await fetchRoundDetail(supabase, roundId, user.id);
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

  const createRound = useCallback(
    async (closesAt: string) => {
      if (!team) return;
      const supabase = createClient();
      const newRound = await insertRound(supabase, team.id, closesAt);
      if (newRound) {
        setCurrentRound(newRound);
        setCandidates([]);
        setMyVote({ candidateId: null, updatedAt: null });
      }
    },
    [team],
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

    const supabase = createClient();
    const result = await closeRoundInDb(supabase, currentRound.id);
    if (!result) return;

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

    const historyItem: HistoryItem = {
      roundId: currentRound.id,
      decidedAt: new Date().toISOString(),
      menuLabel: result.winnerLabel,
      voteCount: result.winnerVoteCount,
    };
    setHistory((prev) => [historyItem, ...prev]);
  }, [currentRound, candidates]);

  const startNewRound = useCallback(() => {
    setCurrentRound(null);
    setCandidates([]);
    setMyVote({ candidateId: null, updatedAt: null });
  }, []);

  return (
    <AppStateContext.Provider
      value={{
        team,
        userId,
        loading,
        currentRound,
        candidates,
        myVote,
        history,
        createRound,
        addCandidate,
        vote,
        closeRound,
        startNewRound,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
