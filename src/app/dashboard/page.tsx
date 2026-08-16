"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { gsap, useGSAP } from "@/lib/gsap";
import { useAuth } from "@/lib/auth-context";
import { useGame } from "@/lib/game-context";
import { useToast } from "@/components/toast";
import { sfx } from "@/lib/sfx";
import { LEVEL_XP, SHOP_USER_ID } from "@/lib/constants";
import { MachineCard } from "@/components/factory/machine-card";
import { DiscoveryModal } from "@/components/factory/discovery-modal";
import { ShopStation } from "@/components/factory/station-shop";
import { MarketStation } from "@/components/factory/station-market";
import { StorageStation } from "@/components/factory/station-storage";
import { MixStation } from "@/components/factory/station-mixer";
import type { MixerEntry } from "@/lib/types";

type StationId = "shop" | "storage" | "market" | "mixer";

const STATIONS: Array<{
  id: StationId;
  label: string;
  sub: string;
  icon: string;
  color: string;
}> = [
  { id: "shop", label: "SHOP", sub: "BUY RAW MATERIALS", icon: "Item_126.png", color: "amber" },
  { id: "storage", label: "STORAGE", sub: "YOUR STOCK", icon: "Item_174.png", color: "teal" },
  { id: "market", label: "MARKET", sub: "TRADE WITH PLAYERS", icon: "Item_172.png", color: "purple" },
  { id: "mixer", label: "MIXER", sub: "COMBINE MATERIALS", icon: "Item_487.png", color: "purple" },
];

function xpPct(xp: number, level: number): number {
  return Math.min((xp / (level * LEVEL_XP)) * 100, 100);
}

export default function FactoryFloorPage() {
  const { isAuthenticated } = useAuth();
  const { user, inventory, market, mixes, loading, pick, mixTotal } = useGame();
  const { toast } = useToast();
  const router = useRouter();
  const floorRef = useRef<HTMLDivElement>(null);
  const xpRef = useRef<HTMLDivElement>(null);
  const levelUpRef = useRef<HTMLDivElement>(null);
  const prevLevel = useRef<number | null>(null);
  const [station, setStation] = useState<StationId | null>(null);
  const [discoveryMix, setDiscoveryMix] = useState<MixerEntry | null>(null);
  const [collected, setCollected] = useState<{ name: string; amount: number } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!user) return;
    // reseed when the logged-in player changes (login/logout) so a stale
    // level-up animation can't play for a fresh session
    if (prevLevel.current === null || user.level < prevLevel.current) {
      prevLevel.current = user.level;
      return;
    }
    if (user.level > prevLevel.current) {
      prevLevel.current = user.level;
      sfx.levelUp();
      if (levelUpRef.current) {
        const el = levelUpRef.current;
        gsap.fromTo(el, { scale: 0.6, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.4, ease: "back.out(2)" });
        gsap.to(el, { autoAlpha: 0, delay: 2.2, duration: 0.5 });
      }
    }
  }, [user]);

  const collectedRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (collected && collectedRef.current) {
      const el = collectedRef.current;
      gsap.fromTo(
        el,
        { scale: 0.7, autoAlpha: 0, y: 24 },
        { scale: 1, autoAlpha: 1, y: 0, duration: 0.35, ease: "back.out(2)" }
      );
    }
  }, [collected]);

  useGSAP(
    () => {
      if (loading) return;
      gsap.fromTo(".hud-panel", { autoAlpha: 0, y: -10 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: "power2.out" });
      if (mixes.length > 0) {
        gsap.fromTo(
          ".machine-wrap",
          { autoAlpha: 0, y: 14 },
          { autoAlpha: 1, y: 0, duration: 0.35, ease: "back.out(2)", stagger: 0.08 }
        );
      }
      gsap.fromTo(
        ".station-tile",
        { autoAlpha: 0, scale: 0.9 },
        { autoAlpha: 1, scale: 1, duration: 0.3, ease: "back.out(1.7)", stagger: 0.06 }
      );
    },
    { scope: floorRef, dependencies: [loading, mixes.length] }
  );

  useGSAP(
    () => {
      if (xpRef.current && user) {
        const pct = xpPct(user.xp, user.level);
        gsap.fromTo(xpRef.current, { width: "0%" }, { width: `${pct}%`, duration: 0.8, ease: "power2.out" });
      }
    },
    { dependencies: [user?.xp, user?.level], revertOnUpdate: true }
  );

  const shopItems = market.filter((m) => m.user_id === SHOP_USER_ID);
  const playerItems = market.filter((m) => m.user_id > SHOP_USER_ID);

  // prefill-once via key: remounting MixStation with a fresh key lets the
  // initializer seed the 1ST slot, while any local state the player edits
  // afterwards stays theirs (never clobbered by re-renders)
  const [mixPrefill, setMixPrefill] = useState<number | null>(null);
  const mixerKey = mixPrefill ?? 0;

  function openMixerFor(materialId: number) {
    sfx.click();
    setMixPrefill(materialId);
    setStation("mixer");
  }

  async function handleCollect(mix: MixerEntry) {
    try {
      const res = await pick(mix.id);
      if (res.is_new) {
        setDiscoveryMix(mix);
      } else {
        sfx.collect();
        setCollected({ name: mix.material_name || "MATERIAL", amount: mix.amount });
        window.setTimeout(() => setCollected(null), 2000);
      }
    } catch {
      // error surfaced by game context toast
    }
  }

  if (loading && !user) {
    return (
      <div className="h-full overflow-y-auto floor-bg" ref={floorRef}>
        <div className="max-w-6xl mx-auto p-4 sm:p-5 space-y-4">
          <div className="pixel-panel space-y-3">
            <div className="flex justify-between">
              <div className="pixel-skeleton pixel-skeleton--title" />
              <div className="pixel-skeleton pixel-skeleton--text" style={{ width: 40 }} />
            </div>
            <div className="pixel-skeleton pixel-skeleton--text" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="pixel-panel pixel-panel--inset p-3">
                <div className="pixel-skeleton pixel-skeleton--box" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const pct = user ? xpPct(user.xp, user.level) : 0;

  return (
    <div className="floor-bg h-full overflow-y-auto page-enter" ref={floorRef}>
      <div className="max-w-6xl mx-auto p-4 sm:p-5 space-y-5">
      {/* HUD */}
      <div className="hud-panel pixel-panel flex items-center justify-between gap-3">
        <div>
          <span className="text-[var(--accent-primary)] text-xs">{" > "}{user?.username}</span>
          <div className="text-[7px] text-[var(--text-muted)] mt-1">PLAYER #{user?.id}</div>
        </div>
        <div className="flex-1 max-w-xs">
          <div className="flex justify-between text-[7px] text-[var(--text-muted)] mb-1">
            <span>LVL {user?.level}</span>
            <span>{user?.xp} / {(user?.level ?? 1) * LEVEL_XP} XP</span>
          </div>
          <div className="pixel-progress">
            <div ref={xpRef} className="pixel-progress__fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[var(--coin-gold)] text-[10px]">$</span>
          <span className="text-[var(--coin-gold)] text-[10px]">{user?.balance} credits</span>
        </div>
      </div>

      {/* Machines */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[10px] text-[var(--accent-secondary)]">
            {"<"}MIXING MACHINES{">"}
          </h2>
          <button
            onClick={() => {
              sfx.click();
              setMixPrefill(null);
              setStation("mixer");
            }}
            className="text-[7px] text-[var(--text-muted)] hover:text-[var(--accent-secondary)] transition-colors"
          >
            [+ NEW MIX]
          </button>

        </div>
        {mixes.length === 0 ? (
          <div className="machine-wrap pixel-panel pixel-panel--inset text-center py-8">
            <p className="text-[8px] text-[var(--text-muted)]">
              ALL MACHINES IDLE...
            </p>
            <p className="text-[7px] text-[var(--text-muted)] mt-2">
              BUY MATERIALS AT THE SHOP, THEN START A MIX
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {mixes.map((mix) => (
              <div key={mix.id} className="machine-wrap">
                <MachineCard
                  mix={mix}
                  totalEstimate={mixTotal(mix.id)}
                  onCollect={() => handleCollect(mix)}
                  onName={() => setDiscoveryMix(mix)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stations */}
      <div>
        <h2 className="text-[10px] text-[var(--text-secondary)] mb-2">
          {"<"}FACTORY STATIONS{">"}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STATIONS.map((s) => {
            const active = station === s.id;
            return (
              <div
                key={s.id}
                className={`station-tile pixel-panel flex flex-col items-center py-4 hover-lift ${active ? "station-tile--active" : ""}`}
                onClick={() => {
                  sfx.click();
                  setStation(active ? null : s.id);
                }}
              >
                <div className="station-icon mb-2 sprite-slot">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/items/${s.icon}`} alt={s.label} className="pixel-sprite-img" />
                </div>
                <div className="text-[9px] text-[var(--text-secondary)]">[{s.label}]</div>
                <div className="text-[6px] text-[var(--text-muted)] mt-1">{s.sub}</div>
                <div className="text-[6px] text-[var(--accent-primary)] mt-1">
                  {active ? "[CLOSE]" : "[OPEN]"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Station panels */}
      {station === "shop" && (
        <div className="pixel-panel">
          <h3 className="text-[9px] text-[var(--accent-warning)] mb-3">{"<"}SHOP{">"}</h3>
          <ShopStation items={shopItems} />
        </div>
      )}
      {station === "storage" && (
        <div className="pixel-panel">
          <h3 className="text-[9px] text-[var(--accent-primary)] mb-3">{"<"}STORAGE{">"}</h3>
          <StorageStation inventory={inventory} onMix={openMixerFor} />
        </div>
      )}
      {station === "market" && (
        <div className="pixel-panel">
          <h3 className="text-[9px] text-[var(--accent-secondary)] mb-3">{"<"}MARKET{">"}</h3>
          <MarketStation playerItems={playerItems} />
        </div>
      )}
      {station === "mixer" && (
        <div className="pixel-panel">
          <h3 className="text-[9px] text-[var(--accent-secondary)] mb-3">{"<"}MIXER{">"}</h3>
          <MixStation key={mixerKey} prefill={mixPrefill} />
        </div>
      )}
      </div>

      <DiscoveryModal key={discoveryMix?.id ?? "none"} mix={discoveryMix} onDone={() => setDiscoveryMix(null)} />

      {/* Level up banner */}
      <div
        ref={levelUpRef}
        className="fixed top-24 left-1/2 -translate-x-1/2 z-[9000] pixel-panel text-center px-8 py-4 pointer-events-none"
        style={{ opacity: 0, visibility: "hidden", borderColor: "var(--accent-warning)" }}
      >
        <div className="text-[var(--accent-warning)] text-sm animate-blink">[ LEVEL UP! ]</div>
        <div className="text-[8px] text-[var(--text-secondary)] mt-2">
          YOU ARE NOW LEVEL {user?.level}
        </div>
      </div>

      {/* Collected popup */}
      {collected && (
        <div
          ref={collectedRef}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9000] pixel-panel px-6 py-3 text-center pointer-events-none"
          style={{ borderColor: "var(--accent-success)", background: "var(--bg-panel)" }}
        >
          <div className="text-[var(--accent-success)] text-xs">
            +{collected.amount}x {collected.name.toUpperCase()}
          </div>
          <div className="text-[7px] text-[var(--text-muted)] mt-1">ADDED TO STORAGE</div>
        </div>
      )}
    </div>
  );
}
