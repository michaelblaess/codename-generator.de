/**
 * Seedbarer Zufallsgenerator.
 *
 * Pythons `random.Random(seed)` laesst sich in JavaScript nicht nachbauen -
 * gleicher Seed heisst also NICHT gleiche Namen wie in der TUI. Innerhalb
 * dieser Website ist die Folge dafuer stabil: derselbe Seed liefert immer
 * denselben Stapel, was Permalinks moeglich macht.
 *
 * mulberry32: kurz, schnell, gute Verteilung fuer diesen Zweck.
 */

/**
 * Was die phonetische Mutation vom Zufall braucht. Die Testvektoren setzen hier
 * einen geskripteten Zufall ein, der Seite reicht `Rng`.
 */
export interface RandomSource {
  choice<T>(items: readonly T[]): T;
  sample<T>(items: readonly T[], k: number): T[];
}

export class Rng implements RandomSource {
  private state: number;

  constructor(seed: number) {
    // >>> 0 haelt den Zustand im vorzeichenlosen 32-Bit-Bereich.
    this.state = seed >>> 0;
  }

  /** Gleichverteilt in [0, 1). */
  random(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Ganzzahl in [0, max). */
  range(max: number): number {
    return Math.floor(this.random() * max);
  }

  /** Ein Element aus einer nicht-leeren Liste. */
  choice<T>(items: readonly T[]): T {
    return items[this.range(items.length)];
  }

  /** `k` verschiedene Elemente in zufaelliger Reihenfolge (wie random.sample). */
  sample<T>(items: readonly T[], k: number): T[] {
    const pool = [...items];
    const out: T[] = [];
    for (let i = 0; i < k && pool.length > 0; i += 1) {
      out.push(pool.splice(this.range(pool.length), 1)[0]);
    }
    return out;
  }
}

/** Macht aus einem beliebigen Text einen stabilen 32-Bit-Seed (FNV-1a). */
export function seedFromString(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Zufaelliger Seed fuer einen frischen Stapel. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}
