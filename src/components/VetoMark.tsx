export function VetoMark({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M6 8H19.5L32 42.5L27 57L6 8Z" fill="currentColor" />
      <path d="M58 8H44.5L32 42.5L37 57L58 8Z" fill="currentColor" opacity="0.94" />
      <path d="M36.5 14H43L33.2 44.5L29.8 35.6L36.5 14Z" fill="var(--edge)" />
      <path d="M31.95 42.4L37 57H27L31.95 42.4Z" fill="var(--edge)" opacity="0.34" />
    </svg>
  );
}
