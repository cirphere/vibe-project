"use client";

import { useMemo } from "react";
import { useAppState } from "@/contexts/AppStateContext";
import ClosedRoundView from "./ClosedRoundView";
import OpenRoundView from "./OpenRoundView";

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

  const isClosed = round?.status === "closed";

  const closesAtDisplay = useMemo(
    () =>
      round?.closesAt
        ? new Date(round.closesAt).toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—",
    [round?.closesAt],
  );

  const sortedCandidates = useMemo(
    () =>
      [...candidates].sort((a, b) => {
        if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      }),
    [candidates],
  );

  const winnerCandidate = useMemo(
    () =>
      isClosed && round?.winner
        ? candidates.find((c) => c.id === round.winner!.candidateId) ?? null
        : null,
    [isClosed, round?.winner, candidates],
  );

  if (!round) return null;

  if (isClosed) {
    return (
      <ClosedRoundView
        closesAtDisplay={closesAtDisplay}
        winnerCandidate={winnerCandidate}
        sortedCandidates={sortedCandidates}
        myVoteCandidateId={myVote.candidateId}
        onStartNewRound={startNewRound}
      />
    );
  }

  return (
    <OpenRoundView
      closesAt={round.closesAt}
      closesAtDisplay={closesAtDisplay}
      candidates={candidates}
      myVoteCandidateId={myVote.candidateId}
      userId={userId}
      onPropose={async (label) => {
        if (userId) await addCandidate(label, userId);
      }}
      onVote={vote}
      onClose={closeRound}
    />
  );
}
