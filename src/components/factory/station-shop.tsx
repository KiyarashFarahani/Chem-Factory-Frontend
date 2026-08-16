"use client";

import { useState } from "react";
import { useGame } from "@/lib/game-context";
import { useToast } from "@/components/toast";
import { sfx } from "@/lib/sfx";
import { MaterialIcon } from "@/components/material-icon";
import { QtyStepper } from "@/components/factory/qty-stepper";
import type { MarketItem } from "@/lib/types";

export function ShopStation({ items }: { items: MarketItem[] }) {
  const { user, buy } = useGame();
  const { toast } = useToast();
  const [qty, setQty] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState<number | null>(null);

  async function handleBuy(item: MarketItem) {
    const amount = qty[item.id] ?? 1;
    const total = amount * item.price;
    if (user && total > user.balance) {
      toast("NOT ENOUGH CREDITS", "error");
      return;
    }
    setBusy(item.id);
    try {
      await buy(item.id, amount);
      sfx.buy();
    } catch {
      // error surfaced by game context toast
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {items.map((item) => (
        <div key={item.id} className="pixel-panel pixel-panel--inset p-2 flex items-center gap-2">
          <MaterialIcon name={item.material_name} id={item.material_id} size={30} />
          <div className="min-w-0 flex-1">
            <div className="text-[7px] text-[var(--text-secondary)] truncate">{item.material_name}</div>
            <div className="text-[8px] text-[var(--coin-gold)]">
              ${item.price} <span className="text-[6px] text-[var(--text-muted)]">EACH</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <QtyStepper
              value={qty[item.id] ?? 1}
              onChange={(v) => setQty((q) => ({ ...q, [item.id]: v }))}
              max={10}
              size="sm"
            />
            <button
              onClick={() => handleBuy(item)}
              disabled={busy === item.id}
              className="pixel-btn pixel-btn--success text-[8px] px-2 py-1 hover-lift"
            >
              {busy === item.id ? "[...]" : "[BUY]"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
