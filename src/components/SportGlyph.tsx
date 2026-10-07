import type { Sport } from "@/lib/domain/types";

export function SportGlyph({
  sport,
  size = 18,
  className = "",
}: {
  sport: Sport;
  size?: number;
  className?: string;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    className,
    "aria-hidden": true,
  } as const;

  if (sport === "football") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 7.2 15.1 9.45 13.9 13.05h-3.8L8.9 9.45 12 7.2Z" stroke="currentColor" strokeWidth="1.35" />
        <path d="m8.9 9.45-3.4.9M15.1 9.45l3.4.9M10.1 13.05 8.3 16.2M13.9 13.05l1.8 3.15M8.3 16.2l-1.05 1.25M15.7 16.2l1.05 1.25" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }

  if (sport === "basketball") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 3.75v16.5M3.75 12h16.5M6.3 5.9c2.2 1.4 3.2 3.45 3.2 6.1s-1 4.7-3.2 6.1M17.7 5.9c-2.2 1.4-3.2 3.45-3.2 6.1s1 4.7 3.2 6.1" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      </svg>
    );
  }

  if (sport === "tennis") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6.2 5.95c2.45 1.4 3.8 3.35 4.05 5.85.25 2.45-.65 4.65-2.7 6.6M17.8 5.95c-2.45 1.4-3.8 3.35-4.05 5.85-.25 2.45.65 4.65 2.7 6.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }

  if (sport === "hockey") {
    return (
      <svg {...common}>
        <ellipse cx="11" cy="17.1" rx="5.6" ry="2.2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6.1 16.35v2M15.9 16.35v2M16.7 4.2l-5.5 9.25c-.6 1-.15 2.25.95 2.75l4.25 1.95" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
