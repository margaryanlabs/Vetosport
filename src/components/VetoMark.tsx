export function VetoMark({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      aria-hidden="true"
      alt=""
      className={`vetoMarkAsset ${className}`.trim()}
      width={size}
      height={size}
      src="/veto-mark.svg"
    />
  );
}

export function VetoWordmark({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      aria-label="VETO"
      className={className}
      viewBox="0 0 156 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M3 5 15.5 31 28 5" stroke="currentColor" strokeWidth="5" strokeLinecap="square" />
      <g stroke="currentColor" strokeWidth="4.4" strokeLinecap="square">
        <path d="M42 6h19" />
        <path d="M42 18h15.5" />
        <path d="M42 30h19" />
      </g>
      <path d="M75 6h27M88.5 6v24" stroke="currentColor" strokeWidth="4.4" strokeLinecap="square" />
      <rect x="115.5" y="6" width="31.5" height="24" rx="11.5" stroke="currentColor" strokeWidth="4.4" />
      <path d="M8.7 14.5h10" stroke="#FF2D2D" strokeWidth="3.4" strokeLinecap="square" />
    </svg>
  );
}
