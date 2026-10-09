import { useId, type Ref } from "react";
import { courses } from "../games/minigolf";

export function GolfBallArtwork({
  x,
  y,
  radius,
  color,
  rollingRef,
}: {
  x: number;
  y: number;
  radius: number;
  color: string;
  rollingRef?: Ref<SVGPathElement>;
}) {
  const id = `golf-ball-${useId().replace(/:/g, "")}`;
  return (
    <g pointerEvents="none" aria-hidden="true">
      <defs>
        <radialGradient id={id} cx=".3" cy=".25" r=".8">
          <stop stopColor="#ffffff" />
          <stop offset=".3" stopColor={color} />
          <stop offset="1" stopColor={color} />
        </radialGradient>
      </defs>
      <ellipse
        cx={x + 3}
        cy={y + 5}
        rx={radius + 1}
        ry={radius * 0.8}
        fill="#092922"
        opacity=".4"
      />
      <circle
        cx={x}
        cy={y}
        r={radius}
        fill={`url(#${id})`}
        stroke="#092922"
        strokeWidth="3"
      />
      {rollingRef && (
        <path
          ref={rollingRef}
          d={`M${-radius * 0.65} ${-radius * 0.65}Q${radius * 0.6} 0 ${-radius * 0.65} ${radius * 0.65}`}
          fill="none"
          stroke="#173d33"
          strokeWidth="1.8"
          opacity=".35"
        />
      )}
      <path
        d={`M${x - radius * 0.7} ${y + radius * 0.45}q${radius * 0.7} ${radius * 0.55} ${radius * 1.4} 0`}
        fill="none"
        stroke="#143c34"
        strokeWidth="2"
        opacity=".3"
      />
    </g>
  );
}

// All decoration uses the existing logical course coordinates. Gradients and
// shadows add depth without adding terrain rules or changing collision shapes.
export function GolfCourseArtwork({
  hole,
  impacted,
  portrait,
}: {
  hole: number;
  impacted: boolean;
  portrait: boolean;
}) {
  const course = courses[Math.max(0, hole - 1)];
  const prefix = `golf-${useId().replace(/:/g, "")}`;
  const id = (name: string) => `${prefix}-${name}`;
  const paint = (name: string) => `url(#${id(name)})`;
  const [cupX, cupY] = course.cup;
  const [teeX, teeY] = course.tee;
  return (
    <g className="golf-artwork" pointerEvents="none" aria-hidden="true">
      <defs>
        <linearGradient id={id("green")} x2=".25" y2="1">
          <stop stopColor="#367b58" />
          <stop offset="1" stopColor="#174f43" />
        </linearGradient>
        <linearGradient id={id("rail")} x2="0" y2="1">
          <stop stopColor="#deebbc" />
          <stop offset=".45" stopColor="#96b890" />
          <stop offset="1" stopColor="#5e8876" />
        </linearGradient>
        <linearGradient id={id("stone")} x2="1" y2=".3">
          <stop stopColor="#78998d" />
          <stop offset=".35" stopColor="#c5d5bc" />
          <stop offset="1" stopColor="#91b4a1" />
        </linearGradient>
        <radialGradient id={id("mushroom")} cx=".3" cy=".25" r=".8">
          <stop stopColor="#ffd1a9" />
          <stop offset=".4" stopColor="#f59e98" />
          <stop offset="1" stopColor="#b95176" />
        </radialGradient>
        <radialGradient id={id("cup")} cx=".5" cy=".85">
          <stop stopColor="#205d4c" />
          <stop offset=".6" stopColor="#102f2e" />
          <stop offset="1" stopColor="#081e26" />
        </radialGradient>
        <linearGradient id={id("flag")} x2=".8" y2="1">
          <stop stopColor="#fff3ad" />
          <stop offset=".5" stopColor="#f8cd75" />
          <stop offset="1" stopColor="#df975c" />
        </linearGradient>
        <radialGradient id={id("warning")}>
          <stop stopColor="#fbc381" stopOpacity=".15" />
          <stop offset=".8" stopColor="#fbc381" stopOpacity=".03" />
          <stop offset="1" stopColor="#fbc381" stopOpacity=".12" />
        </radialGradient>
        <pattern
          id={id("stripes")}
          width="160"
          height="160"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-30)"
        >
          <rect width="80" height="160" fill="#b9de95" opacity=".045" />
        </pattern>
        <pattern
          id={id("grass")}
          width="64"
          height="58"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="m12 16 2-4 2 4m30 29 2-3 2 3"
            fill="none"
            stroke="#c4df9a"
            strokeWidth="1.5"
            opacity=".13"
          />
          <circle cx="38" cy="12" r="1" fill="#112e32" opacity=".18" />
          <circle cx="15" cy="43" r="1" fill="#c4df9a" opacity=".12" />
        </pattern>
        <pattern
          id={id("stars")}
          width="240"
          height="210"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M110 52h12m-6-6v12"
            stroke="#e7eab2"
            strokeWidth="2"
            opacity=".15"
          />
          <circle cx="208" cy="150" r="2" fill="#c5e5c6" opacity=".2" />
        </pattern>
      </defs>

      <rect width="1000" height="700" fill={paint("green")} />
      <rect width="1000" height="700" fill={paint("stripes")} />
      <rect width="1000" height="700" fill={paint("grass")} />
      <rect width="1000" height="700" fill={paint("stars")} />
      {/* Square rails follow the square boundary; the ball radius supplies its
          existing ten-unit clearance. No rounded playable corners are implied. */}
      <path
        d="M0 700V0h1000v700"
        fill="none"
        stroke={paint("rail")}
        strokeWidth="20"
      />
      <path d="M0 700h1000" stroke="#476d60" strokeWidth="20" />
      <path
        d="M10 690V10h980"
        fill="none"
        stroke="#edfad1"
        strokeOpacity=".55"
        strokeWidth="2"
      />
      <path
        d="M990 10v680H10"
        fill="none"
        stroke="#0e342f"
        strokeOpacity=".6"
        strokeWidth="3"
      />
      {[70, 930].map((x) => (
        <g key={x} fill="#d9dfb0" stroke="#5e8972" strokeWidth="2">
          <path d={`M${x} 3l6 7-6 7-6-7Z`} />
          <path d={`M${x} 683l6 7-6 7-6-7Z`} />
        </g>
      ))}

      <g transform={`translate(${teeX} ${teeY})`}>
        <circle
          r="38"
          fill="#d5dfa2"
          fillOpacity=".06"
          stroke="#dce7b1"
          strokeOpacity=".4"
          strokeWidth="2"
        />
        <path
          d="M-19 31h38m-13 7h26"
          stroke="#e6eeb6"
          strokeOpacity=".5"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>

      {[160, 80].map((r) => (
        <circle
          key={r}
          cx={cupX}
          cy={cupY}
          r={r}
          fill="none"
          stroke="#d3e6b4"
          strokeOpacity=".4"
          strokeWidth="2"
          strokeDasharray="5 14"
        />
      ))}
      <g
        data-golf-object="cup"
        transform={`translate(${cupX} ${cupY})${portrait ? " rotate(90)" : ""}`}
      >
        <ellipse cx="5" cy="7" rx="31" ry="27" fill="#092e2d" opacity=".35" />
        <circle r="27" fill={paint("rail")} />
        <circle r="24" fill={paint("cup")} />
        <path
          d="M-23 1a23 23 0 0 1 46 0"
          fill="none"
          stroke="#051c22"
          strokeWidth="4"
        />
        <path
          d="M-21 10a23 23 0 0 0 42 0"
          fill="none"
          stroke="#dcebbe"
          strokeWidth="2"
        />
        <path d="M3 0 39 18" stroke="#092e2d" strokeWidth="5" opacity=".25" />
        <path
          d="M0 0v-105"
          stroke="#0c3430"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M-1 0v-105"
          stroke="#e5edcc"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M1-104q25-9 60 16-28 21-60 18Z"
          fill={paint("flag")}
          stroke="#fff1ba"
          strokeWidth="2"
        />
        <path
          d="M8-101q22-3 43 13"
          fill="none"
          stroke="#fff5c8"
          strokeWidth="3"
          opacity=".6"
        />
        <text x="34" y="52" fill="#f5f1c7" fontSize="24" fontWeight="bold">
          100
        </text>
      </g>

      {course.walls.map(([x, y, w, h], i) => (
        <g key={i} data-golf-object="wall">
          <rect
            x={x + 5}
            y={y + 7}
            width={w}
            height={h}
            fill="#0a302c"
            opacity=".28"
          />
          <rect x={x} y={y} width={w} height={h} fill="#41675f" />
          <path d={`M${x} ${y}h${w}l-6 7h${6 - w}Z`} fill="#e3e7c4" />
          <rect
            x={x + 5}
            y={y + 7}
            width={w - 11}
            height={h - 15}
            fill={paint("stone")}
          />
          <path d={`M${x + w} ${y}v${h}l-6-8V${y + 7}Z`} fill="#557e6f" />
          <path d={`M${x} ${y + h}h${w}l-6-8H${x + 5}Z`} fill="#34594f" />
          {[0.25, 0.5, 0.75].map((fraction) => (
            <path
              key={fraction}
              d={`M${x + 5} ${y + h * fraction}h${w - 11}`}
              stroke="#597f6d"
              strokeWidth="2"
              opacity=".65"
            />
          ))}
          <path
            d={`M${x + 7} ${y + 10}v${h - 23}`}
            stroke="#f1f1d4"
            strokeWidth="2"
            opacity=".55"
          />
        </g>
      ))}
      {course.mushrooms.map(([x, y], i) => (
        <g
          key={i}
          transform={`translate(${x} ${y})`}
          data-golf-object="mushroom"
        >
          <ellipse cx="4" cy="9" rx="32" ry="27" fill="#0a302c" opacity=".3" />
          <g data-golf-mushroom-body={i}>
            <circle r="30" fill={paint("mushroom")} />
            <path
              d="M-24 15q24 19 48 0"
              fill="none"
              stroke="#8f3d69"
              strokeWidth="5"
            />
            <path
              d="M-9 24q9 5 18 0"
              fill="none"
              stroke="#ffdaae"
              strokeWidth="4"
            />
            <circle cx="-11" cy="-9" r="7" fill="#fff1d0" />
            <circle cx="13" cy="-3" r="6" fill="#ffe8cf" />
            <circle cx="-2" cy="12" r="5" fill="#ffe8cf" />
            <path
              d="M-22-11q7-13 22-13"
              fill="none"
              stroke="#ffe5be"
              strokeWidth="3"
              strokeLinecap="round"
              opacity=".8"
            />
            <circle r="30" fill="none" stroke="#ffe2c2" strokeWidth="2" />
          </g>
        </g>
      ))}
      {course.meteor && (
        <g
          transform={`translate(${course.meteor[0]} ${course.meteor[1]})`}
          data-golf-object="meteor"
          data-impacted={impacted}
        >
          <circle
            r="90"
            fill={paint("warning")}
            stroke="#ffc38e"
            strokeDasharray="10 10"
            strokeWidth="3"
          />
          {[-1, 1].map((side) => (
            <path
              key={side}
              d={`M${side * 76} 0h${side * 12}M0 ${side * 76}v${side * 12}`}
              stroke="#ffce9a"
              strokeWidth="4"
            />
          ))}
          {impacted ? (
            <>
              <ellipse cy="8" rx="38" ry="28" fill="#103930" opacity=".65" />
              <ellipse
                cy="5"
                rx="34"
                ry="24"
                fill="#6a6550"
                stroke="#d8ad7b"
                strokeWidth="3"
              />
              <ellipse cy="7" rx="24" ry="16" fill="#334b40" />
              <path
                d="m-14 2 10 5-3 12m25-10-9 2-3-9"
                fill="none"
                stroke="#e5ac73"
                strokeWidth="3"
              />
            </>
          ) : (
            <>
              <path
                d="m-28-27 28 14m-11-25 16 24M-36-6l23 4"
                stroke="#f4ba80"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="m-14-10 11-9 20 9 4 17-14 12-19-7Z"
                fill={paint("flag")}
                stroke="#ffe0aa"
                strokeWidth="2"
              />
              <path d="m-3-10 11 4-3 10-10-3Z" fill="#ba765b" opacity=".7" />
            </>
          )}
          <text
            transform={portrait ? "rotate(90)" : undefined}
            y="60"
            textAnchor="middle"
            fontSize="22"
            fontWeight="bold"
            fill="#ffdeb0"
          >
            {impacted ? "Impact" : "Incoming"}
          </text>
        </g>
      )}
    </g>
  );
}
