export function GolfGuide({
  angle,
  power,
  length = 180,
  color = "#e9edaa",
}: {
  angle: number;
  power: number;
  length?: number;
  color?: string;
}) {
  return (
    <g transform={`rotate(${angle})`} aria-hidden="true">
      <line
        x1="36"
        y1="0"
        x2={length - 10}
        y2="0"
        stroke="#092e2d"
        strokeWidth="11"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
      />
      <line
        className="golf-guide-track"
        x1="36"
        y1="0"
        x2={length - 10}
        y2="0"
        stroke="#f4f5db"
        strokeOpacity=".4"
        strokeWidth="5"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
      />
      <line
        className="golf-guide-power"
        x1="36"
        y1="0"
        x2={length - 10}
        y2="0"
        pathLength="100"
        stroke={color}
        strokeWidth="5"
        strokeDasharray={`${power * 100} 100`}
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={`M${length + 6} 0l-24-13v26Z`}
        fill="#fffde3"
        stroke="#092e2d"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </g>
  );
}
