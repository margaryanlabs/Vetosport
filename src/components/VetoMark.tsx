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
      <path
        d="M13.5 12.5 30.25 48c.72 1.53 2.87 1.56 3.64.05L51 12.5"
        stroke="#F7F7F8"
        strokeWidth="8"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <path
        d="M25.5 22.5h13"
        stroke="#FF2D2D"
        strokeWidth="5.2"
        strokeLinecap="square"
      />
    </svg>
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
      <path d="M3 5 15.5 31 28 5" stroke="#F7F7F8" strokeWidth="5" strokeLinecap="square" />
      <g stroke="#F7F7F8" strokeWidth="4.4" strokeLinecap="square">
        <path d="M42 6h19" />
        <path d="M42 18h15.5" />
        <path d="M42 30h19" />
      </g>
      <path d="M75 6h27M88.5 6v24" stroke="#F7F7F8" strokeWidth="4.4" strokeLinecap="square" />
      <rect x="115.5" y="6" width="31.5" height="24" rx="11.5" stroke="#F7F7F8" strokeWidth="4.4" />
      <path d="M8.7 14.5h10" stroke="#FF2D2D" strokeWidth="3.4" strokeLinecap="square" />
    </svg>
  );
}
