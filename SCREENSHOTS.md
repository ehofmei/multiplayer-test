# Game Lab screenshot gallery

Browse the latest reviewed screenshots for all 14 games in this branch. Click an
image to inspect it at full size. Most images come directly from the game's
versioned visual-test baselines, so the gallery follows baseline updates without
duplicating images. Some show just the playing surface; others include controls.

On GitHub, the branch selector controls which version you see: `main` shows the
published source, while a review branch shows its proposed changes. These are
desktop Chromium captures, including simulated phone layouts, rather than
photographs from physical iPhones or iPads. Linux baselines are shown where
available; shared baselines and the saved Arena Pong capture are identified below.

[Sumo Bumpers](#sumo-bumpers) · [Light-cycle Arena](#light-cycle-arena) ·
[Spaceship Panic](#spaceship-panic) · [Co-op Breakout](#co-op-breakout) ·
[Pong](#pong) · [Arena Pong](#arena-pong) · [Reaction Race](#reaction-race) ·
[Shared Lights](#shared-lights) · [Midnight Bakery](#midnight-bakery) ·
[Meteor Minigolf](#meteor-minigolf) · [Treasure Dive](#treasure-dive) ·
[Patchwork Picnic](#patchwork-picnic) · [Light Seek](#light-seek) ·
[Glow Clash](#glow-clash)

## Sumo Bumpers

Arena · shared baseline.

![Sumo Bumpers arena](tests/game.spec.ts-snapshots/sumo-court.png)

## Light-cycle Arena

Arena · shared baseline.

![Light-cycle Arena](tests/game.spec.ts-snapshots/cycle-court.png)

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

Playing surface · shared baseline.

![Co-op Breakout court](tests/game.spec.ts-snapshots/breakout-court.png)

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

Four-player match, paused · desktop layout. Saved macOS capture from the existing
four-player pairing test; this is evidence, not a visual comparison baseline.

![Arena Pong four-player match](docs/screenshots/arena-pong-desktop.png)

## Reaction Race

Targets · shared baseline.

![Reaction Race targets](tests/game.spec.ts-snapshots/race-targets.png)

## Shared Lights

Shared board · shared baseline.

![Shared Lights board](tests/game.spec.ts-snapshots/shared-grid.png)

## Midnight Bakery

Player's hand · phone layout.

![Midnight Bakery hand](tests/bakery.spec.ts-snapshots/bakery-hand-linux.png)

## Meteor Minigolf

Mixed course · desktop playing surface.

![Meteor Minigolf mixed course](tests/minigolf.spec.ts-snapshots/golf-mixed-desktop-linux.png)

<details>
<summary>Phone controls, courses and results</summary>

![Meteor Minigolf phone aiming screen](tests/minigolf.spec.ts-snapshots/golf-active-linux.png)

![Minigolf Bank shot](tests/minigolf.spec.ts-snapshots/golf-hole-2-linux.png)

![Minigolf Mushrooms](tests/minigolf.spec.ts-snapshots/golf-hole-3-linux.png)

![Minigolf Meteor](tests/minigolf.spec.ts-snapshots/golf-hole-4-linux.png)

![Minigolf meteor impact](tests/minigolf.spec.ts-snapshots/golf-meteor-impact-linux.png)

![Minigolf results](tests/minigolf.spec.ts-snapshots/golf-results-linux.png)

</details>

[All courses and states](tests/minigolf.spec.ts-snapshots/)

## Treasure Dive

Active dive · phone layout.

![Treasure Dive active screen](tests/treasure.spec.ts-snapshots/dive-active-linux.png)

<details>
<summary>Setup and results</summary>

![Treasure Dive setup](tests/treasure.spec.ts-snapshots/dive-ready-linux.png)

![Treasure Dive results](tests/treasure.spec.ts-snapshots/dive-results-linux.png)

</details>

## Patchwork Picnic

Placement · phone layout.

![Patchwork Picnic active screen](tests/picnic.spec.ts-snapshots/picnic-active-linux.png)

<details>
<summary>Setup and results</summary>

![Patchwork Picnic setup](tests/picnic.spec.ts-snapshots/picnic-ready-linux.png)

![Patchwork Picnic results](tests/picnic.spec.ts-snapshots/picnic-results-linux.png)

</details>

## Light Seek

Active board · phone layout.

![Light Seek active screen](tests/seek.spec.ts-snapshots/seek-active-linux.png)

<details>
<summary>Found piece and results</summary>

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
