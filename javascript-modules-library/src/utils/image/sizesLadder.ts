/**
 * The slot a single source size describes, in CSS pixels, at the two ends of the viewport range.
 *
 * Both bounds are deliberately generous: `min` may be smaller than the slot ever gets and `max`
 * larger than it ever gets. A bound that errs outward widens the candidate ladder, and a ladder
 * that is too wide costs a few bytes of markup, where one that is too narrow serves an image the
 * browser has to upscale.
 */
interface SlotBounds {
  min: number;
  max: number;
}

/** A source size that is a plain viewport fraction: `33vw`, `33.3vw`, `100VW`. */
const VIEWPORT_FRACTION = /^([0-9]*\.?[0-9]+)vw$/i;

/** A source size that is a plain length in pixels: `400px`. */
const PIXELS = /^([0-9]*\.?[0-9]+)px$/i;

/** The CSS math functions a source size may be written with. */
const MATH_FUNCTION = /^(?:calc|min|max|clamp)\(/i;

/** Every `vw` and `px` length inside a math function, at any depth. */
const LENGTHS = /([0-9]*\.?[0-9]+)(vw|px)\b/gi;

/**
 * Splits on the separators that are not inside parentheses — the commas between `sizes` entries,
 * and the spaces between a media condition and its source size. `min(100vw, 400px)` is one token
 * either way.
 *
 * @returns The non-empty parts, or `null` when the parentheses do not balance.
 */
const splitTopLevel = (input: string, separator: RegExp): string[] | null => {
  const parts: string[] = [];
  let depth = 0;
  let current = "";

  for (const char of input) {
    if (char === "(") depth++;
    else if (char === ")") depth--;
    if (depth < 0) return null;

    if (depth === 0 && separator.test(char)) {
      if (current.trim()) parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  if (depth !== 0) return null;
  if (current.trim()) parts.push(current.trim());
  return parts;
};

/**
 * The slot one source size describes, given the narrowest and widest viewport the ladder plans for.
 *
 * A math function is not evaluated — `rem`, `%` and `em` inside it have no pixel value here. Its
 * `vw` and `px` lengths are read instead, and combined into bounds that cannot be too tight: the
 * smallest single length for the lower bound, the sum of them all for the upper one. `calc(100vw -
 * 2rem)` is therefore read as at most `100vw`, and `clamp(200px, 50vw, 600px)` as at most their sum
 * — both wider than the truth, which is the safe direction.
 *
 * @returns The bounds, or `null` for a source size this cannot read — `auto`, `50%`, `20em`.
 */
const boundsOf = (sourceSize: string, narrowest: number, widest: number): SlotBounds | null => {
  const fraction = VIEWPORT_FRACTION.exec(sourceSize);
  if (fraction) {
    const ratio = Number(fraction[1]) / 100;
    return { min: ratio * narrowest, max: ratio * widest };
  }

  const pixels = PIXELS.exec(sourceSize);
  if (pixels) return { min: Number(pixels[1]), max: Number(pixels[1]) };

  if (!MATH_FUNCTION.test(sourceSize)) return null;

  const atNarrowest: number[] = [];
  let atWidest = 0;
  for (const [, value, unit] of sourceSize.matchAll(LENGTHS)) {
    const amount = Number(value);
    if (unit.toLowerCase() === "vw") {
      atNarrowest.push((amount / 100) * narrowest);
      atWidest += (amount / 100) * widest;
    } else {
      atNarrowest.push(amount);
      atWidest += amount;
    }
  }

  return atNarrowest.length ? { min: Math.min(...atNarrowest), max: atWidest } : null;
};

/**
 * The candidate file widths a `sizes` attribute asks for.
 *
 * This is the one place where the two descriptions of a slot are kept in agreement: a call site
 * that writes its own `sizes` gets a ladder derived from that string, rather than one derived from
 * a slot width the string never mentions.
 *
 * The ladder's own extremes double as the viewport range to plan for — the narrowest breakpoint is
 * taken as the narrowest viewport, the widest as the widest — because they are the only real
 * numbers the caller has given us about the site. Each entry's source size is read at both ends,
 * the narrowest slot any entry can describe becomes the floor and the widest becomes the ceiling,
 * and the ladder keeps every breakpoint from the floor up to and including the first one that
 * reaches twice the ceiling. Twice, because the widest slot still has to be sharp on a 2x display.
 *
 * A `sizes` this cannot read — `auto`, a `%`, an `em`, an unbalanced parenthesis — returns the
 * whole ladder. That is the point: an unreadable string must never narrow the ladder, or the images
 * it describes ship under-served and nothing says so.
 *
 * @param sizes - The `sizes` attribute, as the call site wrote it.
 * @param breakpoints - The candidate ladder to draw from.
 * @returns The candidates to offer, in the order the breakpoints were given.
 */
export function ladderFromSizes(sizes: string, breakpoints: readonly number[]): number[] {
  const wholeLadder = [...breakpoints];
  if (breakpoints.length === 0) return wholeLadder;

  const narrowest = Math.min(...breakpoints);
  const widest = Math.max(...breakpoints);

  const entries = splitTopLevel(sizes, /,/);
  if (!entries?.length) return wholeLadder;

  const bounds: SlotBounds[] = [];
  for (const entry of entries) {
    // An entry is an optional media condition followed by the source size, so the slot is the last
    // token — the one the media condition's own lengths (`(min-width: 1024px)`) are never mistaken
    // for
    const sourceSize = splitTopLevel(entry, /\s/)?.at(-1);
    const entryBounds = sourceSize ? boundsOf(sourceSize, narrowest, widest) : null;
    if (!entryBounds) return wholeLadder;
    bounds.push(entryBounds);
  }

  const floor = Math.min(...bounds.map(({ min }) => min));
  const ceiling = Math.max(...bounds.map(({ max }) => max));

  const ladder: number[] = [];
  for (const candidate of [...breakpoints].sort((a, b) => a - b)) {
    // A file narrower than the narrowest the slot can be is one the browser would never pick
    if (candidate < floor) continue;
    ladder.push(candidate);
    if (candidate >= 2 * ceiling) break;
  }

  return ladder.length ? ladder : wholeLadder;
}
