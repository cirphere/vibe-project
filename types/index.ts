export interface Team {
  id: string;
  name: string;
}

export type RoundStatus = "open" | "closed";

export interface RoundWinner {
  candidateId: string;
  label: string;
  voteCount: number;
}

export interface Round {
  id: string;
  teamId: string;
  status: RoundStatus;
  closesAt: string | null;
  winner: RoundWinner | null;
}

export interface Candidate {
  id: string;
  roundId: string;
  label: string;
  proposedByUserId: string;
  voteCount: number;
  createdAt: string;
}

export interface MyVote {
  candidateId: string | null;
  updatedAt: string | null;
}

export interface HistoryItem {
  roundId: string;
  decidedAt: string;
  menuLabel: string;
  voteCount: number;
}

// --- DB row types ---

export interface CandidateRow {
  id: string;
  round_id: string;
  label: string;
  proposed_by: string;
  created_at: string;
}

export interface VoteRow {
  candidate_id: string;
  user_id: string;
  updated_at: string;
}

// --- RPC response types ---

export interface RpcVoteCount {
  candidate_id: string;
  vote_count: number;
}

export interface RpcInitAppState {
  team_id: string;
  team_name: string;
  current_round_id: string | null;
}

// --- Action result types ---

export interface CloseRoundSuccess {
  winnerId: string;
  winnerLabel: string;
  winnerVoteCount: number;
}

export type CloseRoundResult = CloseRoundSuccess | { error: string };

export type LoginResult = { success: true } | { error: string };

export type SignupResult = { success: string } | { error: string };
