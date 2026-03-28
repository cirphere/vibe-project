import type { SupabaseClient } from "@supabase/supabase-js";
import type { Candidate, HistoryItem, MyVote, Round, Team } from "@/types";
import { logger } from "@/lib/logger";

export async function initAppState(
  supabase: SupabaseClient,
): Promise<{ team: Team; currentRoundId: string | null } | null> {
  const { data, error } = await supabase.rpc("init_app_state");

  if (error) {
    logger.error("initAppState", error);
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.team_id) return null;

  return {
    team: { id: row.team_id, name: row.team_name },
    currentRoundId: row.current_round_id ?? null,
  };
}

export async function fetchMyTeam(
  supabase: SupabaseClient,
  userId: string,
): Promise<Team | null> {
  const { data } = await supabase
    .from("team_members")
    .select("team_id, teams(id, name)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  const nested = data?.teams;
  if (!nested) return null;
  const team = (Array.isArray(nested) ? nested[0] : nested) as
    | { id: string; name: string }
    | null
    | undefined;
  if (!team) return null;
  return { id: team.id, name: team.name };
}

export async function fetchRoundDetail(
  supabase: SupabaseClient,
  roundId: string,
  userId: string,
): Promise<{ round: Round; candidates: Candidate[]; myVote: MyVote } | null> {
  const [
    { data: roundData, error: roundError },
    { data: candidatesData },
    { data: votesData },
  ] = await Promise.all([
    supabase
      .from("rounds")
      .select("id, team_id, status, closes_at, winner_candidate_id")
      .eq("id", roundId)
      .single(),
    supabase
      .from("candidates")
      .select("id, round_id, label, proposed_by, created_at")
      .eq("round_id", roundId)
      .order("created_at", { ascending: true }),
    supabase
      .from("votes")
      .select("candidate_id, user_id, updated_at")
      .eq("round_id", roundId),
  ]);

  if (roundError || !roundData) {
    logger.error("fetchRoundDetail", roundError);
    return null;
  }

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
  userId: string,
): Promise<Round | null> {
  const parsed = Date.parse(closesAt);
  if (isNaN(parsed) || new Date(closesAt).toISOString() !== closesAt || parsed <= Date.now()) {
    logger.warn("insertRound:invalid_closesAt");
    return null;
  }

  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", userId)
    .eq("team_id", teamId)
    .maybeSingle();

  if (!membership) {
    logger.warn("insertRound:not_team_member");
    return null;
  }

  const { data, error } = await supabase
    .from("rounds")
    .insert({ team_id: teamId, closes_at: closesAt, status: "open" })
    .select("id, team_id, status, closes_at")
    .single();

  if (error || !data) {
    logger.error("insertRound", error);
    return null;
  }

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
  const trimmed = label.trim();
  if (trimmed.length < 1 || trimmed.length > 100) {
    logger.warn("insertCandidate:invalid_label_length");
    return null;
  }

  const { data, error } = await supabase
    .from("candidates")
    .insert({ round_id: roundId, label: trimmed, proposed_by: proposedBy })
    .select("id, round_id, label, proposed_by, created_at")
    .single();

  if (error || !data) {
    logger.error("insertCandidate", error);
    return null;
  }

  return {
    id: data.id,
    roundId: data.round_id,
    label: data.label,
    proposedByUserId: data.proposed_by,
    voteCount: 0,
    createdAt: data.created_at,
  };
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

  const [{ data: candidates }, { data: voteCounts }] = await Promise.all([
    supabase.from("candidates").select("id, label").in("id", winnerIds),
    supabase.rpc("get_vote_counts", { p_candidate_ids: winnerIds }),
  ]);

  const labelMap = new Map<string, string>();
  for (const c of candidates ?? []) {
    labelMap.set(c.id, c.label);
  }

  const voteCountMap = new Map<string, number>();
  for (const vc of (voteCounts ?? []) as { candidate_id: string; vote_count: number }[]) {
    voteCountMap.set(vc.candidate_id, Number(vc.vote_count));
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

  if (error || !data) {
    logger.error("upsertVote", error);
    return null;
  }

  return {
    candidateId: data.candidate_id,
    updatedAt: data.updated_at,
  };
}
