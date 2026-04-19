/**
 * Single icon component with a name registry.
 * Usage: <Icon name="home" size={20} />
 */

const ICONS = {
  // UI icons
  home: (
    <>
      <path d="M3 12 12 4l9 8" />
      <path d="M5 10v10h14V10" />
    </>
  ),
  list: <path d="M4 6h16M4 12h16M4 18h10" />,
  chart: <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />,
  report: (
    <>
      <path d="M6 3h9l5 5v13H6z" />
      <path d="M14 3v6h6M9 14h6M9 17h4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  filter: <path d="M3 5h18M6 12h12M10 19h4" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  bell: (
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </>
  ),
  spark: (
    <>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  download: <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />,
  alert: (
    <>
      <path d="M12 3 2 21h20z" />
      <path d="M12 10v5M12 18v.5" />
    </>
  ),
  check: <path d="m5 12 5 5 9-10" />,
  arrowUp: <path d="M12 2v20M5 9l7-7 7 7" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v1M12 20v1M3 12h1M20 12h1M5.6 5.6l.7.7M17.7 17.7l.7.7M5.6 18.4l.7-.7M17.7 6.3l.7-.7" />
    </>
  ),
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,

  // Category icons
  food: (
    <>
      <path d="M7 2v7a3 3 0 0 0 3 3v10" />
      <path d="M7 2v7M4 2v7a3 3 0 0 0 3 3M17 2c-1.5 0-3 1.5-3 5s1.5 5 3 5" />
      <path d="M17 2v20" />
    </>
  ),
  housing: <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  transport: (
    <>
      <path d="M5 17h14l1-6-2-4H6l-2 4 1 6z" />
      <circle cx="8" cy="17" r="2" />
      <circle cx="16" cy="17" r="2" />
    </>
  ),
  shop: (
    <>
      <path d="M5 8h14l-1 12H6z" />
      <path d="M9 11V6a3 3 0 0 1 6 0v5" />
    </>
  ),
  health: <path d="M12 21s-8-5-8-11a5 5 0 0 1 8-4 5 5 0 0 1 8 4c0 6-8 11-8 11z" />,
  fun: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14c.6 1.5 2 2.5 4 2.5s3.4-1 4-2.5M9 10h.01M15 10h.01" />
    </>
  ),
  utilities: <path d="M13 3 4 14h7l-1 7 9-11h-7z" />,
  subscription: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
    </>
  ),
  savings: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 12h6M12 8v8" />
    </>
  )
};

export default function Icon({ name, size = 16, strokeWidth = 1.7, className = '', style = {} }) {
  const path = ICONS[name];
  if (!path) {
    if (typeof console !== 'undefined') console.warn(`Icon "${name}" not found`);
    return null;
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {path}
    </svg>
  );
}
