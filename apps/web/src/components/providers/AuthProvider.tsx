"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getAppOrigin } from "@/lib/get-app-origin";

import { resolveUsernameToEmail, upsertUserProfile } from "@/lib/api-client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  logout: () => Promise<void>;
  signInWithGoogle: (redirectTo?: string) => Promise<{ error: Error | null }>;
  signInWithEmailOrUsername: (
    identifier: string,
    password: string,
    redirectTo?: string
  ) => Promise<{ error: Error | null }>;
  signUpWithEmail: (
    username: string,
    email: string,
    password: string
  ) => Promise<{ error: Error | null; data?: any }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  logout: async () => {},
  signInWithGoogle: async () => ({ error: null }),
  signInWithEmailOrUsername: async () => ({ error: null }),
  signUpWithEmail: async () => ({ error: null }),
  resetPasswordForEmail: async () => ({ error: null }),
  updatePassword: async () => ({ error: null }),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = React.useMemo(() => createClient(), []);

  useEffect(() => {
    let mounted = true;

    async function handleAuthInit() {
      // 1. Detect if the browser landed on any page with an OAuth ?code= parameter
      if (typeof window !== "undefined") {
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const authCode = urlParams.get("code");
          if (authCode && !window.location.pathname.startsWith("/auth/callback")) {
            const { data, error } = await supabase.auth.exchangeCodeForSession(authCode);
            if (!error && data?.session && mounted) {
              setSession(data.session);
              setUser(data.session.user);
              setLoading(false);
              queryClient.invalidateQueries();
              const target = sessionStorage.getItem("netvigil_auth_redirect") || "/console";
              sessionStorage.removeItem("netvigil_auth_redirect");
              try {
                const cleanUrl = new URL(window.location.href);
                cleanUrl.searchParams.delete("code");
                window.history.replaceState({}, "", cleanUrl.pathname + (cleanUrl.search ? cleanUrl.search : ""));
              } catch {
                // ignore
              }
              router.replace(target);
              return;
            }
          }
        } catch {
          // Fall through to regular session check
        }
      }

      // 2. Standard session retrieval
      try {
        const { data, error } = await supabase.auth.getSession();
        if (mounted) {
          if (!error && data?.session) {
            setSession(data.session);
            setUser(data.session.user);
          }
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    handleAuthInit();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, currentSession: Session | null) => {
      if (mounted) {
        const prevUserId = user?.id;
        const newUserId = currentSession?.user?.id;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);
        if (prevUserId !== newUserId) {
          queryClient.clear();
          queryClient.invalidateQueries();
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, router, queryClient, user?.id]);

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      queryClient.clear();
      if (typeof window !== "undefined") {
        window.location.replace("/");
      } else {
        router.replace("/");
      }
    } catch (error) {
      console.error("Logout error:", error);
      queryClient.clear();
      if (typeof window !== "undefined") {
        window.location.replace("/");
      } else {
        router.replace("/");
      }
    }
  };

  const signInWithGoogle = async (redirectTo?: string) => {
    try {
      const origin =
        typeof window !== "undefined" && window.location?.origin
          ? window.location.origin.trim().replace(/\/$/, "")
          : getAppOrigin();

      if (typeof window !== "undefined" && redirectTo) {
        try {
          sessionStorage.setItem("netvigil_auth_redirect", redirectTo);
        } catch {
          // ignore
        }
      }

      const redirectUri = origin;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUri,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      return { error: error ? new Error(error.message) : null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const signInWithEmailOrUsername = async (
    identifier: string,
    password: string,
    redirectTo?: string
  ): Promise<{ error: Error | null }> => {
    try {
      let targetEmail = identifier.trim();

      // If not an email, resolve username to email via secure backend lookup
      if (!targetEmail.includes("@")) {
        const resolved = await resolveUsernameToEmail(targetEmail);
        if (!resolved.found || !resolved.email) {
          return { error: new Error("No account found with that username. Please check your username or email.") };
        }
        targetEmail = resolved.email;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password,
      });

      if (error) {
        return { error: new Error(error.message) };
      }

      if (data?.session) {
        setSession(data.session);
        setUser(data.session.user);
        queryClient.invalidateQueries();
        if (redirectTo) {
          router.replace(redirectTo);
        } else {
          router.replace("/console");
        }
      }

      return { error: null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const signUpWithEmail = async (
    username: string,
    email: string,
    password: string
  ): Promise<{ error: Error | null; data?: any }> => {
    try {
      const cleanUsername = username.trim().toLowerCase();
      const cleanEmail = email.trim().toLowerCase();

      // Sign up user via Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            username: cleanUsername,
            full_name: cleanUsername,
          },
        },
      });

      if (error) {
        return { error: new Error(error.message) };
      }

      // Record profile in backend
      if (data?.user) {
        try {
          await upsertUserProfile({
            username: cleanUsername,
            email: cleanEmail,
            full_name: cleanUsername,
          });
        } catch {
          // Profile fallback
        }
      }

      if (data?.session) {
        setSession(data.session);
        setUser(data.session.user);
        queryClient.invalidateQueries();
      }

      return { error: null, data };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const resetPasswordForEmail = async (email: string): Promise<{ error: Error | null }> => {
    try {
      const origin =
        typeof window !== "undefined" && window.location?.origin
          ? window.location.origin.trim().replace(/\/$/, "")
          : getAppOrigin();

      const redirectTo = `${origin}/auth/callback?type=recovery`;

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      return { error: error ? new Error(error.message) : null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const updatePassword = async (password: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      return { error: error ? new Error(error.message) : null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        logout,
        signInWithGoogle,
        signInWithEmailOrUsername,
        signUpWithEmail,
        resetPasswordForEmail,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
