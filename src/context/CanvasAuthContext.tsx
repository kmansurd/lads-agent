'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  DEFAULT_CANVAS_API_URL,
  normalizeCanvasApiUrl,
  validateCanvasApiUrl,
} from '@/lib/canvas/config';
import {
  readStoredCanvasApiUrl,
  writeStoredCanvasApiUrl,
} from '@/lib/client/canvasApiUrlStorage';
import { readStoredCanvasToken, writeStoredCanvasToken } from '@/lib/client/canvasTokenStorage';
import { readStoredGenAiApiKey, writeStoredGenAiApiKey } from '@/lib/client/genaiKeyStorage';

type CanvasAuthContextValue = {
  /** Token persisted in this browser (empty until the user saves one). */
  savedToken: string;
  hasSavedToken: boolean;
  /** Canvas REST base URL (defaults to HKUST). */
  savedApiUrl: string;
  /** False until localStorage has been read on the client. */
  authReady: boolean;
  /** Bumps when saved token or API URL changes so data hooks can refetch. */
  tokenRevision: number;
  saveToken: (token: string) => void;
  saveApiUrl: (apiUrl: string) => string | null;
  clearToken: () => void;
  savedGenAiApiKey: string;
  hasSavedGenAiApiKey: boolean;
  saveGenAiApiKey: (apiKey: string) => void;
  clearGenAiApiKey: () => void;
};

const CanvasAuthContext = createContext<CanvasAuthContextValue | null>(null);

export function CanvasAuthProvider({ children }: { children: React.ReactNode }) {
  const [savedToken, setSavedToken] = useState('');
  const [savedGenAiApiKey, setSavedGenAiApiKey] = useState('');
  const [savedApiUrl, setSavedApiUrl] = useState(DEFAULT_CANVAS_API_URL);
  const [tokenRevision, setTokenRevision] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSavedToken(readStoredCanvasToken());
    setSavedGenAiApiKey(readStoredGenAiApiKey());
    setSavedApiUrl(readStoredCanvasApiUrl());
    setHydrated(true);
  }, []);

  const saveToken = useCallback((token: string) => {
    const trimmed = token.trim();
    writeStoredCanvasToken(trimmed);
    setSavedToken(trimmed);
    setTokenRevision((n) => n + 1);
  }, []);

  const saveApiUrl = useCallback((apiUrl: string) => {
    try {
      validateCanvasApiUrl(normalizeCanvasApiUrl(apiUrl));
    } catch (err) {
      return err instanceof Error ? err.message : 'Invalid Canvas API URL';
    }
    writeStoredCanvasApiUrl(apiUrl);
    const next = readStoredCanvasApiUrl();
    setSavedApiUrl(next);
    setTokenRevision((n) => n + 1);
    return null;
  }, []);

  const clearToken = useCallback(() => {
    writeStoredCanvasToken('');
    setSavedToken('');
    setTokenRevision((n) => n + 1);
  }, []);

  const saveGenAiApiKey = useCallback((apiKey: string) => {
    const trimmed = apiKey.trim();
    writeStoredGenAiApiKey(trimmed);
    setSavedGenAiApiKey(trimmed);
    setTokenRevision((n) => n + 1);
  }, []);

  const clearGenAiApiKey = useCallback(() => {
    writeStoredGenAiApiKey('');
    setSavedGenAiApiKey('');
    setTokenRevision((n) => n + 1);
  }, []);

  const value = useMemo(
    () => ({
      savedToken: hydrated ? savedToken : '',
      hasSavedToken: hydrated && savedToken.length > 0,
      savedGenAiApiKey: hydrated ? savedGenAiApiKey : '',
      hasSavedGenAiApiKey: hydrated && savedGenAiApiKey.length > 0,
      savedApiUrl: hydrated ? savedApiUrl : DEFAULT_CANVAS_API_URL,
      authReady: hydrated,
      tokenRevision,
      saveToken,
      saveApiUrl,
      clearToken,
      saveGenAiApiKey,
      clearGenAiApiKey,
    }),
    [
      hydrated,
      savedToken,
      savedGenAiApiKey,
      savedApiUrl,
      tokenRevision,
      saveToken,
      saveApiUrl,
      clearToken,
      saveGenAiApiKey,
      clearGenAiApiKey,
    ],
  );

  return <CanvasAuthContext.Provider value={value}>{children}</CanvasAuthContext.Provider>;
}

export function useCanvasAuth() {
  const ctx = useContext(CanvasAuthContext);
  if (!ctx) {
    throw new Error('useCanvasAuth must be used within CanvasAuthProvider');
  }
  return ctx;
}
