"use client";

import { useState } from "react";
import { useAppState } from "@/contexts/AppStateContext";
import EmptyRoundState from "@/components/EmptyRoundState";
import CreateRoundModal from "@/components/CreateRoundModal";
import VotingRound from "@/components/VotingRound";

export default function Home() {
  const { loading, currentRound, createRound } = useAppState();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreateRound = async (closesAt: string) => {
    await createRound(closesAt);
    setShowCreateModal(false);
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent dark:border-orange-400 dark:border-t-transparent" />
      </div>
    );
  }

  if (!currentRound) {
    return (
      <>
        <EmptyRoundState onOpenRound={() => setShowCreateModal(true)} />
        {showCreateModal && (
          <CreateRoundModal
            onConfirm={handleCreateRound}
            onCancel={() => setShowCreateModal(false)}
          />
        )}
      </>
    );
  }

  return <VotingRound />;
}
