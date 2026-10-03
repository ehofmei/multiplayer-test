# P2P Family Game PWA - Codex Build Brief

## Goal

Build a small Progressive Web App that can be installed on iPhone/iPad and used by multiple devices on the **same Wi-Fi network** for low-latency multiplayer interaction with **no gameplay server**.

The purpose of this first version is not to build a polished game. It is to prove that:

1. The PWA can be installed and launched on iOS/iPadOS.
2. One device can act as the host.
3. Other devices can establish direct peer-to-peer WebRTC DataChannel connections to the host.
4. Game/state messages can move between devices with low latency.
5. Multiple devices can see and manipulate synchronized shared state.
6. We can measure latency and connection health well enough to decide whether to build games such as Hot Potato, reaction-speed games, Pong, or Air Hockey.

Keep this first implementation intentionally small, observable, and easy to debug.

---

## Product Concept for the First Test

The first test experience is a **shared grid of lights/buttons**.

Example:

```text
┌────┬────┬────┬────┐
│  1 │  2 │  3 │  4 │
├────┼────┼────┼────┤
│  5 │  6 │  7 │  8 │
├────┼────┼────┼────┤
│  9 │ 10 │ 11 │ 12 │
├────┼────┼────┼────┤
│ 13 │ 14 │ 15 │ 16 │
└────┴────┴────┴────┘
```

Any connected player can tap a cell.

A tap toggles that cell on/off. The host owns the authoritative state and broadcasts the resulting grid state to every connected device.

This is deliberately simple. It should make networking behavior extremely obvious:

- Tap a cell on one device.
- It should change almost immediately on every other device.
- Rapid taps should remain synchronized.
- Multiple users should be able to tap different cells concurrently.
- Disconnect/reconnect behavior should be visible.

This shared grid is a networking harness, not the final game.

---

# Technical Constraints

## Required

- Web application.
- Installable as a PWA on iPhone and iPad.
- TypeScript.
- React is fine and preferred for speed of iteration.
- Use WebRTC `RTCPeerConnection` and `RTCDataChannel` for peer-to-peer communication.
- One device acts as the host.
- All other devices connect only to the host.
- Same Wi-Fi/LAN is an acceptable limitation.
- No backend game server.
- No WebSocket server.
- No database.
- No accounts or authentication.
- No cloud persistence.
- Initial version should attempt LAN-only WebRTC using no STUN/TURN servers.

Use:

```ts
const pc = new RTCPeerConnection({
  iceServers: [],
});
```

Do not add Firebase, Supabase, Socket.io, WebSockets, TURN, or other infrastructure unless specifically required later.

## Important Definition

For this POC, "no server" means:

- no server participates in gameplay;
- no server stores game state;
- no server relays gameplay messages.

It is acceptable to host the static PWA itself from a normal HTTPS web host so it can initially be opened and installed.

Once loaded, the game itself should be capable of functioning peer-to-peer on the LAN.

---

# Networking Topology

Use a star topology.

```text
        Player B
           │
           │ WebRTC DataChannel
           │
Player C ─ Host A ─ Player D
           │
           │
        Player E
```

Do **not** create a full mesh between players.

The host is authoritative.

Clients send player actions to the host.

The host:

1. receives actions;
2. validates/applies them;
3. updates authoritative state;
4. broadcasts the new state to all connected clients.

The host should also render the game like any other player.

For the initial POC, support at least:

- 1 host
- 3 clients

Design the networking layer so 6-8 total devices would not require architectural changes.

---

# Connection / Signaling Strategy

WebRTC requires signaling before the DataChannel can connect.

For this POC, do **not** build a signaling server.

Implement manual signaling.

## Host flow

1. User taps **Create Game**.
2. App creates a peer connection for a joining client.
3. App creates a WebRTC offer.
4. Wait for ICE gathering to complete.
5. Serialize the complete connection offer into a portable text payload.
6. Show:
   - a QR code containing the payload;
   - the raw text payload in a copyable text box as a fallback.

## Client flow

1. User taps **Join Game**.
2. User scans the host's QR code OR pastes the connection payload.
3. Client creates its peer connection and applies the offer.
4. Client creates an answer.
5. Wait for ICE gathering to complete.
6. Client displays:
   - an answer QR code;
   - copyable answer text.

## Host completion

1. Host scans or pastes the client's answer.
2. Host applies the answer.
3. DataChannel connects.
4. Player appears in the lobby.

For the first implementation, it is acceptable to repeat this handshake once per client.

### Important

Do not over-engineer QR signaling.

If camera-based QR scanning creates unnecessary friction, prioritize working copy/paste signaling first, then add QR generation/scanning.

The core networking test is more important than polished pairing UX.

---

# Suggested Project Stack

Use a straightforward modern stack:

- Vite
- React
- TypeScript
- `vite-plugin-pwa` or an equivalent minimal PWA setup
- WebRTC browser APIs directly
- A lightweight QR library for QR generation
- A lightweight QR scanner library only if reliable on iOS Safari/PWA

Avoid large state-management libraries unless clearly useful.

React state/context or a tiny store is sufficient.

Suggested structure:

```text
src/
  app/
    App.tsx

  network/
    protocol.ts
    peer-host.ts
    peer-client.ts
    signaling.ts
    stats.ts
    types.ts

  game/
    grid-state.ts
    game-host.ts
    game-client.ts

  components/
    HomeScreen.tsx
    HostLobby.tsx
    JoinScreen.tsx
    SignalingPanel.tsx
    PlayerList.tsx
    SharedGrid.tsx
    NetworkDebugPanel.tsx

  pwa/
    ...
```

Keep WebRTC logic outside React components as much as practical.

---

# Message Protocol

Define an explicit versioned protocol instead of sending arbitrary objects.

For example:

```ts
export type ClientToHostMessage =
  | {
      type: "hello";
      protocolVersion: 1;
      playerId: string;
      playerName: string;
    }
  | {
      type: "toggle-cell";
      cellIndex: number;
      clientSequence: number;
      clientTimestamp: number;
    }
  | {
      type: "ping";
      id: number;
      timestamp: number;
    };

export type HostToClientMessage =
  | {
      type: "welcome";
      protocolVersion: 1;
      playerId: string;
    }
  | {
      type: "grid-state";
      revision: number;
      cells: boolean[];
    }
  | {
      type: "player-list";
      players: PlayerInfo[];
    }
  | {
      type: "pong";
      id: number;
      originalTimestamp: number;
    };
```

Use JSON initially.

Binary encoding is unnecessary for this POC.

Every message handler should safely reject malformed/unknown messages rather than crashing.

---

# Game State Model

The host owns something similar to:

```ts
interface GameState {
  revision: number;
  cells: boolean[];
}
```

Start with a 4x4 grid (16 cells).

When a client taps cell 7:

```text
client
  -> toggle-cell(7)

host
  -> updates cell 7
  -> revision++
  -> broadcasts grid-state

all clients
  -> render newest authoritative state
```

Do not allow clients to directly mutate canonical state.

For this POC, broadcasting the entire 16-cell state after each change is fine.

Favor clarity over optimization.

---

# WebRTC DataChannels

For this first test, one reliable ordered channel is enough.

Example:

```ts
const channel = pc.createDataChannel("game", {
  ordered: true,
});
```

Design the networking code so a second realtime/unreliable channel can easily be added later for Pong/Air Hockey:

```ts
const realtime = pc.createDataChannel("realtime", {
  ordered: false,
  maxRetransmits: 0,
});
```

Do not add that second channel unless it helps the implementation.

The shared grid should use the reliable channel.

---

# Player Identity

No accounts.

On first launch create a local random player ID and save it locally.

Allow the user to enter a display name such as:

```text
Dad
Mom
Alex
Emma
```

Store the display name locally.

Generate player IDs with `crypto.randomUUID()` when available.

The host should show currently connected players.

---

# Screens

## 1. Home

Display:

```text
P2P Game Lab

[ Create Game ]
[ Join Game   ]

Name: [ Alex ]
```

Also show whether the app is running in standalone/PWA mode if easy to detect.

## 2. Host Lobby

Show:

```text
Game Host

Connected Players
- Alex (Host)
- Emma
- Chris

[ Add Player ]

[ Start Test ]
```

"Add Player" begins another offer/answer handshake.

The test does not strictly need a start button; the grid can become available immediately after connecting. Prefer whichever keeps implementation simpler.

## 3. Join

Provide:

```text
Join Game

[ Scan Host QR ]

or

[ Paste Offer ]
```

After reading the offer, display the generated answer.

## 4. Shared Grid

Large touch-friendly 4x4 grid.

Cells should visibly distinguish ON/OFF state.

Tapping should have immediate local touch feedback, but canonical visual state should ultimately follow the host update.

Display connected player count.

## 5. Debug Panel

The debug panel is important.

Make it collapsible but easy to open.

Show per connection:

```text
Player             Emma
Connection         connected
DataChannel        open
App RTT            8 ms
Messages sent      142
Messages received  139
Last message       35 ms ago
ICE state           connected
Candidate type      host -> host
```

When possible, also surface useful values from `RTCPeerConnection.getStats()`.

At minimum show:

- ICE connection state
- connection state
- signaling state
- DataChannel readyState
- messages sent
- messages received
- application-level RTT
- last-message timestamp

---

# Latency Measurement

Implement application-level ping/pong.

Every 1 second, a client may send:

```ts
{
  type: "ping",
  id: 123,
  timestamp: performance.now()
}
```

Host immediately returns:

```ts
{
  type: "pong",
  id: 123,
  originalTimestamp: ...
}
```

Client computes:

```ts
const rtt = performance.now() - originalTimestamp;
```

Track at least:

- latest RTT
- rolling average RTT over approximately 10 samples
- min RTT
- max RTT

Do not pretend these measurements represent perfect one-way network latency. Label them clearly as application RTT.

---

# Diagnostics / Test Controls

Add a small developer/testing section with these actions if easy:

### Flash All

Host sends a command causing all cells to turn on briefly and then reset.

Useful for visually checking synchronization.

### Randomize Grid

Host randomizes all 16 cells and broadcasts state.

### Burst Test

Send approximately 100 small test messages quickly and report:

- sent
- received
- elapsed time

Do not spend significant time building a benchmarking suite. These are optional diagnostics after the core path works.

---

# PWA Requirements

The project should:

- have a web app manifest;
- have suitable icons/placeholders;
- specify `display: standalone`;
- have a service worker;
- cache the application shell/assets;
- remain launchable after the application has previously loaded and the internet connection disappears.

The peer-to-peer game should not require internet access after the PWA assets have been cached.

Use a simple app name such as:

```text
P2P Game Lab
```

Do not spend much time on branding.

---

# UX Priorities

This will be tested primarily on phones/tablets.

Therefore:

- use large touch targets;
- avoid hover-dependent UI;
- keep text readable on a phone;
- account for iPhone safe areas;
- avoid accidental page zoom where practical;
- avoid scroll-heavy gameplay screens;
- keep the shared grid usable in portrait mode;
- make connection errors understandable.

If camera access is used for QR scanning, request it only when the user explicitly presses Scan.

---

# Error Handling

Networking failures must be visible rather than silently swallowed.

Provide useful messages for:

- invalid signaling payload;
- offer/answer parsing failure;
- WebRTC connection failure;
- ICE failure;
- DataChannel failure;
- disconnected player;
- malformed protocol message.

Include detailed information in the debug panel / console while keeping normal UI messages understandable.

If a client disconnects, remove it from the host player list.

No host migration is required.

If the host disappears, clients may simply show:

```text
Host disconnected.

[ Return Home ]
```

---

# Security / Safety Basics

This is a LAN proof of concept, not a security-sensitive production system.

Still:

- validate incoming JSON;
- cap message sizes to something reasonable;
- ignore unknown message types;
- avoid evaluating remote content;
- do not trust display names as HTML;
- do not expose unnecessary browser/device information.

No authentication is required.

---

# Implementation Order

Implement incrementally in this order.

## Milestone 1 - App Shell

Create the Vite/React/TypeScript app.

Verify:

- development build runs;
- production build succeeds;
- PWA manifest/service worker are configured;
- app has Home/Create/Join screens.

## Milestone 2 - Two Browser WebRTC Test

Before QR codes or polished UI, get two browser instances connected manually.

Implement:

- offer generation;
- answer generation;
- copy/paste signaling;
- DataChannel open;
- basic text message exchange.

Expose enough debug output to diagnose ICE/signaling failures.

Do not move on until this works reliably.

## Milestone 3 - Host / Client Abstractions

Create reusable host/client networking modules.

Host should support multiple independent peer connections.

Client connects only to host.

## Milestone 4 - Shared Grid

Implement authoritative grid state.

Verify:

- client A toggles a cell;
- host updates it;
- host broadcasts state;
- client A, client B, and host all render identical state.

## Milestone 5 - Latency Stats

Add ping/pong RTT and message counters.

Make stats visible in the debug panel.

## Milestone 6 - QR Signaling

Add QR generation.

If reliable QR scanning can be implemented cleanly on iOS, add scanning.

Keep copy/paste fallback permanently available.

## Milestone 7 - Real iPhone/iPad Testing

Test:

- Safari browser -> Safari browser;
- installed PWA -> installed PWA;
- iPhone host -> iPad client;
- iPad host -> iPhone client;
- 1 host + at least 2 clients;
- ideally 1 host + 3 clients.

Record observed RTT values in the README.

---

# Acceptance Criteria

The POC is successful when all of the following work:

1. The application can be installed to an iPhone/iPad Home Screen.
2. One device can choose Create Game.
3. Another device on the same Wi-Fi can choose Join Game.
4. The devices can connect using manual offer/answer signaling without a signaling server.
5. The WebRTC DataChannel reaches `open` state.
6. The shared 4x4 grid appears on both devices.
7. Tapping a cell on either device updates the authoritative host state.
8. The resulting state is reflected on every connected device.
9. At least three total devices can participate simultaneously.
10. The UI displays application RTT between each client and host.
11. Disconnecting a client does not crash the host.
12. Losing the host produces a sensible disconnected state on clients.
13. No gameplay traffic passes through a backend server.
14. No STUN/TURN server is configured for this LAN-only POC.
15. The codebase is structured so that a realtime game can replace the shared grid without replacing the networking layer.

---

# Explicit Non-Goals

Do not build these yet:

- internet multiplayer;
- matchmaking;
- user accounts;
- cloud saves;
- signaling backend;
- TURN server;
- host migration;
- reconnection across app suspension;
- polished animations;
- production security model;
- anti-cheat;
- complex physics;
- native iOS app;
- App Store packaging;
- elaborate game framework.

Avoid solving hypothetical future problems before the LAN WebRTC experiment is proven.

---

# Code Quality Expectations

Prefer boring, understandable code.

Important principles:

- networking layer separate from UI;
- explicit message types;
- host-authoritative state;
- useful logging;
- easy-to-inspect state;
- minimal dependencies;
- no unnecessary abstractions;
- no premature binary protocols or synchronization algorithms.

Add concise comments where WebRTC behavior is non-obvious.

Create a README explaining:

1. how to run locally;
2. how to build;
3. how to deploy to HTTPS hosting;
4. how to install on iPhone/iPad;
5. how to create a game;
6. how to join using copy/paste signaling;
7. how to inspect networking stats;
8. known limitations.

---

# Local Development Caveat

PWA/service-worker behavior and mobile browser APIs generally need a secure context.

Localhost is acceptable for desktop development, but actual phone testing should use an HTTPS deployment or another secure development setup.

Do not weaken browser security settings as part of the application design.

---

# What Comes After This POC

Do not implement these games now, but design the networking layer with them in mind.

## Hot Potato

Host owns a virtual potato.

Possible mechanic:

- one player has the potato;
- host starts an unknown countdown;
- player must tap another player's name to pass it;
- host determines whether the pass arrived before the timer expired;
- player holding the potato when it expires loses the round.

Networking profile:

- reliable messages;
- timing;
- host-authoritative events.

This is probably the easiest actual game after the grid test.

## Reaction Speed

Host schedules a stimulus after a randomized delay.

All devices receive a synchronized round-start event.

Players react when the visual signal appears.

Important caveat:

Do not naïvely compare client timestamps from different devices and assume the clocks are synchronized.

A proper version should estimate clock offsets / RTT or structure the experiment so the host can make a fair comparison.

This would be a good second networking experiment because it exposes timing/synchronization issues.

## Pong

Host runs authoritative ball physics.

Clients send paddle input/position updates.

Host broadcasts periodic snapshots.

Clients interpolate remote state.

This is where a second unordered/unreliable DataChannel becomes useful.

## Air Hockey

Similar to Pong but considerably more difficult because collision timing and continuous physics corrections matter more.

Do this only after Pong feels good.

---

# Recommended Progression

Use this order:

```text
Shared Grid
    ↓
Hot Potato
    ↓
Reaction Timing Experiment
    ↓
Pong
    ↓
Air Hockey
```

Each stage exercises a different networking problem while reusing the same host/client foundation.

---

# Final Instruction to Codex

Start by implementing **Milestones 1-4 only**.

Do not attempt to solve the whole roadmap in one pass.

The first meaningful checkpoint is:

> Two devices can manually exchange WebRTC offer/answer payloads, open a DataChannel, and manipulate the same host-authoritative 4x4 grid in near real time.

Once that works cleanly, add diagnostics/RTT and then QR signaling.

When you encounter a browser/WebRTC limitation, document it rather than hiding it behind unnecessary infrastructure.

Favor a working, inspectable experiment over polish.
