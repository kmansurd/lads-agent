'use client';
import React, { useEffect, useState } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Divider,
  ListItemButton,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Tooltip,
  CircularProgress,
  IconButton,
  TextField,
  Button,
  Typography,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  ChevronLeft,
  ChevronRight,
  Settings as SettingsIcon,
  Visibility,
  VisibilityOff,
  HomeOutlined,
  MenuBookOutlined,
  TrendingUpOutlined,
  PeopleOutlined,
  ForumOutlined,
} from '@mui/icons-material';
import { useCourse } from '@/context/CourseContext';
import { useCanvasAuth } from '@/context/CanvasAuthContext';
import { useColorMode } from '@/context/ColorModeContext';
import type { ThemeModePreference } from '@/lib/client/themeModeStorage';
import {
  DETAIL_VIEWS,
  type CourseView,
  useNavigation,
} from '@/context/NavigationContext';

const EXPANDED_WIDTH = 260;
const COLLAPSED_WIDTH = 72;

const DETAIL_ICONS: Record<CourseView, React.ReactElement> = {
  overview: <HomeOutlined />,
  grades: <MenuBookOutlined />,
  engagement: <TrendingUpOutlined />,
  students: <PeopleOutlined />,
  discussions: <ForumOutlined />,
};

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [tokenDraft, setTokenDraft] = useState('');
  const [apiUrlDraft, setApiUrlDraft] = useState('');
  const [apiUrlError, setApiUrlError] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [genAiKeyDraft, setGenAiKeyDraft] = useState('');
  const [showGenAiKey, setShowGenAiKey] = useState(false);
  const { courses, courseId, setCourseId, loading } = useCourse();
  const {
    savedToken,
    savedApiUrl,
    hasSavedToken,
    savedGenAiApiKey,
    hasSavedGenAiApiKey,
    saveToken,
    saveApiUrl,
    clearToken,
    saveGenAiApiKey,
    clearGenAiApiKey,
  } = useCanvasAuth();
  const { view, setView } = useNavigation();
  const { mode: themeMode, setMode: setThemeMode } = useColorMode();

  useEffect(() => {
    setTokenDraft(savedToken);
  }, [savedToken]);

  useEffect(() => {
    setApiUrlDraft(savedApiUrl);
  }, [savedApiUrl]);

  useEffect(() => {
    setGenAiKeyDraft(savedGenAiApiKey);
  }, [savedGenAiApiKey]);

  const handleSettingsClick = () => {
    if (collapsed) {
      setCollapsed(false);
      setOpenSettings(true);
      return;
    }
    setOpenSettings(!openSettings);
  };

  const handleCourseChange = (event: SelectChangeEvent) => {
    setCourseId(event.target.value);
  };

  const handleSaveSettings = () => {
    setApiUrlError(null);
    const urlErr = saveApiUrl(apiUrlDraft);
    if (urlErr) {
      setApiUrlError(urlErr);
      return;
    }
    saveToken(tokenDraft);
    saveGenAiApiKey(genAiKeyDraft);
  };

  const tokenDirty = tokenDraft.trim() !== savedToken;
  const apiUrlDirty = apiUrlDraft.trim().replace(/\/$/, '') !== savedApiUrl;
  const genAiKeyDirty = genAiKeyDraft.trim() !== savedGenAiApiKey;
  const settingsDirty = tokenDirty || apiUrlDirty || genAiKeyDirty;
  const sidebarWidth = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  const navButton = (id: CourseView, label: string, indent = false) => {
    const selected = view === id;
    return (
      <Tooltip key={id} title={label} placement="right" disableHoverListener={!collapsed}>
        <ListItemButton
          selected={selected}
          onClick={() => setView(id)}
          sx={{
            justifyContent: collapsed ? 'center' : 'flex-start',
            px: collapsed ? 1 : 2,
            pl: collapsed ? 1 : indent ? 3.5 : 2,
            py: 0.75,
          }}
        >
          {collapsed ? (
            <Box
              component="span"
              sx={{
                color: selected ? 'primary.main' : 'text.primary',
                display: 'flex',
                opacity: selected ? 1 : 0.85,
              }}
            >
              {DETAIL_ICONS[id]}
            </Box>
          ) : (
            <ListItemText
              primary={label}
              primaryTypographyProps={{
                fontSize: '0.9375rem',
                fontWeight: selected ? 600 : indent ? 400 : 500,
                color: 'text.primary',
              }}
            />
          )}
        </ListItemButton>
      </Tooltip>
    );
  };

  return (
    <Box
      sx={{
        width: sidebarWidth,
        flexShrink: 0,
        bgcolor: (theme) => theme.palette.background.paper,
        backgroundImage: (theme) =>
          `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
        height: '100%',
        alignSelf: 'stretch',
        borderRight: '1px solid',
        borderColor: 'divider',
        backdropFilter: 'saturate(180%) blur(12px)',
        transition: (theme) =>
          theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          px: collapsed ? 0.5 : 1,
          py: 1,
          minHeight: 56,
          flexShrink: 0,
        }}
      >
        {!collapsed && (
          <Tooltip title="Learning Analytics Data Storytelling Agent">
            <Typography
              variant="subtitle1"
              sx={{
                px: 1,
                lineHeight: 1.2,
                flex: 1,
                textAlign: 'center',
                fontWeight: 600,
                letterSpacing: '-0.02em',
              }}
            >
              LADS Agent
            </Typography>
          </Tooltip>
        )}
        <Tooltip title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <IconButton
            size="small"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </IconButton>
        </Tooltip>
      </Box>
      <Divider />
      <List sx={{ flex: 1, py: 0.5, overflowY: 'auto' }}>
        {navButton('overview', 'Overview')}
        {!collapsed ? (
          <ListItem disablePadding sx={{ display: 'block' }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ pl: 3, pt: 1.5, pb: 0.5, display: 'block' }}
            >
              Course views
            </Typography>
          </ListItem>
        ) : null}
        {DETAIL_VIEWS.map(({ id, label }) => navButton(id, label, !collapsed))}
      </List>
      <Divider />
      <Box sx={{ flexShrink: 0, pb: 1 }}>
        <Tooltip title="Settings" placement="right" disableHoverListener={!collapsed}>
          <ListItemButton
            onClick={handleSettingsClick}
            sx={{ justifyContent: collapsed ? 'center' : 'flex-start', px: collapsed ? 1 : 2 }}
          >
            {collapsed ? (
              <SettingsIcon color={openSettings ? 'primary' : 'inherit'} />
            ) : (
              <>
                <ListItemText primary="Settings" />
                {openSettings ? <ExpandMore /> : <ExpandLess />}
              </>
            )}
          </ListItemButton>
        </Tooltip>
        <Collapse in={!collapsed && openSettings} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItem sx={{ pl: 3, pr: 2, pt: 1, pb: 2, flexDirection: 'column', alignItems: 'stretch', gap: 1.5 }}>
              <Typography variant="caption" color="text.secondary">
                Canvas API URL
              </Typography>
              <TextField
                size="small"
                fullWidth
                placeholder="https://canvas.ust.hk/api/v1"
                value={apiUrlDraft}
                onChange={(e) => {
                  setApiUrlDraft(e.target.value);
                  if (apiUrlError) setApiUrlError(null);
                }}
                error={Boolean(apiUrlError)}
                helperText={apiUrlError ?? 'Must end with /api/v1'}
                autoComplete="off"
              />
              <Typography variant="caption" color="text.secondary">
                Canvas access token
              </Typography>
              <TextField
                size="small"
                fullWidth
                type={showToken ? 'text' : 'password'}
                placeholder="Paste personal access token"
                value={tokenDraft}
                onChange={(e) => setTokenDraft(e.target.value)}
                autoComplete="off"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowToken(!showToken)}
                        aria-label={showToken ? 'Hide token' : 'Show token'}
                        edge="end"
                      >
                        {showToken ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Typography variant="caption" color="text.secondary">
                HKUST GenAI API key (Data Storyteller)
              </Typography>
              <TextField
                size="small"
                fullWidth
                type={showGenAiKey ? 'text' : 'password'}
                placeholder="From HKUST API Developer Portal"
                value={genAiKeyDraft}
                onChange={(e) => setGenAiKeyDraft(e.target.value)}
                autoComplete="off"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowGenAiKey(!showGenAiKey)}
                        aria-label={showGenAiKey ? 'Hide GenAI key' : 'Show GenAI key'}
                        edge="end"
                      >
                        {showGenAiKey ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                Canvas URL, Canvas token, and GenAI key stay in this browser. They are sent with requests
                and are not saved on the server (optional server env fallbacks for local dev).
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSaveSettings}
                  disabled={!settingsDirty && !hasSavedToken && !hasSavedGenAiApiKey}
                >
                  {settingsDirty ? 'Save settings' : hasSavedToken || hasSavedGenAiApiKey ? 'Saved' : 'Save settings'}
                </Button>
                {hasSavedToken && (
                  <Button size="small" color="inherit" onClick={() => clearToken()}>
                    Clear Canvas
                  </Button>
                )}
                {hasSavedGenAiApiKey && (
                  <Button size="small" color="inherit" onClick={() => clearGenAiApiKey()}>
                    Clear GenAI
                  </Button>
                )}
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                  Appearance
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  size="small"
                  value={themeMode}
                  onChange={(_event, value: ThemeModePreference | null) => {
                    if (value) setThemeMode(value);
                  }}
                  aria-label="Color theme"
                  sx={{
                    '& .MuiToggleButton-root': {
                      flex: 1,
                      py: 0.75,
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      textTransform: 'none',
                      borderColor: 'divider',
                      '&.Mui-selected': {
                        bgcolor: 'action.selected',
                        color: 'text.primary',
                        '&:hover': { bgcolor: 'action.selected' },
                      },
                    },
                  }}
                >
                  <ToggleButton value="system">System</ToggleButton>
                  <ToggleButton value="light">White</ToggleButton>
                  <ToggleButton value="dark">Dark</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <FormControl fullWidth size="small" disabled={loading || courses.length === 0}>
                <InputLabel id="course-select-label">Course</InputLabel>
                <Select
                  labelId="course-select-label"
                  id="course-select"
                  value={courseId ?? ''}
                  label="Course"
                  onChange={handleCourseChange}
                >
                  {loading && (
                    <MenuItem value="">
                      <CircularProgress size={18} />
                    </MenuItem>
                  )}
                  {courses.map((course) => (
                    <MenuItem key={course.id} value={String(course.id)}>
                      {course.term ? `${course.name} (${course.term})` : course.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </ListItem>
          </List>
        </Collapse>
      </Box>
    </Box>
  );
};

export default Sidebar;
