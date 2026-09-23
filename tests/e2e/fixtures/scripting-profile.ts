/**
 * How much main-thread scripting a page load spent on the card, read from a
 * sampled V8 CPU profile (the `Profiler.stop` result over the DevTools
 * protocol, the same sampler a DevTools performance trace records).
 *
 * A dashboard load is mostly Home Assistant's own frontend, so the page's total
 * scripting time says little about the card. A sample counts here when any
 * frame on its stack comes from a card bundle: that is the card's own code plus
 * everything it calls into synchronously — DOM APIs, Lit's template cloning,
 * Home Assistant helpers — which is the cost of rendering it. Idle, `(program)`
 * and garbage-collection samples never count.
 */

/** The subset of the DevTools protocol's `Profiler.Profile` this reads. */
export interface CpuProfile {
  nodes: {
    id: number;
    callFrame: { functionName: string; url: string };
    children?: number[];
  }[];
  /** Microseconds. */
  startTime: number;
  /** Microseconds. */
  endTime: number;
  samples?: number[];
  /** Microseconds; `timeDeltas[i]` is the gap before `samples[i]`. */
  timeDeltas?: number[];
}

export interface CardScripting {
  /** Milliseconds of samples with a card frame on the stack. */
  cardMs: number;
  /** Milliseconds of every non-idle sample, card or not. */
  busyMs: number;
  /** How many samples counted towards `cardMs`. */
  cardSamples: number;
}

/**
 * The entry and every lazy chunk: `growspace-manager-card.js` and
 * `growspace-<name>-<hash>.js`, whatever path and cache-busting query serve them.
 */
export const CARD_SCRIPT_URL = /\/growspace-[^/?#]*\.js(?:[?#]|$)/;

const NOT_SCRIPTING = new Set(['(idle)', '(program)', '(garbage collector)']);

export function cardScripting(profile: CpuProfile): CardScripting {
  const parentOf = new Map<number, number>();
  for (const node of profile.nodes) {
    for (const child of node.children ?? []) parentOf.set(child, node.id);
  }
  const byId = new Map(profile.nodes.map((node) => [node.id, node]));

  const inCard = new Map<number, boolean>();
  const isInCard = (id: number): boolean => {
    const known = inCard.get(id);
    if (known !== undefined) return known;
    const node = byId.get(id);
    const parent = parentOf.get(id);
    const result =
      node !== undefined &&
      (CARD_SCRIPT_URL.test(node.callFrame.url) || (parent !== undefined && isInCard(parent)));
    inCard.set(id, result);
    return result;
  };

  const samples = profile.samples ?? [];
  const deltas = profile.timeDeltas ?? [];
  let timestamp = profile.startTime;
  let cardMicros = 0;
  let busyMicros = 0;
  let cardSamples = 0;
  for (let index = 0; index < samples.length; index += 1) {
    timestamp += deltas[index] ?? 0;
    // A sample stands for the time until the next one, as DevTools reads it.
    const duration =
      index + 1 < samples.length ? (deltas[index + 1] ?? 0) : profile.endTime - timestamp;
    const node = byId.get(samples[index]);
    if (node === undefined || NOT_SCRIPTING.has(node.callFrame.functionName)) continue;
    busyMicros += duration;
    if (isInCard(node.id)) {
      cardMicros += duration;
      cardSamples += 1;
    }
  }
  return { cardMs: cardMicros / 1000, busyMs: busyMicros / 1000, cardSamples };
}
