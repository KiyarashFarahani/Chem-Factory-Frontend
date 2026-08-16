"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useIsClient } from "@/lib/use-is-client";
import { useToast } from "@/components/toast";
import { MaterialIcon } from "@/components/material-icon";
import { LEVEL_XP } from "@/lib/constants";
import type { User, InventoryItem, MarketItem, MixerEntry } from "@/lib/types";

export default function ProfilePage() {
  const { token, isAuthenticated } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const isClient = useIsClient();
  const [user, setUser] = useState<User | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [market, setMarket] = useState<MarketItem[]>([]);
  const [mixes, setMixes] = useState<MixerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (token: string) => api.user.profile(token).then((res) => res.data), []);
  const fetchInventory = useCallback(async (token: string) => api.inventory.export(token), []);
  const fetchMarket = useCallback(async (token: string) => api.market.export(token), []);
  const fetchMixes = useCallback(async (token: string) => api.mixer.mixes(token), []);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      router.push("/login");
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const [profile, inv, mk, mx] = await Promise.all([
          fetchProfile(token!),
          fetchInventory(token!),
          fetchMarket(token!),
          fetchMixes(token!).catch(() => []),
        ]);
        if (cancelled) return;
        setUser(profile);
        setInventory(inv);
        setMarket(mk);
        setMixes(mx);
      } catch (err) {
        if (cancelled) return;
        toast(err instanceof Error ? err.message : "COULD NOT LOAD PROFILE", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, token, router, fetchProfile, fetchInventory, fetchMarket, fetchMixes, toast]);

  if (!isClient) return null;

  const myListings = user ? market.filter((m) => m.username === user.username) : [];
  const itemsOwned = inventory.reduce((sum, i) => sum + i.amount, 0);
  const activeMixes = mixes.filter((m) => m.remaining_seconds > 0);

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-6 max-w-5xl mx-auto page-enter">
      <h1 className="text-sm text-[var(--accent-primary)]">
        {"<"}PROFILE{">"}
      </h1>

      {loading ? (
        <div className="space-y-4">
          <div className="pixel-panel space-y-3">
            <div className="flex justify-between">
              <div className="pixel-skeleton pixel-skeleton--title" />
              <div className="pixel-skeleton pixel-skeleton--text" style={{ width: 40 }} />
            </div>
            <div className="pixel-skeleton pixel-skeleton--text" />
            <div className="pixel-skeleton pixel-skeleton--text" style={{ width: "40%" }} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="pixel-panel pixel-panel--inset p-3 space-y-2">
                <div className="pixel-skeleton pixel-skeleton--text" />
                <div className="pixel-skeleton pixel-skeleton--text" style={{ width: "60%" }} />
              </div>
            ))}
          </div>
        </div>
      ) : user ? (
        <>
          {/* Identity */}
          <div className="pixel-panel">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[var(--accent-primary)] text-xs">
                  {">"} {user.username}
                </span>
                <div className="text-[8px] text-[var(--text-muted)] mt-1">
                  PLAYER #{user.id}
                </div>
              </div>
              <span className="text-[8px] text-[var(--text-muted)]">
                LVL {user.level}
              </span>
            </div>

            <div className="mb-3">
              <div className="flex justify-between text-[8px] text-[var(--text-muted)] mb-1">
                <span>XP</span>
                <span>{user.xp} / {user.level * LEVEL_XP}</span>
              </div>
              <div className="pixel-progress">
                <div
                  className="pixel-progress__fill"
                  style={{ width: `${Math.min((user.xp / (user.level * LEVEL_XP)) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[var(--coin-gold)] text-[10px]">$</span>
              <span className="text-[var(--coin-gold)] text-[10px]">
                {user.balance} credits
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="pixel-panel pixel-panel--inset p-3 text-center">
              <div className="text-[var(--accent-primary)] text-sm">{inventory.length}</div>
              <div className="text-[7px] text-[var(--text-muted)] mt-1">MATERIAL TYPES</div>
            </div>
            <div className="pixel-panel pixel-panel--inset p-3 text-center">
              <div className="text-[var(--accent-primary)] text-sm">{itemsOwned}</div>
              <div className="text-[7px] text-[var(--text-muted)] mt-1">ITEMS OWNED</div>
            </div>
            <div className="pixel-panel pixel-panel--inset p-3 text-center">
              <div className="text-[var(--accent-warning)] text-sm">{myListings.length}</div>
              <div className="text-[7px] text-[var(--text-muted)] mt-1">MARKET LISTINGS</div>
            </div>
            <div className="pixel-panel pixel-panel--inset p-3 text-center">
              <div className="text-[var(--accent-secondary)] text-sm">{activeMixes.length}</div>
              <div className="text-[7px] text-[var(--text-muted)] mt-1">MIXES IN PROGRESS</div>
            </div>
          </div>

          {/* My listings */}
          <div className="pixel-panel">
            <h2 className="text-[10px] text-[var(--accent-warning)] mb-3">
              {"<"}MY LISTINGS{">"}
            </h2>
            {myListings.length === 0 ? (
              <div className="pixel-panel pixel-panel--inset text-center py-4">
                <p className="text-[8px] text-[var(--text-muted)]">
                  NOTHING LISTED FOR SALE
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {myListings.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-2 text-[8px]">
                    <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                      <MaterialIcon name={m.material_name} id={m.material_id} size={22} />
                      <span>
                        #{m.id} {m.material_name}
                      </span>
                    </span>
                    <span className="text-[var(--text-muted)]">
                      QTY: {m.amount} | ${m.price}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active mixes */}
          <div className="pixel-panel">
            <h2 className="text-[10px] text-[var(--accent-secondary)] mb-3">
              {"<"}ACTIVE MIXES{">"}
            </h2>
            {mixes.length === 0 ? (
              <div className="pixel-panel pixel-panel--inset text-center py-4">
                <p className="text-[8px] text-[var(--text-muted)]">
                  NO MIXES RUNNING
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {mixes.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-2 text-[8px]">
                    <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                      <MaterialIcon name={m.first_ingredient_name} id={m.first_ingredient_id} size={22} />
                      <span className="text-[var(--text-muted)]">+</span>
                      <MaterialIcon name={m.second_ingredient_name} id={m.second_ingredient_id} size={22} />
                      <span>
                        #{m.id} {m.first_ingredient_name} + {m.second_ingredient_name}
                      </span>
                    </span>
                    <span className="text-[var(--text-muted)]">
                      {m.remaining_seconds}s LEFT
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 gap-2">
            <Link href="/dashboard" className="pixel-btn pixel-btn--primary w-full hover-lift hover-glow-teal">
              {"[ BACK TO THE FLOOR ]"}
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
