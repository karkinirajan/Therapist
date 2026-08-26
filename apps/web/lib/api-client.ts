"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

/**
 * Typed client + React Query hooks for the auth proxy routes under
 * /api/auth/*. Every call here is same-origin (relative URL), so there's
 * no CORS involved from the browser's perspective — the Next.js route
 * handlers do the cross-origin call to FastAPI server-side.
 */

export interface AuthUser {
  id: string;
  email: string;
  [key: string]: unknown; // FastAPI's user schema may grow fields we don't render yet.
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

// Access token lives in memory only (never localStorage/cookies-readable-by-JS)
// to keep it out of reach of a persistent XSS payload. It's short-lived
// (15 min) and reconstructible from the httpOnly refresh cookie via
// silent refresh, so losing it on a hard reload is expected and handled
// by useCurrentUser.
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

async function fetchJson<T>(
  input: string,
  init: RequestInit = {},
  { auth = false }: { auth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("content-type", "application/json");
  if (auth && accessToken) headers.set("authorization", `Bearer ${accessToken}`);

  const response = await fetch(input, { ...init, headers });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      (data && typeof data === "object" && "detail" in data
        ? String((data as { detail: unknown }).detail)
        : undefined) ?? `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, data);
  }

  return data as T;
}

interface Credentials {
  email: string;
  password: string;
}

async function signup(credentials: Credentials): Promise<AuthTokenResponse> {
  return fetchJson<AuthTokenResponse>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

async function login(credentials: Credentials): Promise<AuthTokenResponse> {
  return fetchJson<AuthTokenResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

async function logout(): Promise<void> {
  await fetchJson<unknown>(
    "/api/auth/logout",
    { method: "POST" },
    { auth: true },
  );
}

/** Attempts a silent refresh using the httpOnly cookie; null if there is none/it's expired. */
async function refresh(): Promise<AuthTokenResponse | null> {
  try {
    return await fetchJson<AuthTokenResponse>("/api/auth/refresh", {
      method: "POST",
    });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      return null;
    }
    throw err;
  }
}

async function fetchCurrentUser(): Promise<AuthUser | null> {
  if (!accessToken) {
    const refreshed = await refresh();
    if (!refreshed) return null;
    setAccessToken(refreshed.access_token);
    return refreshed.user;
  }

  try {
    return await fetchJson<AuthUser>("/api/auth/me", {}, { auth: true });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      const refreshed = await refresh();
      if (!refreshed) {
        setAccessToken(null);
        return null;
      }
      setAccessToken(refreshed.access_token);
      return refreshed.user;
    }
    throw err;
  }
}

export const authKeys = {
  me: ["auth", "me"] as const,
};

/** Currently signed-in user, or null when logged out. Distinguishes "logged out" (empty) from a real fetch failure (error). */
export function useCurrentUser(): UseQueryResult<AuthUser | null, ApiError> {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: fetchCurrentUser,
    staleTime: 60_000,
    retry: false,
  });
}

export function useSignup(): UseMutationResult<AuthTokenResponse, ApiError, Credentials> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: signup,
    onSuccess: (data) => {
      setAccessToken(data.access_token);
      queryClient.setQueryData(authKeys.me, data.user);
    },
  });
}

export function useLogin(): UseMutationResult<AuthTokenResponse, ApiError, Credentials> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setAccessToken(data.access_token);
      queryClient.setQueryData(authKeys.me, data.user);
    },
  });
}

export function useLogout(): UseMutationResult<void, ApiError, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      setAccessToken(null);
      queryClient.setQueryData(authKeys.me, null);
      queryClient.invalidateQueries({ queryKey: authKeys.me });
    },
  });
}

/** Used by the Google OAuth callback page to exchange the one-time code. */
export function exchangeGoogleCode(code: string): Promise<AuthTokenResponse> {
  return fetchJson<AuthTokenResponse>("/api/auth/google-exchange", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}
