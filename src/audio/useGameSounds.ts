import { useEffect, useRef, useState } from "react";
import type { Snapshot } from "../network/session";
import { Sounds } from "./sounds";
import { soundEvents, soundFrame, type SoundFrame } from "./events";
const storageKey = "p2p-game-lab-sound-v1";
export function useGameSounds(
  snapshot: Snapshot | null,
  me: string,
  session: string,
  visible: boolean,
) {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === "true";
    } catch {
      return false;
    }
  });
  const [unavailable, setUnavailable] = useState(false);
  const preference = useRef(enabled);
  const audio = useRef<Sounds | null>(null);
  const previous = useRef<SoundFrame | null>(null);
  useEffect(() => {
    const sounds = new Sounds();
    audio.current = sounds;
    sounds.setEnabled(preference.current);
    const unlock = () => {
      if (preference.current) void sounds.unlock();
    };
    const visibility = () => {
      if (document.hidden) sounds.suspend();
    };
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("keydown", unlock, true);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("keydown", unlock, true);
      document.removeEventListener("visibilitychange", visibility);
      sounds.dispose();
      audio.current = null;
    };
  }, []);
  useEffect(() => {
    if (!snapshot || !visible) {
      previous.current = null;
      audio.current?.stop();
      return;
    }
    const next = soundFrame(snapshot, me, session);
    if (previous.current?.key !== next.key) audio.current?.stop();
    const cues = soundEvents(previous.current, next);
    previous.current = next;
    if (!document.hidden) for (const cue of cues) audio.current?.play(cue);
  }, [snapshot, me, session, visible]);
  const toggle = async () => {
    const next = !preference.current;
    preference.current = next;
    setEnabled(next);
    setUnavailable(false);
    try {
      localStorage.setItem(storageKey, String(next));
    } catch {
      /* Session preference still works. */
    }
    const sounds = audio.current;
    sounds?.setEnabled(next);
    if (next) {
      const ready = await sounds?.unlock();
      if (preference.current) {
        setUnavailable(!ready);
        if (ready) sounds?.play("enable");
      }
    }
  };
  return { enabled, unavailable, toggle };
}
