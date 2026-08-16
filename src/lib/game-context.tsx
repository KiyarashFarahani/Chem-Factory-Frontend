"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo, type ReactNode } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/toast";
import type { User, InventoryItem, MarketItem, MixerEntry, PickResult } from "@/lib/types";

interface GameStore {
  user: User | null;
  inventory: InventoryItem[];
  market: MarketItem[];
  mixes: MixerEntry[];
  loading: boolean;
  refresh: () => Promise<void>;
  buy: (marketId: number, amount: number) => Promise<void>;
  sell: (materialId: number, amount: number) => Promise<void>;
  addMix: (first: number, second: number, amount: number) => Promise<void>;
  pick: (id: number) => Promise<PickResult>;
  pickNew: (id: number, data: { name: string; price: number; mix_time: number }) => Promise<void>;
  liveRemaining: (mix: MixerEntry) => number;
  mixTotal: (id: number) => number;
}

const GameContext = createContext<GameStore | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [market, setMarket] = useState<MarketItem[]>([]);
  const [mixes, setMixes] = useState<MixerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState<Record<number, number>>({});
  const [now, setNow] = useState(() => Date.now());
  const loadedAtRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    const [profile, inv, mk, mx] = await Promise.all([
      api.user.profile(token).then((res) => res.data),
      api.inventory.export(token),
      api.market.export(token),
      api.mixer.mixes(token).catch((err) => {
        // don't leave the user staring at a stale "all idle" floor silently
        console.error("failed to load mixes", err);
        return [] as MixerEntry[];
      }),
    ]);
    setUser(profile);
    setInventory(inv);
    setMarket(mk);
    setMixes(mx);
    loadedAtRef.current = Date.now();
    setNow(loadedAtRef.current);
    setTotals((prev) => {
      const next = { ...prev };
      for (const m of mx) {
        if (next[m.id] === undefined) next[m.id] = Math.max(1, m.remaining_seconds);
      }
      return next;
    });
  }, [token]);

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    let cancelled = false;
    async function load() {
      try {
        await refresh();
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
  }, [isAuthenticated, token, refresh]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const liveRemaining = useCallback(
    (mix: MixerEntry) => {
      // before the first successful refresh the server snapshot is not anchored
      // in time — return it untouched so cards don't flash "READY" on first paint
      const anchor = loadedAtRef.current ?? mix.remaining_seconds * 1000;
      const elapsed = Math.max(0, Math.floor((now - anchor) / 1000));
      return Math.max(0, mix.remaining_seconds - elapsed);
    },
    [now]
  );

  const mixTotal = useCallback((id: number) => totals[id] ?? 1, [totals]);

  const buy = useCallback(
    async (marketId: number, amount: number) => {
      if (!token) return;
      try {
        const res = await api.market.buy(token, { market_id: marketId, amount });
        if (res.message) toast(res.message, "success");
      } catch (err) {
        const message = err instanceof Error ? err.message : "BUY FAILED";
        toast(message, "error");
        throw err;
      }
      await refresh();
    },
    [token, refresh, toast]
  );

  const sell = useCallback(
    async (materialId: number, amount: number) => {
      if (!token) return;
      try {
        const res = await api.market.sell(token, { material_id: materialId, amount });
        if (res.message) toast(res.message, "success");
      } catch (err) {
        const message = err instanceof Error ? err.message : "SELL FAILED";
        toast(message, "error");
        throw err;
      }
      await refresh();
    },
    [token, refresh, toast]
  );

  const addMix = useCallback(
    async (first: number, second: number, amount: number) => {
      if (!token) return;
      try {
        const res = await api.mixer.add(token, {
          first_ingredient_id: first,
          second_ingredient_id: second,
          amount,
        });
        if (res.message) toast(res.message, "success");
      } catch (err) {
        const message = err instanceof Error ? err.message : "COULD NOT START MIX";
        toast(message, "error");
        throw err;
      }
      await refresh();
    },
    [token, refresh, toast]
  );

  const pick = useCallback(
    async (id: number) => {
      if (!token) throw new Error("NOT SIGNED IN");
      try {
        const res = await api.mixer.pick(token, { id });
        if (res.message) toast(res.message, "success");
        await refresh();
        return res.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "COULD NOT COLLECT";
        toast(message, "error");
        throw err;
      }
    },
    [token, refresh, toast]
  );

  const pickNew = useCallback(
    async (id: number, data: { name: string; price: number; mix_time: number }) => {
      if (!token) return;
      try {
        const res = await api.mixer.pickNew(token, { id, ...data });
        if (res.message) toast(res.message, "success");
        await refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "COULD NOT CREATE";
        toast(message, "error");
        throw err;
      }
    },
    [token, refresh, toast]
  );

  const value = useMemo<GameStore>(
    () => ({ user, inventory, market, mixes, loading, refresh, buy, sell, addMix, pick, pickNew, liveRemaining, mixTotal }),
    [user, inventory, market, mixes, loading, refresh, buy, sell, addMix, pick, pickNew, liveRemaining, mixTotal]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
