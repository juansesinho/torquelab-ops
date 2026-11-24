export function BrandLogo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className="text-orange-500 shrink-0"
      aria-hidden="true"
    >
      <path
        d="M20 3L34.7 11.5V28.5L20 37L5.3 28.5V11.5L20 3Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M12.5 24.5A9.5 9.5 0 1 1 28.5 16"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M20 20L29.5 11.5"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <circle cx="20" cy="20" r="2.8" fill="currentColor" />
    </svg>
  );
}
