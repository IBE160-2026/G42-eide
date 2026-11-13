/** Open-book logo from the refined mockup. Decorative: hidden from assistive technology. */
export default function Logo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="30"
      height="30"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M3 6.5c3-1.5 6-1.5 9 0v13c-3-1.5-6-1.5-9 0zM21 6.5c-3-1.5-6-1.5-9 0v13c3-1.5 6-1.5 9 0z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
