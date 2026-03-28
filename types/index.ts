export interface Team {
  id: string;
  name: string;
}

export interface RoundWinner {
  candidateId: string;
  label: string;
  voteCount: number;
}

export interface Round {
  id: string;
  teamId: string;
  status: "open" | "closed";
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

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  createdAt: string;
}
