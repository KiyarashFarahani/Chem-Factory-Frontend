"use client";

import { useState, type FormEvent } from "react";
import { useGame } from "@/lib/game-context";
import { useToast } from "@/components/toast";
import { sfx } from "@/lib/sfx";
import { MaterialIcon } from "@/components/material-icon";
import { GameModal } from "@/components/factory/game-modal";
import { CURATED_ICONS, UNKNOWN_ICON, getIconOverride, setIconOverride, clearIconOverride } from "@/lib/icons";
import type { MixerEntry } from "@/lib/types";

interface DiscoveryModalProps {
  mix: MixerEntry | null;
  onDone: () => void;
}

export function DiscoveryModal({ mix, onDone }: DiscoveryModalProps) {
  const { pickNew, pick } = useGame();
  const { toast } = useToast();
  const initialName = mix?.material_name || `${mix?.first_ingredient_name}+${mix?.second_ingredient_name}` || "";
  const [name, setName] = useState(initialName);
  const [price, setPrice] = useState("");
  const [mixTime, setMixTime] = useState("");
  const [icon, setIcon] = useState(getIconOverride(initialName) ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!mix) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast("NAME THE NEW MATERIAL", "error");
      return;
    }
    const priceNum = Number(price);
    const mixTimeNum = Number(mixTime);
    if (!price || priceNum <= 0) {
      toast("SET A PRICE", "error");
      return;
    }
    setSaving(true);
    try {
      await pickNew(mix.id, { name: trimmed, price: priceNum, mix_time: mixTimeNum });
      if (icon && trimmed) setIconOverride(trimmed, icon);
      try {
        await pick(mix.id);
        sfx.discover();
        onDone();
      } catch {
        // collect error surfaced by game context toast
        onDone();
      }
    } catch {
      // error surfaced by game context toast
    } finally {
      setSaving(false);
    }
  }

  return (
    <GameModal open={!!mix} title="NEW DISCOVERY" tone="amber" onClose={onDone}>
      {mix && (
        <div>
          <div className="pixel-panel pixel-panel--inset flex items-center gap-3 p-3 mb-3">
            <div className="sprite-slot animate-pulse-glow">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/items/${UNKNOWN_ICON}`} alt="new material" className="pixel-sprite-img" />
            </div>
            <div className="text-[8px] text-[var(--text-secondary)] leading-relaxed">
              YOU DISCOVERED AN UNKNOWN COMBO!
              <br />
              <span className="text-[var(--accent-warning)]">
                {mix.first_ingredient_name} + {mix.second_ingredient_name}
              </span>
              <br />
              NAME IT TO ADD IT TO THE WORLD.
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="discovery-name" className="text-[8px] text-[var(--text-muted)] mb-1 block">NAME</label>
              <input
                id="discovery-name"
                type="text"
                placeholder="material name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pixel-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="discovery-price" className="text-[8px] text-[var(--text-muted)] mb-1 block">PRICE</label>
                <input
                  id="discovery-price"
                  type="number"
                  min={1}
                  placeholder="price..."
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="pixel-input"
                />
              </div>
              <div>
                <label htmlFor="discovery-mix-time" className="text-[8px] text-[var(--text-muted)] mb-1 block">MIX TIME (SEC)</label>
                <input
                  id="discovery-mix-time"
                  type="number"
                  min={0}
                  placeholder="seconds..."
                  value={mixTime}
                  onChange={(e) => setMixTime(e.target.value)}
                  className="pixel-input"
                />
              </div>
            </div>
            <div>
              <label className="text-[8px] text-[var(--text-muted)] mb-1 block">ICON</label>
              <div className="flex items-center gap-2 mb-2">
                <MaterialIcon name={name} id={mix.id} size={36} />
                <button
                  type="button"
                  onClick={() => {
                    setIcon("");
                    if (name.trim()) clearIconOverride(name.trim());
                  }}
                  className="pixel-btn text-[8px] hover-lift"
                >
                  [DEFAULT]
                </button>
              </div>
              <div className="pixel-panel pixel-panel--inset p-2 grid grid-cols-8 sm:grid-cols-10 max-h-36 overflow-y-auto gap-1">
                {CURATED_ICONS.map((file) => {
                  const active = file === icon;
                  return (
                    <button
                      key={file}
                      type="button"
                      title={file}
                      onClick={() => setIcon(active ? "" : file)}
                      className={`pixel-sprite-pick ${active ? "pixel-sprite-pick--active" : ""}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/items/${file}`} alt={file} className="pixel-sprite-img" />
                    </button>
                  );
                })}
              </div>
            </div>
            <button type="submit" disabled={saving} className="pixel-btn pixel-btn--warning w-full hover-lift">
              {saving ? "[CREATING...]" : "[CREATE & COLLECT]"}
            </button>
          </form>
        </div>
      )}
    </GameModal>
  );
}
