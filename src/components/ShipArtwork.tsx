import type { ReactNode } from "react";
import { shipPanels } from "../games/ship-controls";

const ink = "#183e48";
const mint = "#b6e2cb";
const cream = "#fff1c6";
const blue = "#acd6f3";
const coral = "#f39786";
export const shipSwatches = ["#db665b", "#4d98d5", "#f5c953", "#65b17c"];
const star = (
  <path d="m32 9 6.8 14 15.5 2.3-11.2 10.9 2.6 15.4L32 44.3l-13.7 7.3 2.6-15.4L9.7 25.3 25.2 23Z" />
);
function Shape({ value }: { value: number }) {
  return [
    <circle key="c" cx="32" cy="32" r="20" />,
    <rect key="s" x="13" y="13" width="38" height="38" rx="5" />,
    <path key="t" d="m32 11 23 41H9Z" />,
    star,
  ][value];
}
function Picture({ label }: { label: string }) {
  switch (label) {
    case "Apple":
      return (
        <>
          <path
            fill={coral}
            d="M32 23c-20-12-27 9-19 25 4 8 11 9 19 5 8 4 15 3 19-5 8-16 1-37-19-25Z"
          />
          <path d="M32 24V12" />
          <path fill={mint} d="M33 17c1-9 11-10 16-7-2 8-9 12-16 7Z" />
          <path stroke="#fff4df" d="M19 30c-4 3-4 8-3 12" />
        </>
      );
    case "Banana":
      return (
        <>
          <path
            fill={cream}
            d="M13 14c3 24 23 34 40 13-4 27-33 37-44 8-2-6-1-16 4-21Z"
          />
          <path d="m12 14 2-5m39 18 3-3M16 33c6 13 19 15 30 5" />
        </>
      );
    case "Carrot":
      return (
        <>
          <path fill={mint} d="m34 23-8-15m10 13 7-13m-4 16 15-7" />
          <path fill="#f3a85c" d="M31 20c8-2 16 5 13 12L14 55c-3 2-5 0-3-3Z" />
          <path d="m24 31 7 5m-14 5 7 4" />
        </>
      );
    case "Fish":
      return (
        <>
          <path
            fill={blue}
            d="M12 31c10-18 29-18 37-5l10-7v26l-10-7C38 52 20 47 12 31Z"
          />
          <path fill={mint} d="m26 19 8-10 8 11m-14 25 8 10 7-12" />
          <circle fill={ink} cx="23" cy="29" r="2" />
          <path d="M38 22c-5 6-5 14 0 20" />
        </>
      );
    case "Sun":
      return (
        <>
          <circle fill={cream} cx="32" cy="32" r="15" />
          <path d="M32 5v7m0 40v7M5 32h7m40 0h7M13 13l5 5m28 28 5 5M13 51l5-5m28-28 5-5" />
        </>
      );
    case "Moon":
      return (
        <>
          <path
            fill={cream}
            d="M42 8C11 1 0 39 25 54c12 7 27 0 32-10C30 48 18 23 42 8Z"
          />
          <circle fill={blue} cx="47" cy="17" r="3" />
        </>
      );
    case "Star":
      return <g fill={cream}>{star}</g>;
    case "Earth":
      return (
        <>
          <circle fill={blue} cx="32" cy="32" r="24" />
          <path
            fill={mint}
            d="m19 12 10 5-2 10-9 4-8-5m45 4-10-7-9 8 4 9-1 14m-21-17 11 2 1 11-7 4"
          />
        </>
      );
    case "Cat":
      return (
        <>
          <path fill={cream} d="M11 32V12l15 9h12l15-9v20c5 32-47 32-42 0Z" />
          <path fill={coral} stroke="none" d="m15 19 8 5-8 5m34-10-8 5 8 5" />
          <path d="M23 34v3m18-3v3m-9 4-3 3 3 3 3-3Zm-17 0-9-2m9 8-9 2m43-8 9-2m-9 8 9 2" />
        </>
      );
    case "Dog":
      return (
        <>
          <path
            fill="#d8ae86"
            d="M18 22C2 13 2 42 13 47l8-14m25-11c16-9 16 20 5 25l-8-14"
          />
          <path fill={cream} d="M19 19c5-9 21-9 26 0l4 23c-1 19-33 19-34 0Z" />
          <path d="M24 31v3m16-3v3" />
          <path fill={ink} d="m27 40 5 6 5-6Z" />
          <path fill={coral} d="M28 48v5c0 7 8 7 8 0v-5" />
        </>
      );
    case "Bird":
      return (
        <>
          <path
            fill={blue}
            d="M17 38C8 8 44 4 49 26l10 6-12 5c-5 21-28 24-34 8L5 29Z"
          />
          <path fill={mint} d="M19 30c10-5 21 3 19 13-9 7-18-1-19-13Z" />
          <circle fill={ink} cx="40" cy="24" r="2" />
          <path d="m27 52-3 7m13-7 3 7" />
        </>
      );
  }
}
function Art({
  children,
  className = "",
  picture,
}: {
  children: ReactNode;
  className?: string;
  picture: string;
}) {
  return (
    <svg
      className={`ship-art ${className}`}
      viewBox="0 0 64 64"
      fill="none"
      stroke={ink}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-picture={picture}
    >
      {children}
    </svg>
  );
}
export function ShipSettingPicture({
  control,
  value,
}: {
  control: number;
  value: number;
}) {
  const panel = shipPanels[control];
  const label = panel.settings[value];
  let drawing: ReactNode;
  switch (panel.kind) {
    case "color":
      drawing = (
        <>
          <circle fill={shipSwatches[value]} cx="32" cy="32" r="25" />
          <g stroke={ink} strokeWidth="3.5">
            {
              [
                <path key="r" d="M21 20v24m11-27v30m11-27v24" />,
                <g key="b" fill={cream}>
                  <circle cx="23" cy="23" r="3" />
                  <circle cx="41" cy="23" r="3" />
                  <circle cx="23" cy="41" r="3" />
                  <circle cx="41" cy="41" r="3" />
                </g>,
                <path
                  key="y"
                  d="m17 24 7-5 8 5 8-5 7 5m-30 16 7-5 8 5 8-5 7 5"
                />,
                <path key="g" d="M32 18v28M18 32h28" />,
              ][value]
            }
          </g>
        </>
      );
      break;
    case "shape":
      drawing = (
        <g fill={blue}>
          <Shape value={value} />
        </g>
      );
      break;
    case "direction":
      drawing = (
        <g transform={`rotate(${value * 90} 32 32)`}>
          <path fill={mint} d="m32 7 21 22H40v26H24V29H11Z" />
        </g>
      );
      break;
    case "number":
      drawing = (
        <>
          <rect x="5" y="18" width="54" height="28" rx="9" fill={cream} />
          {[0, 1, 2].map((i) => (
            <circle
              key={i}
              cx={16 + i * 16}
              cy="32"
              r="5"
              fill={i < value ? ink : "none"}
              stroke={i < value ? ink : "#b4b5a9"}
            />
          ))}
        </>
      );
      break;
    case "picture":
      drawing = <Picture label={label} />;
      break;
    case "switch":
      drawing =
        panel.settings[0] === "Closed" ? (
          <>
            <rect fill={blue} x="10" y="8" width="44" height="48" rx="8" />
            <path fill={value ? ink : cream} d="M18 15h28v34H18Z" />
            {value ? (
              <path fill={mint} d="m18 15 17 6v32l-17-4Z" />
            ) : (
              <circle cx="39" cy="33" r="2" fill={ink} />
            )}
          </>
        ) : (
          <>
            <rect
              fill={value ? mint : "#dce4e2"}
              x="5"
              y="17"
              width="54"
              height="30"
              rx="15"
            />
            <circle
              fill={value ? ink : "#fffdf5"}
              cx={value ? 44 : 20}
              cy="32"
              r="11"
            />
            {value && <path stroke={cream} d="m39 32 4 4 6-7" />}
          </>
        );
      break;
  }
  return <Art picture={label}>{drawing}</Art>;
}
export function ShipPanelPicture({
  control,
  value,
}: {
  control: number;
  value: number;
}) {
  const name = shipPanels[control].name;
  const lit = shipSwatches[value];
  const on = value === 1;
  const drawings: Record<string, ReactNode> = {
    Lights: (
      <>
        <path
          fill={cream}
          d="M17 27c0-23 30-23 30 0 0 9-8 10-8 18H25c0-8-8-9-8-18Z"
        />
        <path fill={lit} d="M25 45h14v9H25Z" />
        <path d="M5 25h5m44 0h5M10 8l5 5m39-5-5 5" />
      </>
    ),
    Shield: (
      <>
        <path
          fill={mint}
          d="m32 5 24 9v18c-2 15-15 24-24 28C23 56 10 47 8 32V14Z"
        />
        <g transform="translate(15 15) scale(.53)" fill={blue}>
          <Shape value={value} />
        </g>
      </>
    ),
    Door: (
      <>
        <rect fill={blue} x="11" y="5" width="42" height="54" rx="5" />
        <path fill={on ? ink : cream} d="M19 12h26v40H19Z" />
        {on ? (
          <path fill={mint} d="m19 12 15 6v38l-15-4Z" />
        ) : (
          <circle fill={ink} cx="39" cy="34" r="2" />
        )}
      </>
    ),
    Engine: (
      <>
        <path fill={blue} d="M22 8h20l8 29H14Z" />
        <path fill={coral} d="m19 37 4 16 9-9 9 9 4-16Z" />
        <path d="M22 20h20M18 30h28" />
      </>
    ),
    Radar: (
      <>
        <circle fill={mint} cx="32" cy="32" r="25" />
        <circle cx="32" cy="32" r="16" />
        <circle cx="32" cy="32" r="7" />
        <path transform={`rotate(${value * 90} 32 32)`} d="M32 32V7" />
        <circle fill={cream} cx="44" cy="22" r="3" />
      </>
    ),
    Fan: (
      <>
        <circle fill={blue} cx="32" cy="30" r="24" />
        {[0, 120, 240].map((a) => (
          <path
            key={a}
            transform={`rotate(${a} 32 30)`}
            fill={on ? mint : cream}
            d="M32 30c-13-4-16-19-4-19 10 0 6 12 4 19Z"
          />
        ))}
        <circle fill={ink} cx="32" cy="30" r="4" />
        <path d="M32 54v5M22 59h20" />
      </>
    ),
    Beacon: (
      <>
        <path fill={lit} d="M16 42V26c0-22 32-22 32 0v16Z" />
        <rect fill={blue} x="10" y="42" width="44" height="13" rx="4" />
        <path d="M32 2v4M5 13l6 4m48-4-6 4" />
      </>
    ),
    Cargo: (
      <>
        <path fill={cream} d="m8 20 24-10 24 10v32L32 61 8 52Z" />
        <path d="m8 20 24 10 24-10M32 30v31m-11-46 24 10v12" />
      </>
    ),
    Radio: (
      <>
        <rect fill={blue} x="9" y="20" width="46" height="35" rx="8" />
        <path d="m39 20 7-14" />
        <circle fill={on ? mint : cream} cx="25" cy="37" r="10" />
        <path d="M43 31h5m-5 7h5m-5 7h5" />
      </>
    ),
    Gravity: (
      <>
        <circle fill={blue} cx="32" cy="20" r="10" />
        <path fill={mint} d="M13 51h38v7H13Z" />
        <path d="M32 34v11m-6-5 6 6 6-6M13 30l-5 8m43-8 5 8" />
      </>
    ),
    Dock: (
      <>
        <path fill={blue} d="M7 48h50v10H7Z" />
        <path fill={cream} d="m20 13 12-8 12 8v18H20Z" />
        <path d="M32 31v11m-6-6 6 6 6-6M8 37h9m30 0h9" />
      </>
    ),
    Window: (
      <>
        <rect fill={blue} x="7" y="7" width="50" height="50" rx="15" />
        <rect fill={ink} x="14" y="14" width="36" height="36" rx="10" />
        {on ? (
          <>
            <circle fill={cream} cx="26" cy="25" r="3" />
            <path stroke={cream} d="M39 33v9m-4-4h8" />
          </>
        ) : (
          <path fill={cream} d="M14 14h36v36H14Z" />
        )}
      </>
    ),
    Cabin: (
      <>
        <path fill={cream} d="m6 27 26-20 26 20v30H6Z" />
        <rect fill={lit} x="17" y="26" width="30" height="20" rx="4" />
        <path d="M24 57V46m16 11V46" />
      </>
    ),
    Map: (
      <>
        <path fill={mint} d="m5 14 18-6 18 6 18-6v42l-18 6-18-6-18 6Z" />
        <path d="M23 8v42m18-36v42" />
        <path stroke={ink} strokeDasharray="3 5" d="m12 36 18-12 19 9" />
        <circle fill={cream} cx="49" cy="33" r="4" />
      </>
    ),
    Airlock: (
      <>
        <circle fill={blue} cx="32" cy="32" r="27" />
        <circle fill={on ? ink : cream} cx="32" cy="32" r="19" />
        {on ? (
          <path fill={mint} d="M32 13v38c-11 0-19-8-19-19s8-19 19-19Z" />
        ) : (
          <>
            <circle cx="32" cy="32" r="8" />
            <path d="M32 17v7m0 16v7m-15-15h7m16 0h7" />
          </>
        )}
      </>
    ),
    Fuel: (
      <>
        <rect fill={coral} x="14" y="12" width="36" height="44" rx="6" />
        <path d="M22 12V6h16v6m-12 9 12 26m0-26L26 47" />
        <path fill={cream} d="M42 19h4v12h-4Z" />
      </>
    ),
    Antenna: (
      <>
        <path fill={blue} d="m10 17 37 31C21 60-4 40 10 17Z" />
        <path d="m23 31 21-22M26 49l-6 10m-9 0h26" />
        <circle fill={cream} cx="44" cy="9" r="4" />
        <path d="M51 8c5 1 7 5 7 9" />
      </>
    ),
    Pump: (
      <>
        <path fill={blue} d="M5 25h12v21H5m42-21h12v21H47" />
        <rect
          fill={on ? mint : cream}
          x="17"
          y="19"
          width="30"
          height="34"
          rx="7"
        />
        <path d="M32 19V9M23 9h18" />
        <path fill={blue} d="M32 29c-12 15-9 18 0 18s12-3 0-18Z" />
      </>
    ),
    Robot: (
      <>
        <rect fill={blue} x="10" y="16" width="44" height="34" rx="10" />
        <path d="M32 16V8m-22 22H5m49 0h5" />
        <circle fill={lit} cx="32" cy="7" r="4" />
        <circle fill={ink} cx="23" cy="30" r="3" />
        <circle fill={ink} cx="41" cy="30" r="3" />
        <path d="M23 41h18M21 50v7m22-7v7" />
      </>
    ),
    Badge: (
      <>
        <path fill={blue} d="m17 39-5 21 20-9 20 9-5-21" />
        <circle fill={cream} cx="32" cy="27" r="22" />
        <g transform="translate(15 10) scale(.53)" fill={mint}>
          <Shape value={value} />
        </g>
      </>
    ),
    Magnet: (
      <>
        <path
          fill={coral}
          d="M10 11h15v25c0 10 14 10 14 0V11h15v25c0 29-44 29-44 0Z"
        />
        <path fill={cream} d="M10 11h15v10H10m29-10h15v10H39" />
        {on && <path d="M32 4v8m-8-7 4 7m12-7-4 7" />}
      </>
    ),
    Speed: (
      <>
        <path fill={blue} d="M7 49a25 25 0 1 1 50 0Z" />
        <path d="m16 30 5 4m11-13v6m16 3-5 4" />
        <path transform={`rotate(${-60 + value * 40} 32 44)`} d="M32 44V29" />
        <circle fill={cream} cx="32" cy="44" r="4" />
      </>
    ),
    "Pet Screen": (
      <>
        <rect fill={blue} x="5" y="10" width="54" height="40" rx="8" />
        <rect fill={cream} x="11" y="16" width="42" height="28" rx="5" />
        <circle fill={coral} cx="32" cy="34" r="6" />
        <g fill={coral}>
          <circle cx="21" cy="26" r="3" />
          <circle cx="29" cy="23" r="3" />
          <circle cx="37" cy="23" r="3" />
          <circle cx="44" cy="28" r="3" />
        </g>
        <path d="M32 50v8m-10 0h20" />
      </>
    ),
    Alarm: (
      <>
        <path fill={cream} d="M15 41V27c0-23 34-23 34 0v14l6 7H9Z" />
        <path fill={coral} d="M25 48c0 11 14 11 14 0" />
        {on && <path d="M5 17v16m54-16v16M10 5l6 6m38-6-6 6" />}
      </>
    ),
  };
  return <Art picture={name}>{drawings[name]}</Art>;
}
