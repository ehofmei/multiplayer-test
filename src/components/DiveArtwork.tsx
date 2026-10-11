type Picture = "boat" | "explore" | "shield" | "treasure" | "hazard";
// Shared silhouettes keep actions, inventory and revealed rooms recognizable.
export function DivePicture({ kind }: { kind: Picture }) {
  return (
    <svg className="dive-picture" viewBox="0 0 80 64" aria-hidden="true">
      {kind === "boat" ? (
        <g stroke="#65472c" strokeWidth="3" strokeLinejoin="round">
          <path d="M8 36h64L60 53H23Z" fill="#d39a60" />
          <path d="M40 6v30M40 8L18 30h22M44 12l18 18H44" fill="#fff1c8" />
          <path
            d="M6 57q9-6 18 0t18 0t18 0t18 0"
            fill="none"
            stroke="#55c8da"
          />
        </g>
      ) : kind === "shield" ? (
        <g stroke="#315a76" strokeWidth="3">
          <path d="M40 5L65 15v20Q60 50 40 59Q20 50 15 35V15Z" fill="#7ce3df" />
          <path d="M40 12v39M23 29h34" stroke="#f4fff1" strokeWidth="5" />
        </g>
      ) : kind === "explore" ? (
        <g stroke="#294657" strokeWidth="3" strokeLinejoin="round">
          <path d="M18 56V22Q18 6 40 6t22 16v34Z" fill="#ce9c63" />
          <path d="M26 54V23q0-10 14-10t14 10v31" fill="#153849" />
          <path
            d="M34 36h19m-7-7 7 7-7 7"
            fill="none"
            stroke="#fff1a7"
            strokeWidth="4"
          />
          <circle cx="31" cy="24" r="3" fill="#7ce3df" stroke="none" />
        </g>
      ) : kind === "hazard" ? (
        <g
          fill="#ee998e"
          stroke="#804e65"
          strokeWidth="3"
          strokeLinecap="round"
        >
          <path d="M22 33q-5-25 18-25t18 25q-2 12-18 12T22 33Z" />
          <path
            d="M24 36Q7 40 15 53M32 42q-9 18-15 10M41 44q0 17 9 9M54 37q17 1 12 16"
            fill="none"
            strokeWidth="6"
          />
          <circle cx="32" cy="27" r="4" fill="#183547" stroke="none" />
          <circle cx="48" cy="27" r="4" fill="#183547" stroke="none" />
        </g>
      ) : (
        <g stroke="#72532c" strokeWidth="3" strokeLinejoin="round">
          <path d="M13 30q0-20 27-20t27 20v24H13Z" fill="#e7b653" />
          <path d="M14 30h52M27 13v40M53 13v40" fill="none" />
          <path d="M36 26h9v14h-9Z" fill="#fff1a7" />
          <circle cx="57" cy="52" r="7" fill="#ffe598" />
          <path
            d="m8 10 3 5 6 1-5 4 1 6-5-3-5 3 1-6-5-4 6-1Z"
            fill="#fff1a7"
            stroke="none"
          />
        </g>
      )}
    </svg>
  );
}
export function DiveScene({
  card,
  door,
}: {
  card: number | null;
  door: number;
}) {
  return (
    <div className="dive-scene" data-underwater={door > 0}>
      <svg className="dive-art" viewBox="0 0 400 180" aria-hidden="true">
        <path
          d="M40 0h60L230 180H60ZM280 0h30l70 180H200Z"
          fill="#7ce3df"
          opacity=".08"
        />
        <path d="M0 158q70-25 135 2t135-5t130 5v20H0Z" fill="#346773" />
        {door === 0 ? (
          <g>
            <path
              d="M58 74h287l-32 80H87Z"
              fill="#775a46"
              stroke="#be9771"
              strokeWidth="3"
            />
            <path
              d="M99 96h215M91 121h220M192 31v123l-30-46h80"
              fill="none"
              stroke="#be9771"
              strokeWidth="4"
            />
            {[110, 150, 250, 290].map((x) => (
              <circle
                key={x}
                cx={x}
                cy="109"
                r="10"
                fill="#102f41"
                stroke="#be9771"
                strokeWidth="3"
              />
            ))}
          </g>
        ) : (
          <g stroke="#92ada0" strokeWidth="3">
            <path d="M38 150V40h324v110M98 150V60h204v90" fill="#28505b" />
            <path
              d="M142 152V50q58-44 116 0v102Z"
              fill="#153849"
              stroke="#c19c71"
              strokeWidth="7"
            />
            <path
              d="M40 40l58 20M362 40l-60 20M38 150l60-20m264 20-60-20"
              fill="none"
            />
            <circle
              cx={door % 2 ? 71 : 330}
              cy="82"
              r="15"
              fill="#e7bb59"
              stroke="#ce9c63"
            />
            <path d="M68 65v34m-14-17h33" stroke="#153849" />
            <path d="M123 161h154" stroke="#ce9c63" />
          </g>
        )}
        <path
          d="M15 172q25-18 9-38m0 24 18-15M359 170q-15-34 0-43m0 28 17-16"
          fill="none"
          stroke="#71b5a0"
          strokeWidth="7"
          strokeLinecap="round"
        />
        {[
          [37, 49, 6],
          [350, 65, 9],
          [325, 26, 4],
        ].map(([x, y, r]) => (
          <circle
            key={x}
            cx={x}
            cy={y}
            r={r}
            fill="none"
            stroke="#7cc9d1"
            opacity=".65"
          />
        ))}
      </svg>
      <div className="dive-room-art">
        <DivePicture
          kind={card === null ? "explore" : card === 0 ? "hazard" : "treasure"}
        />
      </div>
      <span className="dive-room-label">
        {door ? `Room ${door}` : "The wreck awaits"}
        {card !== null && card > 0
          ? ` · +${card} treasure`
          : card === 0
            ? " · Octopus hazard"
            : ""}
      </span>
    </div>
  );
}
