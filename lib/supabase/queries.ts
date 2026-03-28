import type { SupabaseClient } from "@supabase/supabase-js";
import type { Candidate, HistoryItem, MyVote, Round, Team } from "@/types";

export async function fetchMyTeam(
  supabase: SupabaseClient,
): Promise<Team | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) return null;

  const { data: team } = await supabase
    .from("teams")
    .select("id, name")
    .eq("id", membership.team_id)
    .single();

  if (!team) return null;
  return { id: team.id, name: team.name };
}

export async function fetchCurrentRoundId(
  supabase: SupabaseClient,
  teamId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("rounds")
    .select("id")
    .eq("team_id", teamId)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

export async function fetchRoundDetail(
  supabase: SupabaseClient,
  roundId: string,
  userId: string,
): Promise<{ round: Round; candidates: Candidate[]; myVote: MyVote } | null> {
  const { data: roundData, error: roundError } = await supabase
    .from("rounds")
    .select("id, team_id, status, closes_at, winner_candidate_id")
    .eq("id", roundId)
    .single();

  if (roundError || !roundData) return null;

  const { data: candidatesData } = await supabase
    .from("candidates")
    .select("id, round_id, label, proposed_by, created_at")
    .eq("round_id", roundId)
    .order("created_at", { ascending: true });

  const { data: votesData } = await supabase
    .from("votes")
    .select("candidate_id, user_id, updated_at")
    .eq("round_id", roundId);

  const voteCounts = new Map<string, number>();
  let myVote: MyVote = { candidateId: null, updatedAt: null };

  for (const v of votesData ?? []) {
    voteCounts.set(v.candidate_id, (voteCounts.get(v.candidate_id) ?? 0) + 1);
    if (v.user_id === userId) {
      myVote = { candidateId: v.candidate_id, updatedAt: v.updated_at };
    }
  }

  const candidates: Candidate[] = (candidatesData ?? []).map((c) => ({
    id: c.id,
    roundId: c.round_id,
    label: c.label,
    proposedByUserId: c.proposed_by,
    voteCount: voteCounts.get(c.id) ?? 0,
    createdAt: c.created_at,
  }));

  let winner: Round["winner"] = null;
  if (roundData.status === "closed" && roundData.winner_candidate_id) {
    const winnerCandidate = candidates.find(
      (c) => c.id === roundData.winner_candidate_id,
    );
    if (winnerCandidate) {
      winner = {
        candidateId: winnerCandidate.id,
        label: winnerCandidate.label,
        voteCount: winnerCandidate.voteCount,
      };
    }
  }

  const round: Round = {
    id: roundData.id,
    teamId: roundData.team_id,
    status: roundData.status as "open" | "closed",
    closesAt: roundData.closes_at,
    winner,
  };

  return { round, candidates, myVote };
}

export async function insertRound(
  supabase: SupabaseClient,
  teamId: string,
  closesAt: string,
): Promise<Round | null> {
  const { data, error } = await supabase
    .from("rounds")
    .insert({ team_id: teamId, closes_at: closesAt, status: "open" })
    .select("id, team_id, status, closes_at")
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    teamId: data.team_id,
    status: data.status as "open",
    closesAt: data.closes_at,
    winner: null,
  };
}

export async function insertCandidate(
  supabase: SupabaseClient,
  roundId: string,
  label: string,
  proposedBy: string,
): Promise<Candidate | null> {
  const { data: round } = await supabase
    .from("rounds")
    .select("status")
    .eq("id", roundId)
    .single();

  if (!round || round.status !== "open") return null;

  const { data, error } = await supabase
    .from("candidates")
    .insert({ round_id: roundId, label, proposed_by: proposedBy })
    .select("id, round_id, label, proposed_by, created_at")
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    roundId: data.round_id,
    label: data.label,
    proposedByUserId: data.proposed_by,
    voteCount: 0,
    createdAt: data.created_at,
  };
}

export async function closeRound(
  supabase: SupabaseClient,
  roundId: string,
): Promise<{
  winnerId: string;
  winnerLabel: string;
  winnerVoteCount: number;
} | null> {
  const { data: round } = await supabase
    .from("rounds")
    .select("status")
    .eq("id", roundId)
    .single();

  if (!round || round.status !== "open") return null;

  const { data: candidatesData } = await supabase
    .from("candidates")
    .select("id, label, created_at")
    .eq("round_id", roundId)
    .order("created_at", { ascending: true });

  if (!candidatesData || candidatesData.length === 0) return null;

  const { data: votesData } = await supabase
    .from("votes")
    .select("candidate_id")
    .eq("round_id", roundId);

  const voteCounts = new Map<string, number>();
  for (const v of votesData ?? []) {
    voteCounts.set(v.candidate_id, (voteCounts.get(v.candidate_id) ?? 0) + 1);
  }

  // Most votes wins; ties broken by earliest proposal (candidatesData is already ASC by created_at)
  let winnerId = candidatesData[0].id;
  let winnerLabel = candidatesData[0].label;
  let maxVotes = voteCounts.get(candidatesData[0].id) ?? 0;

  for (const c of candidatesData.slice(1)) {
    const count = voteCounts.get(c.id) ?? 0;
    if (count > maxVotes) {
      maxVotes = count;
      winnerId = c.id;
      winnerLabel = c.label;
    }
  }

  const { error } = await supabase
    .from("rounds")
    .update({
      status: "closed",
      winner_candidate_id: winnerId,
      closed_at: new Date().toISOString(),
    })
    .eq("id", roundId);

  if (error) return null;

  return { winnerId, winnerLabel, winnerVoteCount: maxVotes };
}

export async function fetchHistory(
  supabase: SupabaseClient,
  teamId: string,
  limit = 20,
): Promise<HistoryItem[]> {
  const { data: rounds } = await supabase
    .from("rounds")
    .select("id, closed_at, winner_candidate_id")
    .eq("team_id", teamId)
    .eq("status", "closed")
    .not("winner_candidate_id", "is", null)
    .order("closed_at", { ascending: false })
    .limit(limit);

  if (!rounds || rounds.length === 0) return [];

  const winnerIds = rounds
    .map((r) => r.winner_candidate_id as string)
    .filter(Boolean);

  const { data: candidates } = await supabase
    .from("candidates")
    .select("id, label")
    .in("id", winnerIds);

  const labelMap = new Map<string, string>();
  for (const c of candidates ?? []) {
    labelMap.set(c.id, c.label);
  }

  const { data: votes } = await supabase
    .from("votes")
    .select("candidate_id")
    .in("candidate_id", winnerIds);

  const voteCountMap = new Map<string, number>();
  for (const v of votes ?? []) {
    voteCountMap.set(
      v.candidate_id,
      (voteCountMap.get(v.candidate_id) ?? 0) + 1,
    );
  }

  return rounds.map((r) => ({
    roundId: r.id,
    decidedAt: r.closed_at ?? "",
    menuLabel: labelMap.get(r.winner_candidate_id) ?? "",
    voteCount: voteCountMap.get(r.winner_candidate_id) ?? 0,
  }));
}

export async function upsertVote(
  supabase: SupabaseClient,
  roundId: string,
  userId: string,
  candidateId: string,
): Promise<MyVote | null> {
  const { data: round } = await supabase
    .from("rounds")
    .select("status")
    .eq("id", roundId)
    .single();

  if (!round || round.status !== "open") return null;

  const { data, error } = await supabase
    .from("votes")
    .upsert(
      {
        round_id: roundId,
        user_id: userId,
        candidate_id: candidateId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "round_id,user_id" },
    )
    .select("candidate_id, updated_at")
    .single();

  if (error || !data) return null;

  return {
    candidateId: data.candidate_id,
    updatedAt: data.updated_at,
  };
}
