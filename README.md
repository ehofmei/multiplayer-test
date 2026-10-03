# P2P Game Lab

A small LAN multiplayer experiment for family devices. One device owns a 4×4 grid;
each joining device has one direct WebRTC DataChannel to that host. There is no
gameplay server, signaling service, STUN/TURN configuration, database, or account.

This checkpoint implements milestones 1–4: installable app shell, manual signaling,
up to one host plus seven clients, and host-authoritative shared lights.
Basic connection states and message counters are included to inspect pairing.
Application RTT, QR signaling and benchmark controls are deferred.

## Run and verify

Use Node 22 or newer.

```sh
npm ci
npm run dev
```

Open http://localhost:5173/multiplayer-test/. Localhost is a secure context for
desktop development. A phone visiting a plain HTTP LAN address is not equivalent;
use HTTPS for phone installation and testing.

```sh
npx playwright install chromium
npm run verify
npm run preview
```

Verification checks formatting, protocol/grid unit tests, TypeScript and production
build, then Chromium browser tests against the built app. Tests connect a host and
three separate browser contexts, exercise concurrent/rapid actions and disconnects,
check mobile controls, and verify cached offline startup under the repository path.
A grid screenshot baseline provides visual regression coverage. QA.md lists the
interactive and real-device checks. Browser tests do not prove iOS LAN connectivity.

## GitHub Pages

The app base path is /multiplayer-test/. The Pages workflow builds and verifies
the app on pushes to main or manual dispatch, then uploads only dist/. In GitHub
repository Settings → Pages, select **GitHub Actions** as the source. Push these
files to main, then check the workflow and open:

https://ehofmei.github.io/multiplayer-test/

Failed workflow runs retain browser traces and error contexts in the
`browser-failure-results` artifact for seven days.

No client-side path routes are used; Create/Join are in-app modes. Refresh returns
to Home, so there are no nested-route refresh errors. If the repository is renamed,
update the Vite base path. Other HTTPS static hosts can serve dist/ under that path,
or rebuild with `npm run build -- --base=/` for root hosting.

## Install and pair

1. On each iPhone/iPad, open the HTTPS site in Safari while online. Let it load.
2. Tap Share → Add to Home Screen. Launch the installed app.
3. Connect every device to the same Wi-Fi. Enter a different display name per device.
4. On the host, tap Create Game, then Add Player.
5. Copy the complete Offer text and transfer it to one client's Join Game screen.
   AirDrop/Notes or a messaging app can help while online; manual text transfer is
   outside this app. There is no network-based discovery or signaling.
6. On the client, paste the offer and tap Create Answer.
7. Send the complete Answer text back. Paste it on the host and tap Connect Player.
8. Repeat Add Player with a fresh offer for each additional client.
9. Tap any cell on any device. The host applies actions in arrival order and shares
   the whole grid. Local press feedback is immediate; ON/OFF waits for host state.

Connection text contains LAN connection information; share it only with intended
players. Each offer is single-use and expires after three minutes. Keep both screens
open while pairing. Copy buttons need clipboard permission; select the text and
copy manually if the browser blocks them.

## Inspect and test

Expand Connection details to see connection/ICE/signaling/channel states, sent and
received message counts, and the last-message time. Malformed messages are rejected
and reported in the UI/console. RTT measurement is not implemented at this checkpoint.

Use an iPhone as host and iPad as client, then reverse roles. Try Safari → Safari and
installed PWA → installed PWA, then one host with three clients. Test concurrent taps,
rapid taps, leaving a client, and leaving the host. Rejoining requires a new manual
handshake. Record physical-device results below; no RTT figures have been measured.

| Device/browser combination | Connection / synchronization | Application RTT      |
| -------------------------- | ---------------------------- | -------------------- |
| Real iPhone/iPad           | Pending physical-device test | Deferred milestone 5 |

## Offline, updates and limitations

The production service worker caches the app shell. After an online visit and cache
completion, reload/launch without internet should work. LAN Wi-Fi still needs to be
connected, and pairing text still needs to be transferred. The app does not load
remote fonts, scripts, or media. Identity/name storage is versioned locally; the grid
and connections are intentionally temporary and reset when the host leaves/reloads.
There is no saved game progress requiring export/import in this harness.

A new service worker waits rather than forcing an update during play. Finish the
session, close all app windows, and reopen to use the update. Real iOS offline/update
behavior still needs testing.

LAN-only ICE may fail on networks with client isolation, guest Wi-Fi, blocked UDP,
or browser restrictions on local candidates/mDNS. Same Wi-Fi is a prerequisite,
not a guarantee. Failures remain visible; this experiment intentionally adds no
relay infrastructure. No host migration, automatic reconnect, or suspension recovery
is implemented. Keep the host foregrounded and awake. A disconnect removes the
player; host loss disables the client board. Closing all tabs can interrupt a game.

The protocol is versioned JSON with size and shape checks. Reliable ordered channels
preserve actions per client; the host serializes actions from all clients. The host
acknowledges pairing with an initial grid state; clients retry their introduction
once per second until acknowledged, with a 30-second deadline. Repeated introductions
on the same link resend state without duplicating or changing the bound player.
Networking and state logic live outside React, so a future game can replace the grid
reducer and game messages while retaining pairing and peer lifecycle code.
