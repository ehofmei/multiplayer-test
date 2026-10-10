import { SUMO_BODY } from "../games/sumo";

/** All decoration shares the simulation's top-down coordinates and ring edge. */
export function SumoArenaArtwork({
  radius,
  paint,
}: {
  radius: number;
  paint: string;
}) {
  return (
    <>
      <defs>
        <radialGradient id={`${paint}-floor`} cx="42%" cy="32%" r="75%">
          <stop stopColor="#31586d" />
          <stop offset="1" stopColor="#152a40" />
        </radialGradient>
        <linearGradient id={`${paint}-rim`} x2="0" y2="1">
          <stop stopColor="#7c9db4" />
          <stop offset="0.45" stopColor="#354b66" />
          <stop offset="1" stopColor="#152038" />
        </linearGradient>
        <linearGradient id={`${paint}-shell`} x2="0.3" y2="1">
          <stop stopColor="#fff" stopOpacity="0.7" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="1" stopColor="#10233e" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id={`${paint}-visor`} x2="0" y2="1">
          <stop stopColor="#314b68" />
          <stop offset="1" stopColor="#091528" />
        </linearGradient>
        <pattern
          id={`${paint}-tiles`}
          width="80"
          height="80"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M80 0H0V80"
            fill="none"
            stroke="#b5def2"
            strokeOpacity="0.08"
            strokeWidth="2"
          />
          <circle cx="40" cy="40" r="2" fill="#b5def2" opacity="0.12" />
        </pattern>
        <pattern
          id={`${paint}-danger`}
          width="32"
          height="32"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="32" height="32" fill="#2e2532" />
          <rect width="12" height="32" fill="#b87958" opacity="0.3" />
        </pattern>
        <clipPath id={`${paint}-safe`}>
          <circle cx="500" cy="500" r={radius} />
        </clipPath>
      </defs>
      <ellipse
        cx="500"
        cy="526"
        rx="474"
        ry="466"
        fill="#060d1a"
        opacity="0.7"
      />
      <circle
        cx="500"
        cy="500"
        r="474"
        fill={`url(#${paint}-rim)`}
        stroke="#0d192d"
        strokeWidth="8"
      />
      <circle
        cx="500"
        cy="500"
        r="459"
        fill="#101c30"
        stroke="#8ca9bd"
        strokeOpacity="0.35"
        strokeWidth="3"
      />
      <circle cx="500" cy="500" r="447" fill={`url(#${paint}-danger)`} />
      <circle cx="500" cy="500" r={radius} fill={`url(#${paint}-floor)`} />
      <g clipPath={`url(#${paint}-safe)`}>
        <rect width="1000" height="1000" fill={`url(#${paint}-tiles)`} />
        <circle
          cx="500"
          cy="500"
          r="270"
          fill="none"
          stroke="#9ccdde"
          strokeOpacity="0.13"
          strokeWidth="3"
          strokeDasharray="16 20"
        />
        <circle
          cx="500"
          cy="500"
          r="100"
          fill="#142b41"
          fillOpacity="0.35"
          stroke="#a5d8eb"
          strokeOpacity="0.15"
          strokeWidth="3"
        />
        <path
          d="m500 452 42 24v48l-42 24-42-24v-48z"
          fill="none"
          stroke="#a5d8eb"
          strokeOpacity="0.25"
          strokeWidth="5"
        />
        <path
          d="M486 500h28m-14-14v28"
          stroke="#a5d8eb"
          strokeOpacity="0.35"
          strokeWidth="4"
        />
      </g>
      <circle
        cx="500"
        cy="500"
        r={radius}
        fill="none"
        stroke="#65eff2"
        strokeOpacity="0.13"
        strokeWidth="28"
      />
      <circle
        cx="500"
        cy="500"
        r={radius}
        fill="none"
        stroke="#80f4ee"
        strokeWidth="7"
      />
      <circle
        cx="500"
        cy="500"
        r={radius}
        fill="none"
        stroke="#e2ffff"
        strokeWidth="2"
      />
      {Array.from({ length: 12 }, (_, i) => (
        <g key={i} transform={`rotate(${i * 30} 500 500)`}>
          <path
            d="M488 35h24"
            stroke={i % 3 === 0 ? "#81eeed" : "#829ab0"}
            strokeWidth="6"
            strokeLinecap="round"
          />
        </g>
      ))}
    </>
  );
}

export function SumoBumperArtwork({
  color,
  number,
  local = false,
  alive = true,
  paint,
}: {
  color: string;
  number: number;
  local?: boolean;
  alive?: boolean;
  paint: string;
}) {
  const radius = SUMO_BODY * 1000;
  return (
    <g className="sumo-bot-art" data-local={local} data-out={!alive}>
      <ellipse cy="25" rx="36" ry="16" fill="#070e1d" opacity="0.5" />
      {local && alive && (
        <>
          <circle
            r={radius + 8}
            fill="none"
            stroke="#fff"
            strokeWidth="3"
            strokeDasharray="6 5"
          />
          <path
            d="m-9-58 9 10 9-10"
            fill="none"
            stroke="#fff"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      <circle r={radius} fill="#0b1729" stroke="#60768b" strokeWidth="2" />
      <path
        d="M-28 15a32 32 0 0 0 56 0"
        fill="none"
        stroke="#020a16"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cy="-3" r={radius - 5} fill={alive ? color : "#7f91a6"} />
      <circle cy="-3" r={radius - 5} fill={`url(#${paint}-shell)`} />
      <path
        d="M-22-18q22-15 44 0"
        fill="none"
        stroke="#fff"
        strokeOpacity="0.55"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect
        x="-23"
        y="-17"
        width="46"
        height="20"
        rx="10"
        fill={`url(#${paint}-visor)`}
        stroke="#071325"
        strokeWidth="2"
      />
      {alive ? (
        <path
          d="M-12-7h5m14 0h5"
          stroke="#e3ffff"
          strokeWidth="4"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="m-13-11 8 8m0-8-8 8m18-8 8 8m0-8-8 8"
          stroke="#bdcad7"
          strokeWidth="2"
        />
      )}
      <text
        y="22"
        textAnchor="middle"
        fontSize="30"
        fontWeight="900"
        fill="#0b1a2b"
      >
        {number}
      </text>
    </g>
  );
}
