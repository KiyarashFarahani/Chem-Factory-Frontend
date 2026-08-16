import type { MarketItem, MixerEntry, MixerListResponse, PickResult, User, InventoryItem } from "@/lib/types";

const API_URL = "";

interface RequestOptions extends RequestInit {
  token?: string;
}

interface ApiResponse<T> {
  data: T;
  message?: string;
}

function extractMessage(res: Response, text: string): string | undefined {
  try {
    const body = JSON.parse(text);
    if (typeof body.message === "string" && body.message.trim()) {
      return body.message;
    }
  } catch {
    // not JSON — no message
  }
  return undefined;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const { token, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> ?? {}),
  };

  if (token) {
    headers["Authorization"] = token;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  const text = await res.text().catch(() => "");
  const message = extractMessage(res, text);

  if (!res.ok) {
    if (res.status === 401 && token) {
      localStorage.removeItem("token");
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }
    const err = new Error(message || text || `Request failed: ${res.status}`);
    (err as any).status = res.status;
    throw err;
  }

  let data: T | undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // not JSON
    }
  }

  return { data: data as T, message };
}

export const api = {
  auth: {
    register: (data: { username: string; password: string }) =>
      request<{ message: string }>("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),
    login: (data: { username: string; password: string }) =>
      request<{ token: string; message?: string }>("/api/auth/login", { method: "POST", body: JSON.stringify(data) }),
  },
  user: {
    profile: (token: string) =>
      request<User>("/api/user/profile", { token }),
  },
  inventory: {
    export: (token: string) =>
      request<{ inventory_list: InventoryItem[] | null }>(
        "/api/inventory/export",
        { token }
      ).then((res) => res.data.inventory_list ?? []),
  },
  market: {
    export: (token: string) =>
      request<{ market_list: MarketItem[] | null }>(
        "/api/market/export",
        { token }
      ).then((res) => res.data.market_list ?? []),
    sell: (token: string, data: { material_id: number; amount: number }) =>
      request<{ message: string }>("/api/market/set-for-sell", {
        method: "POST",
        token,
        body: JSON.stringify(data),
      }),
    buy: (token: string, data: { market_id: number; amount: number }) =>
      request<{ message: string }>("/api/market/buy", {
        method: "POST",
        token,
        body: JSON.stringify(data),
      }),
  },
  mixer: {
    mixes: (token: string) =>
      request<MixerListResponse>("/api/mixer", { token }).then((res) => res.data.mixes ?? []),
    add: (token: string, data: { first_ingredient_id: number; second_ingredient_id: number; amount: number }) =>
      request<{ message: string }>("/api/mixer", { method: "POST", token, body: JSON.stringify(data) }),
    checkTime: (token: string, data: { id: number }) =>
      request<MixerEntry>("/api/mixer/check", { method: "POST", token, body: JSON.stringify(data) }),
    pick: (token: string, data: { id: number }) =>
      request<PickResult>("/api/mixer", { method: "PATCH", token, body: JSON.stringify(data) }),
    pickNew: (token: string, data: { id: number; name: string; price: number; mix_time: number }) =>
      request<MixerEntry>("/api/mixer/new", { method: "PATCH", token, body: JSON.stringify(data) }),
  },
};
