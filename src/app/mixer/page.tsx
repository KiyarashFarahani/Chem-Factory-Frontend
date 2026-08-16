"use client";

import { useState } from "react";
import { useGame } from "@/lib/game-context";
import { useToast } from "@/components/toast";
import { sfx } from "@/lib/sfx";
import { MachineCard } from "@/components/factory/machine-card";
import { DiscoveryModal } from "@/components/factory/discovery-modal";
import { MixStation } from "@/components/factory/station-mixer";
import type { MixerEntry } from "@/lib/types";

export default function MixerPage() {
  const { mixes, pick, mixTotal } = useGame();
  const { toast } = useToast();
  const [discoveryMix, setDiscoveryMix] = useState<MixerEntry | null>(null);

  async function handleCollect(mix: MixerEntry) {
    try {
      const res = await pick(mix.id);
      if (res.is_new) {
        setDiscoveryMix(mix);
      } else {
        sfx.collect();
      }
    } catch {
      // error surfaced by game context toast
    }
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-6 max-w-5xl mx-auto page-enter">
      <h1 className="text-sm text-[var(--accent-secondary)]">
        {"<"}MIXER{">"}
      </h1>

      {/* My Mixes */}
      <div className="pixel-panel hover-glow-purple">
        <h2 className="text-[10px] text-[var(--accent-secondary)] mb-3">
          {"<"}MY MIXES{">"}
        </h2>
        {mixes.length === 0 ? (
          <div className="pixel-panel pixel-panel--inset text-center py-6">
            <p className="text-[8px] text-[var(--text-muted)]">
              NO ACTIVE MIXES... START ONE BELOW
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {mixes.map((mix) => (
              <MachineCard
                key={mix.id}
                mix={mix}
                totalEstimate={mixTotal(mix.id)}
                onCollect={() => handleCollect(mix)}
                onName={() => setDiscoveryMix(mix)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Start a mix */}
      <div className="pixel-panel hover-glow-purple">
        <h2 className="text-[10px] text-[var(--accent-secondary)] mb-3">
          {"<"}ADD TO MIXER{">"}
        </h2>
        <MixStation />
      </div>

      <DiscoveryModal key={discoveryMix?.id ?? "none"} mix={discoveryMix} onDone={() => setDiscoveryMix(null)} />
    </div>
  );
}
