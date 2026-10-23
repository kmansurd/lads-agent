import type { CourseView } from '@/context/NavigationContext';

export type StorytellerChatMessage = {
  text: string;
  sender: 'user' | 'bot';
};

export type StorytellerSession = {
  id: string;
  courseId: string | null;
  view: CourseView;
  title: string;
  updatedAt: number;
  messages: StorytellerChatMessage[];
};

const SESSIONS_KEY = 'lads.storyteller.sessions';
const ACTIVE_KEY = 'lads.storyteller.activeIds';
const LEGACY_KEY = 'lads.storyteller.history';

const VIEWS: CourseView[] = ['overview', 'grades', 'engagement', 'students', 'discussions'];

function scopeKey(courseId: string | null, view: CourseView): string {
  return `${courseId ?? '_none_'}:${view}`;
}

function isValidMessage(m: unknown): m is StorytellerChatMessage {
  if (!m || typeof m !== 'object') return false;
  const msg = m as StorytellerChatMessage;
  return (
    (msg.sender === 'user' || msg.sender === 'bot') &&
    typeof msg.text === 'string' &&
    msg.text.length > 0
  );
}

function isSession(value: unknown): value is StorytellerSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as StorytellerSession;
  return (
    typeof session.id === 'string' &&
    typeof session.title === 'string' &&
    typeof session.updatedAt === 'number' &&
    VIEWS.includes(session.view) &&
    Array.isArray(session.messages)
  );
}

function readSessions(): StorytellerSession[] {
  if (typeof window === 'undefined') return [];
  migrateLegacy();
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSession).map((session) => ({
      ...session,
      messages: session.messages.filter(isValidMessage),
    }));
  } catch {
    return [];
  }
}

function writeSessions(sessions: StorytellerSession[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch {
    // quota or private mode
  }
}

function readActiveMap(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

function writeActiveMap(map: Record<string, string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

function titleFromMessages(messages: StorytellerChatMessage[]): string {
  const firstUser = messages.find((m) => m.sender === 'user');
  const text = (firstUser?.text ?? 'New chat').replace(/\s+/g, ' ').trim();
  return text.length > 72 ? `${text.slice(0, 69)}…` : text || 'New chat';
}

function migrateLegacy(): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as unknown;
    localStorage.removeItem(LEGACY_KEY);
    if (!parsed || typeof parsed !== 'object') return;

    const sessions = readSessionsRaw();
    const active = readActiveMap();
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(value)) continue;
      const messages = value.filter(isValidMessage);
      if (messages.length === 0) continue;
      const split = key.indexOf(':');
      if (split < 0) continue;
      const coursePart = key.slice(0, split);
      const view = key.slice(split + 1) as CourseView;
      if (!VIEWS.includes(view)) continue;
      const courseId = coursePart === '_none_' ? null : coursePart;
      const session: StorytellerSession = {
        id: crypto.randomUUID(),
        courseId,
        view,
        title: titleFromMessages(messages),
        updatedAt: Date.now(),
        messages,
      };
      sessions.push(session);
      active[scopeKey(courseId, view)] = session.id;
    }
    writeSessions(sessions);
    writeActiveMap(active);
  } catch {
    // leave legacy key if parse fails so a later load can retry
  }
}

function readSessionsRaw(): StorytellerSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSession);
  } catch {
    return [];
  }
}

export function listStorytellerSessions(
  courseId: string | null,
  view: CourseView,
): StorytellerSession[] {
  return readSessions()
    .filter((session) => session.courseId === courseId && session.view === view && session.messages.length > 0)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function readActiveStorytellerSession(
  courseId: string | null,
  view: CourseView,
): StorytellerSession | null {
  const id = readActiveMap()[scopeKey(courseId, view)];
  if (!id) return null;
  return readSessions().find((session) => session.id === id) ?? null;
}

export function saveStorytellerSession(
  courseId: string | null,
  view: CourseView,
  messages: StorytellerChatMessage[],
  sessionId?: string | null,
): string | null {
  if (messages.length === 0) return sessionId ?? null;
  const sessions = readSessions();
  const active = readActiveMap();
  const key = scopeKey(courseId, view);
  const id = sessionId || active[key] || crypto.randomUUID();
  const existing = sessions.find((session) => session.id === id);
  const next: StorytellerSession = {
    id,
    courseId,
    view,
    title: titleFromMessages(messages),
    updatedAt: Date.now(),
    messages,
  };
  const without = sessions.filter((session) => session.id !== id);
  without.push(existing ? { ...existing, ...next } : next);
  writeSessions(without);
  active[key] = id;
  writeActiveMap(active);
  return id;
}

/** Keep the current thread in history and start a blank conversation. */
export function startNewStorytellerSession(courseId: string | null, view: CourseView): void {
  const active = readActiveMap();
  delete active[scopeKey(courseId, view)];
  writeActiveMap(active);
}

export function openStorytellerSession(sessionId: string): StorytellerSession | null {
  const session = readSessions().find((item) => item.id === sessionId);
  if (!session) return null;
  const active = readActiveMap();
  active[scopeKey(session.courseId, session.view)] = session.id;
  writeActiveMap(active);
  return session;
}

export function deleteStorytellerSession(sessionId: string): void {
  const sessions = readSessions();
  const target = sessions.find((session) => session.id === sessionId);
  writeSessions(sessions.filter((session) => session.id !== sessionId));
  if (!target) return;
  const active = readActiveMap();
  const key = scopeKey(target.courseId, target.view);
  if (active[key] === sessionId) {
    delete active[key];
    writeActiveMap(active);
  }
}
