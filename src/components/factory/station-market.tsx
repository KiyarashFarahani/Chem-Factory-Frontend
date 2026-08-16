"use client";

import { useState } from "react";
import { useGame } from "@/lib/game-context";
import { useToast } from "@/components/toast";
import { sfx } from "@/lib/sfx";
import { MaterialIcon } from "@/components/material-icon";
import { QtyStepper } from "@/components/factory/qty-stepper";
import type { MarketItem, InventoryItem } from "@/lib/types";

export function MarketStation({ playerItems }: { playerItems: MarketItem[] }) {
  const { user, inventory, buy, sell } = useGame();
  const { toast } = useToast();
  const [buyQty, setBuyQty] = useState<Record<number, number>>({});
  const [buyBusy, setBuyBusy] = useState<number | null>(null);
  const [sellMat, setSellMat] = useState<number | null>(null);
  const [sellAmt, setSellAmt] = useState(1);
  const [sellBusy, setSellBusy] = useState(false);

  const ownedAmount = inventory.find((i) => i.material_id === sellMat)?.amount ?? 0;
  const sellMatInfo = inventory.find((i) => i.material_id === sellMat);

  async function handleBuy(item: MarketItem) {
    const amount = buyQty[item.id] ?? 1;
    const total = amount * item.price;
    if (user && total > user.balance) {
      toast("NOT ENOUGH CREDITS", "error");
      return;
    }
    setBuyBusy(item.id);
    try {
      await buy(item.id, amount);
      sfx.buy();
    } catch {
      // error surfaced by game context toast
    } finally {
      setBuyBusy(null);
    }
  }

  async function handleSell() {
    if (sellMat === null || sellAmt <= 0) {
      toast("SELECT A MATERIAL AND AMOUNT", "error");
      return;
    }
    if (sellAmt > ownedAmount) {
      toast("NOT ENOUGH INVENTORY", "error");
      return;
    }
    setSellBusy(true);
    try {
      await sell(sellMat, sellAmt);
      sfx.sell();
      setSellAmt(1);
      setSellMat(null);
    } catch {
      // error surfaced by game context toast
    } finally {
      setSellBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-[8px] text-[var(--accent-success)] mb-2">{"<"}BUY FROM PLAYERS{">"}</h4>
        {playerItems.length === 0 ? (
          <div className="pixel-panel pixel-panel--inset text-center py-4">
            <p className="text-[8px] text-[var(--text-muted)]">NO PLAYER LISTINGS...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {playerItems.map((item) => (
              <div key={item.id} className="pixel-panel pixel-panel--inset p-2 flex items-center gap-2">
                <MaterialIcon name={item.material_name} id={item.material_id} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="text-[7px] text-[var(--text-secondary)] truncate">{item.material_name}</div>
                  <div className="text-[6px] text-[var(--text-muted)] truncate">SELLER: {item.username}</div>
                  <div className="text-[8px] text-[var(--coin-gold)]">${item.price} x{item.amount}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <QtyStepper
                    value={buyQty[item.id] ?? 1}
                    onChange={(v) => setBuyQty((q) => ({ ...q, [item.id]: v }))}
                    max={Math.min(10, item.amount)}
                    size="sm"
                  />
                  <button
                    onClick={() => handleBuy(item)}
                    disabled={buyBusy === item.id}
                    className="pixel-btn pixel-btn--success text-[8px] px-2 py-1 hover-lift"
                  >
                    {buyBusy === item.id ? "[...]" : "[BUY]"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h4 className="text-[8px] text-[var(--accent-warning)] mb-2">{"<"}SELL YOUR STOCK{">"}</h4>
        <div className="pixel-panel pixel-panel--inset p-2">
          {inventory.length === 0 ? (
            <p className="text-[8px] text-[var(--text-muted)] text-center py-3">
              NOTHING TO SELL...
            </p>
          ) : (
            <div className="space-y-2">
              <select
                id="market-sell-material"
                aria-label="select material to sell"
                className="pixel-input w-full"
                value={sellMat ?? 0}
                onChange={(e) => {
                  setSellMat(Number(e.target.value));
                  setSellAmt(1);
                }}
              >
                <option value={0}>-- SELECT MATERIAL --</option>
                {inventory.map((item: InventoryItem) => (
                  <option key={item.material_id} value={item.material_id}>
                    {item.material_name} (x{item.amount})
                  </option>
                ))}
              </select>
              {sellMatInfo && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[7px] text-[var(--text-muted)]">QTY</span>
                    <QtyStepper value={sellAmt} onChange={setSellAmt} max={Math.max(1, ownedAmount)} size="sm" />
                  </div>
                  <button
                    onClick={handleSell}
                    disabled={sellBusy}
                    className="pixel-btn pixel-btn--warning text-[8px] px-2 py-1 hover-lift"
                  >
                    {sellBusy ? "[...]" : "[SELL]"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
