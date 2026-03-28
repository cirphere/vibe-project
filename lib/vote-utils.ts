import type {
  Candidate,
  CandidateRow,
  MyVote,
  RpcVoteCount,
  RoundStatus,
  VoteRow,
} from "@/types";

export interface VoteSummary {
  voteCounts: Map<string, number>;
  myVote: MyVote;
}

export function buildVoteSummary(
  votes: VoteRow[],
  userId?: string | null,
): VoteSummary {
  const voteCounts = new Map<string, number>();
  let myVote: MyVote = { candidateId: null, updatedAt: null };

  for (const v of votes) {
    voteCounts.set(v.candidate_id, (voteCounts.get(v.candidate_id) ?? 0) + 1);
    if (userId && v.user_id === userId) {
      myVote = { candidateId: v.candidate_id, updatedAt: v.updated_at };
    }
  }

  return { voteCounts, myVote };
}

export function buildVoteCountMap(data: RpcVoteCount[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const vc of data) {
    map.set(vc.candidate_id, Number(vc.vote_count));
  }
  return map;
}

export function toCandidateModel(
  row: CandidateRow,
  voteCount = 0,
): Candidate {
  return {
    id: row.id,
    roundId: row.round_id,
    label: row.label,
    proposedByUserId: row.proposed_by,
    voteCount,
    createdAt: row.created_at,
  };
}

export function parseRoundStatus(status: string): RoundStatus {
  if (status === "open" || status === "closed") return status;
  throw new Error(`Invalid round status: ${status}`);
}
