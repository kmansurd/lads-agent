import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from 'react';
import {
  Box,
  Popover,
  TextField,
  Button,
  Typography,
  IconButton,
  alpha,
  FormControl,
  Select,
  MenuItem,
  Dialog,
  Slide,
  Tooltip,
} from '@mui/material';
import type { TransitionProps } from '@mui/material/transitions';
import DataStorytellerIcon from '@/components/DataStorytellerIcon';
import CloseIcon from '@mui/icons-material/Close';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import HistoryIcon from '@mui/icons-material/History';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import Snackbar from '@mui/material/Snackbar';
import CircularProgress from '@mui/material/CircularProgress';
import { useCourse } from '@/context/CourseContext';
import type { CourseView } from '@/context/NavigationContext';
import { fetchWithStorytellerAuth } from '@/lib/client/genaiKeyStorage';
import {
  deleteStorytellerSession,
  listStorytellerSessions,
  openStorytellerSession,
  readActiveStorytellerSession,
  saveStorytellerSession,
  startNewStorytellerSession,
  type StorytellerChatMessage,
  type StorytellerSession,
} from '@/lib/client/storytellerChatStorage';
import { readStoredEngagementCsv } from '@/lib/client/engagementCsvStorage';
import { buildEngagementCsvSummary } from '@/lib/storyteller/engagementCsvSummary';
import {
  readStoredStorytellerModel,
  writeStoredStorytellerModel,
} from '@/lib/client/storytellerModelStorage';
import {
  DEFAULT_STORYTELLER_MODEL,
  STORYTELLER_MODEL_OPTIONS,
} from '@/lib/genai/models';

export interface ChatBubbleHandle {
  openChat: () => void;
  addMessage: (text: string, sender: 'user' | 'bot') => void;
}

interface ChatBubbleProps {
  currentTab: string;
  view: CourseView;
}

const STARTERS: Record<CourseView, string[]> = {
  overview: ['What should I look at first?', 'Give me a short read of this course.'],
  grades: ['Where are students struggling?', 'Which assignments have the most missing work?'],
  engagement: ['When are students most active?', 'Which resources get the most attention?'],
  students: ['Who looks quiet or at risk?', 'Who is participating the most?'],
  discussions: ['Which topics drew the most people?', 'Who might be on the edge of the conversation?'],
};

const SlideUp = React.forwardRef(function SlideUp(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function formatWhen(ts: number): string {
  const minutes = Math.round((Date.now() - ts) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function MessageBubble({
  message,
  onCopy,
}: {
  message: StorytellerChatMessage;
  onCopy: (text: string) => void;
}) {
  const isUser = message.sender === 'user';
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        alignItems: 'flex-end',
        gap: 0.5,
        py: 0.6,
        '& .copy-msg': { opacity: 0 },
        '&:hover .copy-msg, &:focus-within .copy-msg': { opacity: 1 },
        '@media (hover: none)': { '& .copy-msg': { opacity: 0.85 } },
      }}
    >
      {isUser && (
        <Tooltip title="Copy">
          <IconButton
            className="copy-msg"
            size="small"
            aria-label="Copy your message"
            onClick={() => onCopy(message.text)}
            sx={{ mb: 0.25 }}
          >
            <ContentCopyIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
      )}
      <Box
        sx={{
          maxWidth: '82%',
          px: 1.75,
          py: 1.15,
          borderRadius: isUser ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
          bgcolor: isUser ? 'primary.main' : 'background.paper',
          color: isUser ? 'primary.contrastText' : 'text.primary',
          border: isUser ? 'none' : '1px solid',
          borderColor: 'divider',
          fontSize: '0.9375rem',
          lineHeight: 1.47,
          letterSpacing: '-0.011em',
          whiteSpace: 'pre-wrap',
        }}
      >
        {message.text}
      </Box>
      {!isUser && (
        <Tooltip title="Copy">
          <IconButton
            className="copy-msg"
            size="small"
            aria-label="Copy reply"
            onClick={() => onCopy(message.text)}
            sx={{ mb: 0.25 }}
          >
            <ContentCopyIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}

function ChatPanel({
  currentTab,
  expanded,
  messages,
  sending,
  question,
  modelOptions,
  selectedModel,
  historyOpen,
  sessions,
  activeSessionId,
  view,
  onQuestionChange,
  onAsk,
  onNewChat,
  onClose,
  onToggleExpand,
  onModelChange,
  onOpenHistory,
  onCloseHistory,
  onOpenSession,
  onDeleteSession,
  onCopyMessage,
  messagesContainerRef,
  messagesEndRef,
}: {
  currentTab: string;
  expanded: boolean;
  messages: StorytellerChatMessage[];
  sending: boolean;
  question: string;
  modelOptions: { id: string; label: string }[];
  selectedModel: string;
  historyOpen: boolean;
  sessions: StorytellerSession[];
  activeSessionId: string | null;
  view: CourseView;
  onQuestionChange: (value: string) => void;
  onAsk: (text?: string) => void;
  onNewChat: () => void;
  onClose: () => void;
  onToggleExpand: () => void;
  onModelChange: (modelId: string) => void;
  onOpenHistory: () => void;
  onCloseHistory: () => void;
  onOpenSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onCopyMessage: (text: string) => void;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <Box
      sx={{
        height: expanded ? '100%' : 520,
        minHeight: expanded ? 0 : 520,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
      }}
    >
      <Box
        sx={{
          px: 2.25,
          pt: 2,
          pb: 1.25,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
          {historyOpen ? (
            <IconButton size="small" onClick={onCloseHistory} aria-label="Back to chat">
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          ) : (
            <DataStorytellerIcon size={28} calm />
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{ fontWeight: 600, fontSize: '1.0625rem', letterSpacing: '-0.022em', lineHeight: 1.2 }}
            >
              {historyOpen ? 'Chat history' : 'Data Storyteller'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {historyOpen ? `${currentTab} · this course` : `${currentTab}`}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', flexShrink: 0, mt: -0.25 }}>
          <IconButton
            onClick={onToggleExpand}
            size="small"
            title={expanded ? 'Compact' : 'Expand'}
            aria-label={expanded ? 'Compact window' : 'Expand window'}
          >
            {expanded ? <CloseFullscreenIcon fontSize="small" /> : <OpenInFullIcon fontSize="small" />}
          </IconButton>
          <IconButton onClick={onClose} size="small" aria-label="Close chat">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {!historyOpen && (
        <Box sx={{ px: 2.25, pb: 1.25, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            size="small"
            startIcon={<HistoryIcon sx={{ fontSize: 16 }} />}
            onClick={onOpenHistory}
            sx={{
              borderRadius: 980,
              px: 1.5,
              minWidth: 0,
              color: 'text.primary',
              bgcolor: (theme) => alpha(theme.palette.text.primary, 0.05),
              '&:hover': { bgcolor: (theme) => alpha(theme.palette.text.primary, 0.08) },
            }}
          >
            History{sessions.length > 0 ? ` · ${sessions.length}` : ''}
          </Button>
          <Button
            size="small"
            onClick={onNewChat}
            sx={{
              borderRadius: 980,
              px: 1.5,
              minWidth: 0,
              color: 'primary.main',
            }}
          >
            New chat
          </Button>
          <FormControl size="small" sx={{ ml: 'auto', minWidth: 132, maxWidth: 180 }}>
            <Select
              value={selectedModel}
              onChange={(e) => onModelChange(String(e.target.value))}
              disabled={sending}
              displayEmpty
              sx={{
                borderRadius: 980,
                fontSize: '0.8125rem',
                '& .MuiSelect-select': { py: 0.6, pl: 1.5 },
              }}
            >
              {!modelOptions.some((m) => m.id === selectedModel) && selectedModel ? (
                <MenuItem value={selectedModel}>{selectedModel}</MenuItem>
              ) : null}
              {modelOptions.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {historyOpen ? (
        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 1.25, pb: 2 }}>
          {sessions.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ px: 1.5, py: 4, textAlign: 'center' }}>
              No earlier chats on {currentTab} yet. Ask something, then start a new chat to keep this one here.
            </Typography>
          ) : (
            sessions.map((session) => {
              const preview = [...session.messages].reverse().find((m) => m.sender === 'bot')?.text
                ?? session.messages[0]?.text
                ?? '';
              const current = session.id === activeSessionId;
              return (
                <Box
                  key={session.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'stretch',
                    borderRadius: 2.5,
                    mb: 0.5,
                    '&:hover': { bgcolor: (theme) => alpha(theme.palette.text.primary, 0.04) },
                  }}
                >
                  <Box
                    component="button"
                    type="button"
                    onClick={() => onOpenSession(session.id)}
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      textAlign: 'left',
                      border: 0,
                      background: 'transparent',
                      cursor: 'pointer',
                      font: 'inherit',
                      color: 'inherit',
                      px: 1.5,
                      py: 1.25,
                    }}
                  >
                    <Typography sx={{ fontSize: '0.9375rem', fontWeight: 500, letterSpacing: '-0.011em' }} noWrap>
                      {session.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }} noWrap>
                      {current ? 'Current · ' : ''}
                      {formatWhen(session.updatedAt)}
                      {preview ? ` · ${preview.replace(/\s+/g, ' ')}` : ''}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    aria-label="Delete chat"
                    onClick={() => onDeleteSession(session.id)}
                    sx={{ alignSelf: 'center', mr: 0.5 }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              );
            })
          )}
        </Box>
      ) : (
        <>
          <Box
            ref={messagesContainerRef}
            sx={{
              flexGrow: 1,
              minHeight: 0,
              overflowY: 'auto',
              mx: 1.5,
              mb: 1.5,
              px: 0.75,
              py: 0.5,
            }}
          >
            {messages.length === 0 && !sending && (
              <Box sx={{ px: 0.5, pt: 1 }}>
                <Typography
                  sx={{
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    letterSpacing: '-0.022em',
                    lineHeight: 1.2,
                    mb: 0.75,
                  }}
                >
                  Ask about {currentTab}.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 340 }}>
                  Answers use the course data on this tab. Earlier conversations stay in History.
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
                  {STARTERS[view].map((prompt) => (
                    <Button
                      key={prompt}
                      size="small"
                      onClick={() => onAsk(prompt)}
                      sx={{
                        borderRadius: 980,
                        px: 1.75,
                        py: 0.6,
                        color: 'text.primary',
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'transparent',
                        '&:hover': { bgcolor: (theme) => alpha(theme.palette.text.primary, 0.04) },
                      }}
                    >
                      {prompt}
                    </Button>
                  ))}
                </Box>
              </Box>
            )}
            {messages.map((msg, index) => (
              <MessageBubble key={`${index}-${msg.sender}`} message={msg} onCopy={onCopyMessage} />
            ))}
            {sending && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 0.5, py: 1 }}>
                Thinking…
              </Typography>
            )}
            <div ref={messagesEndRef} />
          </Box>
          <Box sx={{ px: 1.75, pb: 1.75, display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <TextField
              fullWidth
              placeholder="Ask a question"
              value={question}
              onChange={(e) => onQuestionChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onAsk();
                }
              }}
              disabled={sending}
              multiline
              maxRows={expanded ? 6 : 3}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '22px',
                  bgcolor: (theme) => alpha(theme.palette.text.primary, 0.04),
                  '& fieldset': { borderColor: 'transparent' },
                  '&:hover fieldset': { borderColor: 'divider' },
                  '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: 1 },
                },
              }}
            />
            <IconButton
              onClick={() => onAsk()}
              disabled={sending || !question.trim()}
              aria-label="Send"
              sx={{
                width: 36,
                height: 36,
                mb: 0.4,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { bgcolor: 'primary.dark' },
                '&.Mui-disabled': {
                  bgcolor: (theme) => alpha(theme.palette.text.primary, 0.08),
                  color: 'text.disabled',
                },
              }}
            >
              {sending ? <CircularProgress size={16} color="inherit" /> : <ArrowUpwardIcon fontSize="small" />}
            </IconButton>
          </Box>
        </>
      )}
    </Box>
  );
}

const glassPaperSx = {
  borderRadius: '22px',
  overflow: 'hidden',
  border: '1px solid',
  borderColor: 'divider',
  backgroundImage: 'none',
  boxShadow: '0 18px 50px rgba(0, 0, 0, 0.14)',
};

const ChatBubble = forwardRef<ChatBubbleHandle, ChatBubbleProps>(({ currentTab, view }, ref) => {
  const { courseId, courses } = useCourse();
  const anchorRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string | null>(null);
  const hydratedRef = useRef(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<StorytellerChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [modelOptions, setModelOptions] = useState(STORYTELLER_MODEL_OPTIONS);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_STORYTELLER_MODEL);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sessions, setSessions] = useState<StorytellerSession[]>([]);

  const refreshSessions = useCallback(() => {
    setSessions(listStorytellerSessions(courseId, view));
  }, [courseId, view]);

  useEffect(() => {
    setAnchorEl(anchorRef.current);
    setSelectedModel(readStoredStorytellerModel());
  }, []);

  useEffect(() => {
    hydratedRef.current = false;
    const active = readActiveStorytellerSession(courseId, view);
    sessionIdRef.current = active?.id ?? null;
    setActiveSessionId(active?.id ?? null);
    setMessages(active?.messages ?? []);
    setHistoryOpen(false);
    setSessions(listStorytellerSessions(courseId, view));
    hydratedRef.current = true;
  }, [courseId, view]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (messages.length === 0) return;
    const id = saveStorytellerSession(courseId, view, messages, sessionIdRef.current);
    sessionIdRef.current = id;
    setActiveSessionId(id);
    setSessions(listStorytellerSessions(courseId, view));
  }, [courseId, view, messages]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetchWithStorytellerAuth('/api/storyteller/models')
      .then((res) => res.json())
      .then((body: { models?: { id: string; label: string }[] }) => {
        if (!cancelled && body.models?.length) setModelOptions(body.models);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open]);

  useImperativeHandle(ref, () => ({
    openChat: () => setOpen(true),
    addMessage: (text: string, sender: 'user' | 'bot') => {
      setMessages((prev) => [...prev, { text, sender }]);
    },
  }));

  const scrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
      return;
    }
    messagesEndRef.current?.scrollIntoView({ block: 'nearest' });
  }, []);

  useEffect(() => {
    if (!historyOpen) scrollToBottom();
  }, [messages, open, expanded, historyOpen, scrollToBottom]);

  const handleClose = () => {
    setOpen(false);
    setExpanded(false);
    setHistoryOpen(false);
  };

  const handleNewChat = () => {
    if (messages.length > 0) {
      sessionIdRef.current = saveStorytellerSession(courseId, view, messages, sessionIdRef.current);
    }
    startNewStorytellerSession(courseId, view);
    sessionIdRef.current = null;
    setActiveSessionId(null);
    setMessages([]);
    setHistoryOpen(false);
    refreshSessions();
  };

  const handleOpenSession = (id: string) => {
    const session = openStorytellerSession(id);
    if (!session) return;
    sessionIdRef.current = session.id;
    setActiveSessionId(session.id);
    hydratedRef.current = false;
    setMessages(session.messages);
    hydratedRef.current = true;
    setHistoryOpen(false);
  };

  const handleDeleteSession = (id: string) => {
    deleteStorytellerSession(id);
    if (sessionIdRef.current === id) {
      sessionIdRef.current = null;
      setActiveSessionId(null);
      setMessages([]);
    }
    refreshSessions();
  };

  const copyText = async (text: string) => {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopyNotice('Copied');
    } catch {
      setCopyNotice('Could not copy');
    }
  };

  const courseLabel =
    courses.find((c) => String(c.id) === courseId)?.name ??
    courses.find((c) => String(c.id) === courseId)?.courseCode ??
    null;

  const handleAsk = useCallback(
    async (preset?: string) => {
      const asked = (preset ?? question).trim();
      if (!asked || sending) return;

      const withUser = [...messages, { text: asked, sender: 'user' as const }];
      setMessages(withUser);
      const savedId = saveStorytellerSession(courseId, view, withUser, sessionIdRef.current);
      sessionIdRef.current = savedId;
      setActiveSessionId(savedId);
      setQuestion('');
      setSending(true);
      setHistoryOpen(false);

      const apiMessages = withUser.map((m) => ({
        role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.text,
      }));

      let engagementCsvSummary: string | null = null;
      if (view === 'engagement' && courseId) {
        const storedCsv = readStoredEngagementCsv(courseId);
        if (storedCsv) {
          engagementCsvSummary = buildEngagementCsvSummary({
            activityTab: storedCsv.activityTab,
            chartRows: storedCsv.chartRows,
            chartFileName: storedCsv.chartFileName,
            chartFilter: storedCsv.chartFilter,
            resourceRows: storedCsv.resourceRows,
            resourceFileName: storedCsv.resourceFileName,
          });
        }
      }

      try {
        const res = await fetchWithStorytellerAuth('/api/storyteller/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: apiMessages,
            tab: view,
            courseId,
            courseLabel,
            model: selectedModel,
            engagementCsvSummary,
          }),
        });
        const body = (await res.json()) as { reply?: string; error?: string };
        if (!res.ok) throw new Error(body.error ?? 'Storyteller request failed.');
        setMessages((prev) => {
          const next = [...prev, { text: body.reply ?? '', sender: 'bot' as const }];
          const id = saveStorytellerSession(courseId, view, next, sessionIdRef.current);
          sessionIdRef.current = id;
          setActiveSessionId(id);
          return next;
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Something went wrong. Try again in a moment.';
        setMessages((prev) => {
          const next = [...prev, { text: message, sender: 'bot' as const }];
          const id = saveStorytellerSession(courseId, view, next, sessionIdRef.current);
          sessionIdRef.current = id;
          setActiveSessionId(id);
          return next;
        });
      } finally {
        setSending(false);
        setSessions(listStorytellerSessions(courseId, view));
      }
    },
    [question, sending, messages, view, courseId, courseLabel, selectedModel],
  );

  const panelProps = {
    currentTab,
    expanded,
    messages,
    sending,
    question,
    modelOptions,
    selectedModel,
    historyOpen,
    sessions,
    activeSessionId,
    view,
    onQuestionChange: setQuestion,
    onAsk: (text?: string) => void handleAsk(text),
    onNewChat: handleNewChat,
    onClose: handleClose,
    onToggleExpand: () => setExpanded((v) => !v),
    onModelChange: (modelId: string) => {
      setSelectedModel(modelId);
      writeStoredStorytellerModel(modelId);
    },
    onOpenHistory: () => {
      refreshSessions();
      setHistoryOpen(true);
    },
    onCloseHistory: () => setHistoryOpen(false),
    onOpenSession: handleOpenSession,
    onDeleteSession: handleDeleteSession,
    onCopyMessage: (text: string) => void copyText(text),
    messagesContainerRef,
    messagesEndRef,
  };

  const id = open ? 'data-storyteller-popover' : undefined;

  return (
    <>
      <Box
        ref={anchorRef}
        sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1200, pointerEvents: 'none' }}
      >
        <Box
          component="button"
          type="button"
          onClick={() => setOpen((wasOpen) => !wasOpen)}
          aria-label="Open Data Storyteller"
          aria-expanded={open}
          aria-controls={id}
          sx={{
            pointerEvents: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            px: { xs: 1.5, sm: 2 },
            py: 1,
            border: '1px solid',
            borderColor: (theme) => alpha(theme.palette.text.primary, 0.12),
            borderRadius: 980,
            cursor: 'pointer',
            font: 'inherit',
            color: 'text.secondary',
            backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.72),
            backdropFilter: 'saturate(180%) blur(20px)',
            WebkitBackdropFilter: 'saturate(180%) blur(20px)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
            transition: 'background-color 0.25s ease, box-shadow 0.25s ease, color 0.25s ease',
            '&:hover': {
              color: 'text.primary',
              backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.9),
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
            },
            '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
          }}
        >
          <DataStorytellerIcon size={26} calm={open} />
          <Typography
            component="span"
            variant="body2"
            sx={{ fontWeight: 500, letterSpacing: '-0.016em', display: { xs: 'none', sm: 'inline' } }}
          >
            Data Storyteller
          </Typography>
        </Box>
      </Box>

      {!expanded && (
        <Popover
          id={id}
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          disableScrollLock
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          slotProps={{
            paper: {
              sx: {
                ...glassPaperSx,
                width: { xs: 340, sm: 400 },
                maxWidth: 'calc(100vw - 32px)',
                mt: -1,
              },
            },
          }}
        >
          <ChatPanel {...panelProps} expanded={false} />
        </Popover>
      )}

      <Snackbar
        open={Boolean(copyNotice)}
        autoHideDuration={1600}
        onClose={() => setCopyNotice(null)}
        message={copyNotice ?? ''}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      <Dialog
        open={open && expanded}
        onClose={handleClose}
        TransitionComponent={SlideUp}
        fullWidth
        maxWidth={false}
        slotProps={{
          paper: {
            sx: {
              ...glassPaperSx,
              position: 'fixed',
              right: { xs: 12, sm: 20 },
              bottom: { xs: 12, sm: 20 },
              m: 0,
              width: { xs: 'calc(100vw - 24px)', sm: 560, md: 680 },
              maxWidth: 'calc(100vw - 24px)',
              height: { xs: 'min(88vh, 760px)', sm: 'min(86vh, 800px)' },
              maxHeight: 'calc(100vh - 24px)',
            },
          },
        }}
      >
        <ChatPanel {...panelProps} expanded />
      </Dialog>
    </>
  );
});

ChatBubble.displayName = 'ChatBubble';

export default ChatBubble;
