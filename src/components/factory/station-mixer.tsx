"use client";

import { useState } from "react";
import { useGame } from "@/lib/game-context";
import { useToast } from "@/components/toast";
import { sfx } from "@/lib/sfx";
import { MaterialIcon } from "@/components/material-icon";
import { QtyStepper } from "@/components/factory/qty-stepper";
import type { InventoryItem } from "@/lib/types";

function Slot({
  label,
  item,
  active,
  onClick,
}: {
  label: string;
  item: InventoryItem | null;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pixel-panel pixel-panel--inset flex flex-col items-center p-2 min-w-24 hover-lift ${
        active && !item ? "station-tile--active" : ""
      }`}
    >
      <span className="text-[6px] text-[var(--text-muted)] mb-1">{label}</span>
      {item ? (
        <>
          <MaterialIcon name={item.material_name} id={item.material_id} size={30} />
          <span className="text-[6px] text-[var(--text-secondary)] mt-1 max-w-20 truncate">
            {item.material_name}
          </span>
        </>
      ) : (
        <span className="sprite-slot text-[var(--text-muted)] text-lg">?</span>
      )}
    </button>
  );
}

export function MixStation({ prefill }: { prefill?: number | null }) {
  const { inventory, mixes, addMix } = useGame();
  const { toast } = useToast();

  // storage "MIX" quick-start: the dashboard remounts this station via key,
  // so the initializer runs once and fills the 1ST slot with the picked
  // material — the player then only has to choose the 2ND ingredient
  const [first, setFirst] = useState<InventoryItem | null>(() => {
    if (!prefill) return null;
    const found = inventory.find((m) => m.material_id === prefill && m.amount > 0);
    return found ?? null;
  });
  const [picking, setPicking] = useState<1 | 2>(first ? 2 : 1);
  const [second, setSecond] = useState<InventoryItem | null>(null);
  const [amount, setAmount] = useState(1);
  const [saving, setSaving] = useState(false);

  const materials = Array.from(new Map(inventory.map((m) => [m.material_id, m])).values()).filter(
    (m) => m.amount > 0
  );

  const maxAmount = Math.min(10, first?.amount ?? 10, second?.amount ?? 10);

  function isActiveMixing(a: number, b: number) {
    return mixes.some(
      (m) =>
        (m.first_ingredient_id === a && m.second_ingredient_id === b) ||
        (m.first_ingredient_id === b && m.second_ingredient_id === a)
    );
  }

  function assign(m: InventoryItem) {
    if (picking === 1) {
      if (second?.material_id === m.material_id) {
        toast("PICK A DIFFERENT INGREDIENT", "error");
        return;
      }
      setFirst(m);
      setAmount(1);
      setPicking(2);
    } else {
      if (first?.material_id === m.material_id) {
        toast("PICK A DIFFERENT INGREDIENT", "error");
        return;
      }
      setSecond(m);
    }
  }

  function reset() {
    setPicking(1);
    setFirst(null);
    setSecond(null);
    setAmount(1);
  }

  async function handleStart() {
    if (!first || !second) return;
    if (isActiveMixing(first.material_id, second.material_id)) {
      toast("ALREADY MIXING THESE INGREDIENTS", "error");
      return;
    }
    setSaving(true);
    try {
      await addMix(first.material_id, second.material_id, amount);
      sfx.mixStart();
      reset();
    } catch {
      // error surfaced by game context toast
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* Left: ingredient list */}
      <div className="min-w-0">
        <div className="text-[8px] text-[var(--text-secondary)] mb-2">
          {"<"}INGREDIENTS{">"}
        </div>
        {materials.length === 0 ? (
          <div className="pixel-panel pixel-panel--inset text-center py-6">
            <p className="text-[8px] text-[var(--text-muted)]">
              INVENTORY EMPTY... BUY MATERIALS AT THE SHOP
            </p>
          </div>
        ) : (
          <div className="pixel-panel pixel-panel--inset p-2 max-h-56 overflow-y-auto space-y-1">
            {materials.map((m) => {
              const selected =
                first?.material_id === m.material_id || second?.material_id === m.material_id;
              return (
                <button
                  key={m.material_id}
                  type="button"
                  onClick={() => assign(m)}
                  className={`ingredient-row ${selected ? "ingredient-row--active" : ""}`}
                >
                  <MaterialIcon name={m.material_name} id={m.material_id} size={24} />
                  <span className="flex-1 min-w-0 text-left text-[7px] text-[var(--text-secondary)] truncate">
                    {m.material_name}
                  </span>
                  <span className="text-[8px] text-[var(--accent-primary)]">x{m.amount}</span>
                </button>
              );
            })}
          </div>
        )}
        <div className="text-[7px] text-[var(--text-muted)] mt-2 text-center">
          CLICK AN INGREDIENT TO FILL THE{" "}
          <span className="text-[var(--accent-secondary)]">
            {picking === 1 ? "1ST" : "2ND"}
          </span>{" "}
          SLOT
        </div>
      </div>

      {/* Right: mix setup */}
      <div className="min-w-0 flex flex-col gap-3">
        <div className="text-[8px] text-[var(--text-secondary)]">
          {"<"}MIX SETUP{">"}
        </div>
        <div className="pixel-panel pixel-panel--inset p-3 flex flex-col items-center gap-2">
          <div className="flex items-start justify-center gap-2">
            <Slot label="1ST" item={first} active={picking === 1} onClick={() => setPicking(1)} />
            <span className="text-[var(--accent-secondary)] text-sm mt-8">+</span>
            <Slot label="2ND" item={second} active={picking === 2} onClick={() => setPicking(2)} />
            <span className="text-[var(--accent-secondary)] text-sm mt-8">=</span>
            <div className="pixel-panel pixel-panel--inset flex flex-col items-center p-2 min-w-24">
              <span className="text-[6px] text-[var(--text-muted)] mb-1">OUT</span>
              <span className="sprite-slot">
                <span className="pixel-sprite pixel-sprite--crystal animate-pulse-glow" />
              </span>
              <span className="text-[6px] text-[var(--accent-warning)] mt-1">NEW?</span>
            </div>
          </div>

          {first && second && (
            <div className="flex items-center justify-between w-full mt-2">
              <div className="flex items-center gap-2">
                <span className="text-[7px] text-[var(--text-muted)]">QTY</span>
                <QtyStepper value={amount} onChange={setAmount} max={maxAmount} size="sm" />
              </div>
              <button
                onClick={handleStart}
                disabled={saving}
                className="pixel-btn pixel-btn--primary hover-lift"
              >
                {saving ? "[STARTING...]" : "[START MIX]"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
