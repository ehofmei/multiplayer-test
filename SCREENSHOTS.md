# Game Lab screenshot gallery

Browse the latest reviewed screenshots for all 14 games in this branch. Click an
image to inspect it at full size. Most images come directly from the game's
versioned visual-test baselines, so the gallery follows baseline updates without
duplicating images. Some show just the playing surface; others include controls.

On GitHub, the branch selector controls which version you see: `main` shows the
published source, while a review branch shows its proposed changes. These are
desktop Chromium captures, including simulated phone layouts, rather than
photographs from physical iPhones or iPads. Linux baselines are shown where
available; shared baselines are identified below.

[Sumo Bumpers](#sumo-bumpers) · [Light-cycle Arena](#light-cycle-arena) ·
[Spaceship Panic](#spaceship-panic) · [Co-op Breakout](#co-op-breakout) ·
[Pong](#pong) · [Arena Pong](#arena-pong) · [Reaction Race](#reaction-race) ·
[Shared Lights](#shared-lights) · [Midnight Bakery](#midnight-bakery) ·
[Meteor Minigolf](#meteor-minigolf) · [Treasure Dive](#treasure-dive) ·
[Patchwork Picnic](#patchwork-picnic) · [Light Seek](#light-seek) ·
[Glow Clash](#glow-clash)

## Family library

Illustrated cards, roster guidance and selected-seat spectators · Linux baselines.

![Family game library](tests/library.spec.ts-snapshots/library-page-1-phone-linux.png)

[More games](tests/library.spec.ts-snapshots/library-page-2-phone-linux.png) ·
[Food and expedition games](tests/library.spec.ts-snapshots/library-page-3-phone-linux.png) ·
[Final page](tests/library.spec.ts-snapshots/library-page-4-phone-linux.png) ·
[Landscape iPad](tests/library.spec.ts-snapshots/library-ipad-linux.png) ·
[Client library](tests/library.spec.ts-snapshots/library-client-phone-linux.png) ·
[Eight players and reduced-motion focus](tests/library.spec.ts-snapshots/library-eight-focus-reduced-linux.png).

## Sumo Bumpers

Arena · Linux baseline.

![Sumo Bumpers arena](tests/sumo-integration.spec.ts-snapshots/sumo-court-linux.png)

## Light-cycle Arena

Directional riders and confirmed turn feedback · desktop.

![Light-cycle Arena](tests/cycle-integration.spec.ts-snapshots/cycle-turn-linux.png)

[Phone](tests/cycle-integration.spec.ts-snapshots/cycle-phone-linux.png) ·
[Eight riders, reduced motion](tests/cycle-integration.spec.ts-snapshots/cycle-eight-reduced-linux.png) ·
[Crash at the wall, reduced motion](tests/cycle-integration.spec.ts-snapshots/cycle-crash-reduced-linux.png) ·
[Eight full names in Results](tests/cycle-integration.spec.ts-snapshots/cycle-eight-results-linux.png) ·
[Champion](tests/cycle-integration.spec.ts-snapshots/cycle-champion-linux.png) ·
[Draw](tests/cycle-integration.spec.ts-snapshots/cycle-draw-linux.png) ·
[Sixty-second shared win](tests/cycle-integration.spec.ts-snapshots/cycle-shared-win-linux.png).

The final arena stays visible, with results and rematch outside the playing surface.

## Spaceship Panic

Active mission · phone layout.

![Spaceship Panic active mission](tests/ship.spec.ts-snapshots/ship-active-linux.png)

<details>
<summary>Success feedback and mission results</summary>

![Spaceship Panic command success](tests/ship.spec.ts-snapshots/ship-success-linux.png)

![Spaceship Panic results](tests/ship.spec.ts-snapshots/ship-scored-results-linux.png)

</details>

[All panel sets and states](tests/ship.spec.ts-snapshots/)

## Co-op Breakout

Active phone · Linux baseline. Broad reaction lanes around the compact core.

![Co-op Breakout](tests/breakout.spec.ts-snapshots/breakout-active-phone-linux.png)

[Ready](tests/breakout.spec.ts-snapshots/breakout-ready-phone-linux.png) ·
[Tablet](tests/breakout.spec.ts-snapshots/breakout-active-tablet-linux.png) ·
[Landscape](tests/breakout.spec.ts-snapshots/breakout-active-landscape-linux.png) ·
[Short phone paused](tests/breakout.spec.ts-snapshots/breakout-paused-short-phone-linux.png) ·
[Team results](tests/breakout.spec.ts-snapshots/breakout-results-phone-linux.png) ·
[Team victory](tests/breakout.spec.ts-snapshots/breakout-victory-phone-linux.png).

## Pong

Bumper warning · phone layout.

![Pong bumper warning](tests/pong.spec.ts-snapshots/pong-warning-linux.png)

<details>
<summary>Four bumpers and impact feedback</summary>

![Pong four bumpers](tests/pong.spec.ts-snapshots/pong-four-linux.png)

![Pong bumper impact](tests/pong.spec.ts-snapshots/pong-impact-linux.png)

</details>

[All Pong states](tests/pong.spec.ts-snapshots/)

## Arena Pong

Rotated four-player court · phone layout. Numbered rails, local paddle notch,
life pips and separate steering strip keep the playing area clear.

![Arena Pong rotated court](tests/arena.spec.ts-snapshots/arena-rotated-linux.png)

[Ready](tests/arena.spec.ts-snapshots/arena-ready-linux.png) ·
[Desktop](tests/arena.spec.ts-snapshots/arena-desktop-linux.png) ·
[Short phone](tests/arena.spec.ts-snapshots/arena-short-phone-linux.png) ·
[Landscape](tests/arena.spec.ts-snapshots/arena-landscape-linux.png) ·
[Life loss](tests/arena.spec.ts-snapshots/arena-miss-linux.png) ·
[Last life, reduced motion](tests/arena.spec.ts-snapshots/arena-last-life-reduced-linux.png) ·
[Eliminated side becomes a wall](tests/arena.spec.ts-snapshots/arena-eliminated-linux.png) ·
[Champion](tests/arena.spec.ts-snapshots/arena-results-linux.png).

Full-screen Ubuntu fit evidence with taller font metrics:
[Short-phone setup](docs/screenshots/arena-ready-320x568-taller-linux.png) ·
[Landscape play](docs/screenshots/arena-active-844x390-taller-linux.png).

## Reaction Race

Arcade pads and personal hit reward · Linux baseline.

![Reaction Race hit reward](tests/reaction.spec.ts-snapshots/race-hit-linux.png)

[Wrong tap and intended target (macOS)](tests/game.spec.ts-snapshots/race-wrong-darwin.png) ·
[Hold cue](tests/reaction.spec.ts-snapshots/race-hold-linux.png) ·
[Eight shared winners](tests/reaction.spec.ts-snapshots/race-results-eight-linux.png)

## Shared Lights

Warm lenses and visible keyboard focus · phone layout.

![Shared Lights board](tests/lights.spec.ts-snapshots/lights-mixed-focus-phone-linux.png)

[All off](tests/lights.spec.ts-snapshots/lights-off-phone-linux.png) ·
[All on, landscape iPad](tests/lights.spec.ts-snapshots/lights-on-ipad-linux.png) ·
[Short landscape, reduced motion](tests/lights.spec.ts-snapshots/lights-landscape-reduced-linux.png) ·
[Eight connected players](tests/lights.spec.ts-snapshots/lights-eight-phone-linux.png) ·
[Four-device synchronized board](tests/game.spec.ts-snapshots/shared-grid-linux.png).

## Midnight Bakery

Player's hand · phone layout. Rule hints stay visible; collection and passing are below the hand.

![Midnight Bakery hand](tests/bakery.spec.ts-snapshots/bakery-hand-linux.png)

[Eight bakers completing cookie pairs](tests/bakery.spec.ts-snapshots/bakery-eight-pairs-linux.png) ·
[Shared bake-off champions](tests/bakery.spec.ts-snapshots/bakery-eight-finale-linux.png)

## Meteor Minigolf

Mixed course · desktop playing surface.

![Meteor Minigolf mixed course](tests/minigolf.spec.ts-snapshots/golf-mixed-desktop-linux.png)

<details>
<summary>Phone and tablet controls, courses and results</summary>

![Meteor Minigolf phone aiming screen](tests/minigolf.spec.ts-snapshots/golf-active-linux.png)

![Minigolf zero-power guard](tests/minigolf.spec.ts-snapshots/golf-zero-power-linux.png)

![Minigolf strong-power meter](tests/minigolf.spec.ts-snapshots/golf-strong-power-linux.png)

![Minigolf short-phone aim dialog](tests/minigolf.spec.ts-snapshots/golf-aim-dialog-linux.png)

![Meteor Minigolf compact phone controls](tests/minigolf.spec.ts-snapshots/golf-short-phone-linux.png)

![Meteor Minigolf portrait tablet controls](tests/minigolf.spec.ts-snapshots/golf-tablet-linux.png)

![Minigolf Bank shot](tests/minigolf.spec.ts-snapshots/golf-hole-2-linux.png)

![Minigolf Mushrooms](tests/minigolf.spec.ts-snapshots/golf-hole-3-linux.png)

![Minigolf Meteor](tests/minigolf.spec.ts-snapshots/golf-hole-4-linux.png)

![Minigolf meteor impact](tests/minigolf.spec.ts-snapshots/golf-meteor-impact-linux.png)

![Minigolf results](tests/minigolf.spec.ts-snapshots/golf-results-linux.png)

</details>

<details>
<summary>Movement and impact feedback</summary>

![Minigolf launch pulse](tests/minigolf-motion.spec.ts-snapshots/golf-launch-linux.png)

![Minigolf rolling on desktop](tests/minigolf-motion.spec.ts-snapshots/golf-rolling-desktop-linux.png)

![Minigolf rail contact](tests/minigolf-motion.spec.ts-snapshots/golf-rail-contact-linux.png)

![Minigolf stone contact](tests/minigolf-motion.spec.ts-snapshots/golf-stone-contact-linux.png)

![Minigolf mushroom boost](tests/minigolf-motion.spec.ts-snapshots/golf-mushroom-boost-linux.png)

![Minigolf meteor burst](tests/minigolf-motion.spec.ts-snapshots/golf-meteor-burst-linux.png)

![Minigolf reduced-motion meteor highlight](tests/minigolf-motion.spec.ts-snapshots/golf-meteor-burst-reduced-linux.png)

</details>

<details>
<summary>Cup celebrations and final rankings</summary>

![Minigolf ball dropping into the cup](tests/minigolf-results.spec.ts-snapshots/golf-cup-linux.png)

![Minigolf reduced-motion cup highlight](tests/minigolf-results.spec.ts-snapshots/golf-cup-reduced-linux.png)

![Minigolf near-cup points](tests/minigolf-results.spec.ts-snapshots/golf-near-points-linux.png)

![Minigolf winner on phone](tests/minigolf-results.spec.ts-snapshots/golf-winner-phone-linux.png)

![Minigolf winner on desktop](tests/minigolf-results.spec.ts-snapshots/golf-winner-desktop-linux.png)

![Minigolf eight shared winners](tests/minigolf.spec.ts-snapshots/golf-eight-results-linux.png)

</details>

[All courses and states](tests/minigolf.spec.ts-snapshots/) · [All movement and impact states](tests/minigolf-motion.spec.ts-snapshots/) · [All cup and result states](tests/minigolf-results.spec.ts-snapshots/)

## Treasure Dive

Local choice preview · bank, risk or protect the exact carried haul.

![Treasure Dive choice preview](tests/treasure.spec.ts-snapshots/dive-selected-linux.png)

<details>
<summary>Setup, shield protection and final banks</summary>

![Treasure Dive setup](tests/treasure.spec.ts-snapshots/dive-ready-linux.png)

![Treasure Dive shield protection](tests/treasure.spec.ts-snapshots/dive-protected-linux.png)

![Treasure Dive results](tests/treasure.spec.ts-snapshots/dive-results-linux.png)

![Eight shared winners](tests/treasure.spec.ts-snapshots/dive-eight-results-linux.png)

</details>

## Patchwork Picnic

Placement · phone layout.

![Patchwork Picnic active screen](tests/picnic.spec.ts-snapshots/picnic-active-linux.png)

<details>
<summary>Setup and results</summary>

![Patchwork Picnic setup](tests/picnic.spec.ts-snapshots/picnic-ready-linux.png)

![Patchwork Picnic results](tests/picnic.spec.ts-snapshots/picnic-results-linux.png)

</details>

Score forecast and completed-row feedback:

![Matching edges and projected row points](tests/picnic.spec.ts-snapshots/picnic-row-preview-linux.png)

![Completed-row reveal](tests/picnic.spec.ts-snapshots/picnic-row-reveal-linux.png)

![Ten-round packed blanket finale](tests/picnic.spec.ts-snapshots/picnic-packed-results-linux.png)

![Eight-player shared victory](tests/picnic.spec.ts-snapshots/picnic-eight-tie-linux.png)

![Eight long names in ranked Standings](tests/picnic.spec.ts-snapshots/picnic-eight-standings-linux.png)

![Short-phone Arrange forecast](tests/picnic.spec.ts-snapshots/picnic-arrange-linux.png)

![Larger ranked blanket comparisons](tests/picnic.spec.ts-snapshots/picnic-blanket-comparison-linux.png)

## Light Seek

Full search board and a tiled collection that lights up only for completed pieces.

![Light Seek active screen](tests/seek.spec.ts-snapshots/seek-active-linux.png)

<details>
<summary>Setup, selected cell, landscape iPad, discovery and results</summary>

![Light Seek setup tray](tests/seek.spec.ts-snapshots/seek-setup-linux.png)

![Light Seek invalid edge preview](tests/seek.spec.ts-snapshots/seek-invalid-linux.png)

![Light Seek selected phone cell](tests/seek.spec.ts-snapshots/seek-selected-linux.png)

![Light Seek landscape iPad](tests/seek.spec.ts-snapshots/seek-ipad-linux.png)

![Light Seek found piece](tests/seek.spec.ts-snapshots/seek-found-linux.png)

![Light Seek results](tests/seek.spec.ts-snapshots/seek-results-linux.png)

</details>

## Glow Clash

Round rewards · phone layout.

![Glow Clash round rewards](tests/glow.spec.ts-snapshots/glow-mixed-linux.png)

<details>
<summary>Secret choices and eight-player results</summary>

![Glow Clash secret choices](tests/glow.spec.ts-snapshots/glow-secret-linux.png)

![Glow Clash eight-player results](tests/glow.spec.ts-snapshots/glow-eight-results-linux.png)

</details>

[All Glow Clash states](tests/glow.spec.ts-snapshots/)
