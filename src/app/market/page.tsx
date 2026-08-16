"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/toast";
import { sfx } from "@/lib/sfx";
import { QtyStepper } from "@/components/factory/qty-stepper";
import { MaterialIcon } from "@/components/material-icon";
import { SHOP_USER_ID } from "@/lib/constants";
import type { MarketItem, InventoryItem } from "@/lib/types";

function MarketPageContent({
  initialTab,
  initialMaterialId,
}: {
  initialTab: "browse" | "sell";
  initialMaterialId: number;
}) {
  const { token, isAuthenticated } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = useState<MarketItem[]>([]);
  const [inv, setInv] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"browse" | "sell">(initialTab);

  // sell form
  const [sellMaterialId, setSellMaterialId] = useState(initialMaterialId);
  const [sellAmount, setSellAmount] = useState(1);

  // buy panel
  const [buyItem, setBuyItem] = useState<MarketItem | null>(null);
  const [buyAmount, setBuyAmount] = useState(1);
  const [buyBusy, setBuyBusy] = useState(false);

  const ownedAmount = inv.find((i) => i.material_id === sellMaterialId)?.amount ?? 0;
  const playerItems = items.filter((i) => i.user_id > SHOP_USER_ID);

  const fetchMarket = useCallback(async (token: string) => api.market.export(token), []);
  const fetchInventory = useCallback(async (token: string) => api.inventory.export(token), []);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      router.push("/login");
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const [market, inventory] = await Promise.all([
          fetchMarket(token!),
          fetchInventory(token!),
        ]);
        if (!cancelled) {
          setItems(market);
          setInv(inventory);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, token, router, fetchMarket, fetchInventory]);

  async function handleSell() {
    if (!token) return;
    if (sellMaterialId === 0 || sellAmount <= 0) {
      toast("SELECT A MATERIAL AND AMOUNT", "error");
      return;
    }
    if (sellAmount > ownedAmount) {
      toast("NOT ENOUGH INVENTORY", "error");
      return;
    }
    try {
      const res = await api.market.sell(token, { material_id: sellMaterialId, amount: sellAmount });
      sfx.sell();
      if (res.message) toast(res.message, "success");
      setInv(await fetchInventory(token));
      setItems(await fetchMarket(token));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "SELL FAILED";
      toast(msg, "error");
    }
  }

  async function handleBuy() {
    if (!token || !buyItem) return;
    setBuyBusy(true);
    try {
      const res = await api.market.buy(token, { market_id: buyItem.id, amount: buyAmount });
      sfx.buy();
      if (res.message) toast(res.message, "success");
      setBuyItem(null);
      setInv(await fetchInventory(token));
      setItems(await fetchMarket(token));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "BUY FAILED";
      toast(msg, "error");
    } finally {
      setBuyBusy(false);
    }
  }

  const buyTotal = buyItem ? buyItem.price * buyAmount : 0;

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-4 max-w-5xl mx-auto page-enter">
      <h1 className="text-sm text-[var(--accent-warning)]">
        {"<"}MARKET{">"}
      </h1>

      {/* Tabs */}
      <div className="pixel-tabs">
        <button
          onClick={() => setTab("browse")}
          className={`pixel-tab ${tab === "browse" ? "pixel-tab--active" : ""}`}
        >
          [BROWSE]
        </button>
        <button
          onClick={() => setTab("sell")}
          className={`pixel-tab ${tab === "sell" ? "pixel-tab--active" : ""}`}
        >
          [TRADE]
        </button>
      </div>

      {/* Browse Tab */}
      {tab === "browse" && (
        <div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="pixel-panel flex items-start gap-3">
                  <div className="pixel-skeleton pixel-skeleton--box" />
                  <div className="flex-1 space-y-2">
                    <div className="pixel-skeleton pixel-skeleton--text" style={{ width: "50%" }} />
                    <div className="pixel-skeleton pixel-skeleton--text" style={{ width: "30%" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : playerItems.length === 0 ? (
            <div className="pixel-panel pixel-panel--inset text-center py-8">
              <p className="text-[8px] text-[var(--text-muted)]">
                NO ITEMS LISTED...
              </p>
              <p className="text-[8px] text-[var(--text-muted)] mt-2">
                CHECK BACK LATER
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {playerItems.map((item) => (
                <div key={item.id} className="pixel-panel hover-lift hover-glow-amber">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MaterialIcon name={item.material_name} id={item.material_id} />
                      <div>
                        <div className="text-[8px] text-[var(--text-secondary)]">
                          {item.material_name}
                        </div>
                        <div className="text-[8px] text-[var(--text-muted)]">
                          SELLER: {item.username}
                        </div>
                      </div>
                    </div>
                    <span className="text-[var(--coin-gold)] text-[10px]">
                      ${item.price}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] text-[var(--text-muted)]">
                      QTY: {item.amount}
                    </span>
                    <button
                      onClick={() => {
                        setBuyItem(item);
                        setBuyAmount(1);
                      }}
                      className="pixel-btn pixel-btn--success text-[8px] hover-lift"
                    >
                      [BUY]
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sell Tab */}
      {tab === "sell" && (
        <div className="space-y-6">
          <div className="pixel-panel">
            <h2 className="text-[10px] text-[var(--accent-warning)] mb-3">
              {"<"}LIST MATERIAL{">"}
            </h2>
            {inv.length === 0 ? (
              <p className="pixel-input text-[8px] flex items-center text-[var(--text-muted)]">
                YOUR INVENTORY IS EMPTY...
              </p>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-[8px] text-[var(--text-muted)] mb-1 block">SELECT FROM INVENTORY</label>
                  <select
                    className="pixel-input w-full"
                    value={sellMaterialId}
                    onChange={(e) => {
                      setSellMaterialId(Number(e.target.value));
                      setSellAmount(1);
                    }}
                  >
                    <option value={0}>-- select material --</option>
                    {inv.map((item) => (
                      <option key={item.id} value={item.material_id}>
                        {item.material_name} (x{item.amount})
                      </option>
                    ))}
                  </select>
                </div>
                {sellMaterialId !== 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[7px] text-[var(--text-muted)]">QTY</span>
                        <QtyStepper
                          value={sellAmount}
                          onChange={setSellAmount}
                          max={Math.max(1, ownedAmount)}
                          size="sm"
                        />
                      </div>
                      <button
                        onClick={handleSell}
                        className="pixel-btn pixel-btn--warning text-[8px] hover-lift"
                      >
                        [LIST FOR SALE]
                      </button>
                    </div>
                    <p className="text-[7px] text-[var(--text-muted)]">
                      YOU OWN: {ownedAmount} — PRICE IS DETERMINED BY THE MATERIAL
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Buy panel */}
      {buyItem && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75" onClick={() => !buyBusy && setBuyItem(null)} />
          <div className="relative pixel-panel w-full max-w-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[10px] text-[var(--accent-success)]">{"<"}BUY MATERIAL{">"}</h2>
              <button
                onClick={() => !buyBusy && setBuyItem(null)}
                className="text-[8px] text-[var(--text-muted)] hover:text-[var(--accent-danger)] transition-colors"
              >
                [CLOSE]
              </button>
            </div>
            <div className="pixel-panel pixel-panel--inset flex items-center gap-3 p-3 mb-3">
              <MaterialIcon name={buyItem.material_name} id={buyItem.material_id} size={36} />
              <div className="min-w-0 flex-1">
                <div className="text-[8px] text-[var(--text-secondary)] truncate">{buyItem.material_name}</div>
                <div className="text-[6px] text-[var(--text-muted)] truncate">SELLER: {buyItem.username}</div>
                <div className="text-[8px] text-[var(--coin-gold)]">
                  ${buyItem.price} <span className="text-[6px] text-[var(--text-muted)]">EACH</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[7px] text-[var(--text-muted)]">QTY</span>
                <QtyStepper value={buyAmount} onChange={setBuyAmount} max={Math.min(10, buyItem.amount)} size="sm" />
              </div>
              <span className="text-[9px] text-[var(--coin-gold)]">TOTAL: ${buyTotal}</span>
            </div>
            <button
              onClick={handleBuy}
              disabled={buyBusy}
              className="pixel-btn pixel-btn--success w-full hover-lift"
            >
              {buyBusy ? "[BUYING...]" : "[CONFIRM PURCHASE]"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MarketPageInner() {
  const searchParams = useSearchParams();
  const sell = searchParams.get("sell") === "1";
  const materialId = Number(searchParams.get("material_id")) || 0;
  return (
    <MarketPageContent
      key={searchParams.toString()}
      initialTab={sell ? "sell" : "browse"}
      initialMaterialId={materialId}
    />
  );
}

export default function MarketPage() {
  return (
    <Suspense fallback={null}>
      <MarketPageInner />
    </Suspense>
  );
}
