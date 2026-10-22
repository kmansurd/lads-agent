'use client';

import { useId } from 'react';
import { Box, keyframes, useTheme } from '@mui/material';

const barDance = keyframes`
  0%, 100% { transform: scaleY(0.45); }
  50% { transform: scaleY(1); }
`;

const arcDraw = keyframes`
  0% { stroke-dashoffset: 48; opacity: 0.55; }
  50% { opacity: 1; }
  100% { stroke-dashoffset: 0; opacity: 0.85; }
`;

const sparkOrbit = keyframes`
  0% { offset-distance: 0%; opacity: 0.4; transform: scale(0.85); }
  45% { opacity: 1; transform: scale(1.15); }
  100% { offset-distance: 100%; opacity: 0.5; transform: scale(0.9); }
`;

const haloPulse = keyframes`
  0%, 100% { transform: scale(0.92); opacity: 0.35; }
  50% { transform: scale(1.08); opacity: 0.65; }
`;

const twinkle = keyframes`
  0%, 100% { opacity: 0.25; transform: rotate(0deg) scale(0.8); }
  50% { opacity: 1; transform: rotate(18deg) scale(1); }
`;

type DataStorytellerIconProps = {
  size?: number;
  /** When true (chat open), motion is softer so the panel feels calm. */
  calm?: boolean;
};

export default function DataStorytellerIcon({ size = 28, calm = false }: DataStorytellerIconProps) {
  const theme = useTheme();
  const gradientId = `${useId().replace(/:/g, '')}-ds-story-gradient`;
  const primary = theme.palette.primary.main;
  const secondary = theme.palette.text.secondary;
  const duration = calm ? '4.5s' : '2.8s';
  const motionReduce = '@media (prefers-reduced-motion: reduce)';

  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        [motionReduce]: {
          '& *': { animation: 'none !important' },
        },
      }}
    >
      <Box
        component="span"
        sx={{
          position: 'absolute',
          inset: -2,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${primary}33 0%, transparent 70%)`,
          animation: calm ? `${haloPulse} 5s ease-in-out infinite` : `${haloPulse} 2.4s ease-in-out infinite`,
        }}
      />
      <Box
        component="svg"
        viewBox="0 0 32 32"
        sx={{
          width: size,
          height: size,
          overflow: 'visible',
          display: 'block',
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={primary} stopOpacity={0.55} />
            <stop offset="100%" stopColor={primary} stopOpacity={1} />
          </linearGradient>
        </defs>

        {/* Data bars */}
        {[0, 1, 2].map((i) => (
          <rect
            key={i}
            x={5 + i * 4.5}
            y={18}
            width={3}
            height={10}
            rx={1.2}
            fill={i === 1 ? `url(#${gradientId})` : primary}
            fillOpacity={i === 1 ? 1 : 0.72}
            style={{
              transformOrigin: `${6.5 + i * 4.5}px 28px`,
              animation: `${barDance} ${duration} ease-in-out infinite`,
              animationDelay: calm ? `${i * 0.35}s` : `${i * 0.18}s`,
            }}
          />
        ))}

        {/* Narrative arc rising from the data */}
        <path
          d="M 8 17 C 11 8, 18 6, 24 11 S 28 22, 22 26"
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={48}
          style={{
            animation: `${arcDraw} ${calm ? '5s' : '3.2s'} ease-in-out infinite alternate`,
          }}
        />

        {/* Spark traveling the arc */}
        <Box
          component="circle"
          cx={0}
          cy={0}
          r={2.2}
          fill={primary}
          sx={{
            offsetPath: `path("M 8 17 C 11 8, 18 6, 24 11 S 28 22, 22 26")`,
            offsetRotate: '0deg',
            animation: `${sparkOrbit} ${calm ? '5.5s' : '3.4s'} ease-in-out infinite`,
            filter: `drop-shadow(0 0 3px ${primary})`,
          }}
        />

        {/* Twinkle at the story end */}
        <g
          style={{
            transformOrigin: '22px 26px',
            animation: `${twinkle} ${calm ? '3.5s' : '2.2s'} ease-in-out infinite`,
          }}
        >
          <path
            d="M 22 22.5 L 22.6 24.8 L 25 25.4 L 22.6 26 L 22 28.4 L 21.4 26 L 19 25.4 L 21.4 24.8 Z"
            fill={secondary}
            fillOpacity={0.9}
          />
        </g>
      </Box>
    </Box>
  );
}
