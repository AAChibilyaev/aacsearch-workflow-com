import React from 'react'

/**
 * AACSearch brand graphics for the admin panel (login logo + nav icon).
 * Pure inline SVG/JSX — no external assets (Workers-safe, importMap-safe).
 * Wired via admin.components.graphics: { Logo, Icon }.
 */

const BRAND_BLUE = '#2B6CEE'

const Mark: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <svg
    aria-hidden="true"
    fill="none"
    height={size}
    viewBox="0 0 32 32"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect fill={BRAND_BLUE} height={32} rx={7} width={32} />
    <circle cx={14.5} cy={14.5} r={6.25} stroke="#FFFFFF" strokeWidth={2.5} />
    <path d="M19.5 19.5L25 25" stroke="#FFFFFF" strokeLinecap="round" strokeWidth={2.5} />
  </svg>
)

/** Small mark for the admin nav / favicon area */
export const Icon: React.FC = () => <Mark size={26} />

/** Full wordmark for the login screen */
export const Logo: React.FC = () => (
  <div style={{ alignItems: 'center', display: 'flex', gap: '0.8rem' }}>
    <Mark size={44} />
    <span
      style={{
        color: 'var(--theme-text, currentColor)',
        fontSize: '2rem',
        fontWeight: 700,
        letterSpacing: '-0.03em',
        whiteSpace: 'nowrap',
      }}
    >
      AAC
      <span style={{ color: BRAND_BLUE }}>Search</span>
    </span>
  </div>
)
