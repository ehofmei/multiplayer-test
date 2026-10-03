export interface Signal {
  v: 1;
  session: string;
  peer: string;
  description: RTCSessionDescriptionInit;
}
export function parseSignal(raw: string, type: "offer" | "answer"): Signal {
  if (raw.length > 65_536) throw new Error("Connection text is too large.");
  let s: Signal;
  try {
    s = JSON.parse(raw.trim()) as Signal;
  } catch {
    throw new Error(
      "Invalid connection text. Paste the complete offer or answer.",
    );
  }
  if (
    !s ||
    s.v !== 1 ||
    typeof s.session !== "string" ||
    s.session.length > 80 ||
    !s.session ||
    typeof s.peer !== "string" ||
    !s.peer ||
    s.peer.length > 80 ||
    s.description?.type !== type ||
    typeof s.description.sdp !== "string" ||
    !s.description.sdp.startsWith("v=0")
  )
    throw new Error("This is not a valid version 1 " + type + ".");
  return s;
}
// Manual signaling needs all candidates in one payload; no trickle-ICE transport exists.
export function gatherIce(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      pc.removeEventListener("icegatheringstatechange", changed);
      pc.removeEventListener("connectionstatechange", closed);
    };
    const changed = () => {
      if (pc.iceGatheringState === "complete") {
        cleanup();
        resolve();
      }
    };
    const closed = () => {
      if (pc.connectionState === "closed") {
        cleanup();
        reject(new Error("Pairing was cancelled."));
      }
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("ICE gathering timed out. Try Add Player again."));
    }, 15_000);
    pc.addEventListener("icegatheringstatechange", changed);
    pc.addEventListener("connectionstatechange", closed);
    changed();
  });
}
export async function localSignal(
  pc: RTCPeerConnection,
  session: string,
  peer: string,
): Promise<string> {
  await gatherIce(pc);
  if (!pc.localDescription?.sdp.includes("a=candidate:"))
    throw new Error(
      "No LAN candidates were found. Check browser permissions and Wi-Fi, then try again.",
    );
  return JSON.stringify({
    v: 1,
    session,
    peer,
    description: {
      type: pc.localDescription.type,
      sdp: pc.localDescription.sdp,
    },
  });
}
