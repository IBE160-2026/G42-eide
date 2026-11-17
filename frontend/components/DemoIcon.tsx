/** Screen-with-play icon for the DEMO banner, from the refined mockup. Decorative. */
export default function DemoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M10 9l5 3-5 3z" fill="currentColor" />
    </svg>
  );
}
