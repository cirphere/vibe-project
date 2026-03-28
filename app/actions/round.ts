"use server";

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export async function closeRoundAction(
  roundId: string,
): Promise<
  | { winnerId: string; winnerLabel: string; winnerVoteCount: number }
  | { error: string }
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "인증이 필요합니다." };

  const { data: round, error: roundError } = await supabase
    .from("rounds")
    .select("status, team_id")
    .eq("id", roundId)
    .single();

  if (roundError) {
    logger.error("closeRoundAction:round_fetch", roundError);
    return { error: "라운드 조회에 실패했습니다." };
  }

  if (!round || round.status !== "open") {
    return { error: "이미 마감된 라운드입니다." };
  }

  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id)
    .eq("team_id", round.team_id)
    .maybeSingle();

  if (!membership) {
    return { error: "해당 라운드에 대한 권한이 없습니다." };
  }

  const [
    { data: candidatesData, error: candidatesError },
    { data: voteCounts, error: voteCountsError },
  ] = await Promise.all([
    supabase
      .from("candidates")
      .select("id, label, created_at")
      .eq("round_id", roundId)
      .order("created_at", { ascending: true }),
    supabase.rpc("get_round_vote_counts", { p_round_id: roundId }),
  ]);

  if (candidatesError) {
    logger.error("closeRoundAction:candidates_fetch", candidatesError);
    return { error: "후보 조회에 실패했습니다." };
  }

  if (!candidatesData || candidatesData.length === 0) {
    return { error: "후보가 없어 마감할 수 없습니다." };
  }

  if (voteCountsError) {
    logger.error("closeRoundAction:vote_counts_fetch", voteCountsError);
    return { error: "투표 조회에 실패했습니다." };
  }

  const voteCountMap = new Map<string, number>();
  for (const vc of (voteCounts ?? []) as { candidate_id: string; vote_count: number }[]) {
    voteCountMap.set(vc.candidate_id, Number(vc.vote_count));
  }

  let winnerId = candidatesData[0].id;
  let winnerLabel = candidatesData[0].label;
  let maxVotes = voteCountMap.get(candidatesData[0].id) ?? 0;

  for (const c of candidatesData.slice(1)) {
    const count = voteCountMap.get(c.id) ?? 0;
    if (count > maxVotes) {
      maxVotes = count;
      winnerId = c.id;
      winnerLabel = c.label;
    }
  }

  const { error: updateError } = await supabase
    .from("rounds")
    .update({
      status: "closed",
      winner_candidate_id: winnerId,
      closed_at: new Date().toISOString(),
    })
    .eq("id", roundId);

  if (updateError) {
    logger.error("closeRoundAction:round_update", updateError);
    return { error: "라운드 마감에 실패했습니다." };
  }

  return { winnerId, winnerLabel, winnerVoteCount: maxVotes };
}
