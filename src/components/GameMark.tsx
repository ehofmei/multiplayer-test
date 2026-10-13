import type { LibraryGame } from "./gameCatalog";

/** Small, static illustrations of the games' actual play objects. */
export function GameMark({ kind }: { kind: LibraryGame }) {
  const drawings = {
    sumo: (
      <>
        <ellipse
          cx="32"
          cy="38"
          rx="27"
          ry="19"
          fill="#203d54"
          stroke="#91d9d2"
        />
        <circle cx="32" cy="30" r="15" fill="#b7e94e" />
        <ellipse cx="32" cy="37" rx="9" ry="5" fill="#6e9134" />
        <path d="M24 25h3m10 0h3" stroke="#183328" />
      </>
    ),
    cycle: (
      <>
        <path d="M8 49h17V21h22" stroke="#65ded4" strokeWidth="7" />
        <path d="m44 12 14 9-14 9Z" fill="#cff45b" />
        <path d="M8 49h17V21h17" stroke="#e1fffc" />
      </>
    ),
    ship: (
      <>
        <rect
          x="9"
          y="9"
          width="46"
          height="46"
          rx="12"
          fill="#243f60"
          stroke="#77dbda"
        />
        <circle cx="24" cy="26" r="8" fill="#ffce79" />
        <path d="M39 19v15M35 24h8" stroke="#c7f0ec" strokeWidth="4" />
        <rect x="17" y="41" width="30" height="6" rx="3" fill="#7adbd3" />
      </>
    ),
    breakout: (
      <>
        <path
          d="M12 18h40M12 28h40M24 13v20m16-20v20"
          stroke="#80e5e1"
          strokeWidth="8"
        />
        <circle cx="38" cy="43" r="4" fill="#fff5cc" />
        <rect x="18" y="53" width="28" height="5" rx="2" fill="#cff45b" />
      </>
    ),
    pong: (
      <>
        <rect x="10" y="10" width="44" height="44" rx="8" fill="#183c47" />
        <path d="M23 16h19M20 48h19" stroke="#cff45b" strokeWidth="5" />
        <path d="m25 38 11-11" stroke="#9fcbcf" strokeDasharray="3 4" />
        <circle cx="37" cy="26" r="5" fill="#fffce5" />
      </>
    ),
    arena: (
      <>
        <rect x="13" y="13" width="38" height="38" rx="8" fill="#183c47" />
        <path d="M24 10h16M24 54h16" stroke="#cff45b" strokeWidth="5" />
        <path d="M10 24v16M54 24v16" stroke="#65ded4" strokeWidth="5" />
        <circle cx="33" cy="32" r="5" fill="#fffce5" />
      </>
    ),
    reaction: (
      <>
        <rect
          x="10"
          y="10"
          width="44"
          height="44"
          rx="12"
          fill="#fcce65"
          stroke="#fff2b7"
        />
        <circle cx="32" cy="32" r="14" fill="#193d51" />
        <path d="m33 18-9 16h8l-1 12 10-17h-8Z" fill="#fff0ae" />
      </>
    ),
    lights: (
      <>
        <rect x="8" y="8" width="48" height="48" rx="13" fill="#536263" />
        <circle cx="32" cy="32" r="20" fill="#263b3b" stroke="#b7c8bc" />
        <circle cx="32" cy="32" r="15" fill="#ffcf70" />
        <ellipse cx="28" cy="26" rx="7" ry="4" fill="#fff3c2" />
      </>
    ),
    bakery: (
      <>
        <path d="m13 33 5 21h28l5-21Z" fill="#c68ce2" />
        <path
          d="M12 33c-4-9 6-15 12-15-1-13 14-15 16-2 12-1 19 9 13 17Z"
          fill="#ffc6a5"
          stroke="#a36859"
        />
        <circle cx="26" cy="27" r="2" fill="#4a343f" />
        <circle cx="39" cy="27" r="2" fill="#4a343f" />
        <path d="M29 33q4 4 8 0" stroke="#4a343f" />
        <circle cx="33" cy="9" r="4" fill="#e97482" />
      </>
    ),
    minigolf: (
      <>
        <ellipse
          cx="30"
          cy="44"
          rx="24"
          ry="13"
          fill="#539a87"
          stroke="#9bdd9e"
        />
        <ellipse cx="38" cy="43" rx="7" ry="4" fill="#193d45" />
        <path d="M38 43V13l14 7-14 6" stroke="#ffc889" fill="#ffc889" />
        <circle cx="19" cy="37" r="5" fill="#fff9dc" />
        <path d="m8 17 5 3-3-5" stroke="#bfabf7" strokeWidth="4" />
      </>
    ),
    treasure: (
      <>
        <path d="M12 29h40v24H12Z" fill="#a76c45" stroke="#ffe0a2" />
        <path d="M12 29v-5q20-21 40 0v5Z" fill="#cf9a57" stroke="#ffe0a2" />
        <path d="M18 30v23m28-23v23" stroke="#f5c766" strokeWidth="4" />
        <rect x="28" y="33" width="8" height="10" rx="2" fill="#ffe58f" />
        <path d="m32 8 2 4 5 2-5 2-2 4-2-4-5-2 5-2Z" fill="#8ae2df" />
      </>
    ),
    picnic: (
      <>
        <rect
          x="8"
          y="8"
          width="48"
          height="48"
          rx="7"
          fill="#fff0ce"
          stroke="#b7826d"
        />
        <path
          d="M24 9v46m16-46v46M9 24h46M9 40h46"
          stroke="#bd9983"
          strokeDasharray="2 3"
        />
        <path d="M12 28h20v20H12Z" fill="#ef9877" />
        <path d="M29 12h20v20H39V22H29Z" fill="#94ba71" />
      </>
    ),
    seek: (
      <>
        <rect x="8" y="8" width="48" height="48" rx="9" fill="#193b56" />
        <path d="M16 25h33M16 39h33M25 16v33m14-33v33" stroke="#506e87" />
        <path d="M24 24h16v16H24Z" fill="#7ee2db" />
        <path
          d="M32 13v12m0 14v12M13 32h12m14 0h12"
          stroke="#fff2b5"
          strokeWidth="3"
        />
      </>
    ),
    glow: (
      <>
        <rect x="8" y="8" width="48" height="48" rx="9" fill="#243455" />
        <path d="M14 14h15v15H14Z" fill="#91e5d1" />
        <path d="M35 35h15v15H35Z" fill="#e6a1cf" />
        <path
          d="m35 14 15 15m-15-8 8 8m-1-15 8 8"
          stroke="#ffdb81"
          strokeWidth="5"
        />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 64 64"
      focusable="false"
      aria-hidden="true"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      {drawings[kind]}
    </svg>
  );
}
