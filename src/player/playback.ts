/**
 * The rules of the podcast player that do not need a phone to check: where an
 * episode resumes, when it counts as finished, how positions are remembered,
 * and how times and speeds read. Nothing here touches the audio module.
 */

/** Skips are asymmetric on purpose: back is for "what did they just say". */
export const SKIP_BACK_SECONDS = 15;
export const SKIP_FORWARD_SECONDS = 30;

/** Tapping the speed button walks this cycle; Android tops out at 2×. */
export const PLAYBACK_RATES = [1, 1.25, 1.5, 1.75, 2, 0.8] as const;

export function nextRate(rate: number): number {
  const index = PLAYBACK_RATES.findIndex((candidate) => Math.abs(candidate - rate) < 0.01);
  return PLAYBACK_RATES[(index + 1) % PLAYBACK_RATES.length];
}

export function formatRate(rate: number): string {
  return `${Number.isInteger(rate) ? rate.toFixed(0) : String(rate)}×`;
}

export interface SavedPosition {
  /** Seconds into the episode. */
  position: number;
  /** Seconds, or 0 when the stream never said. */
  duration: number;
  /** Epoch ms, for dropping the least recently heard when the list is full. */
  updatedAt: number;
}

export const POSITION_LIMIT = 100;

/** Under this, "resume" would just be the intro again, so it starts fresh. */
const MIN_RESUME_SECONDS = 15;
/** Within this of the end is the outro: the episode has been heard. */
const FINISHED_WITHIN_SECONDS = 30;
/** Resuming exactly where it stopped drops you mid-word; back up a little. */
const RESUME_REWIND_SECONDS = 3;

export function isFinished(position: number, duration: number): boolean {
  return duration > 0 && position >= duration - FINISHED_WITHIN_SECONDS;
}

/** Where a previously heard episode picks up, in seconds; 0 means the start. */
export function resumeFrom(saved: SavedPosition | undefined): number {
  if (!saved || saved.position < MIN_RESUME_SECONDS) return 0;
  if (isFinished(saved.position, saved.duration)) return 0;
  return Math.max(0, saved.position - RESUME_REWIND_SECONDS);
}

/**
 * The remembered positions after hearing `id` up to `position`. A finished
 * episode is forgotten, so it starts from the top if played again; a list past
 * its limit sheds whatever was heard longest ago.
 */
export function recordPosition(
  positions: Record<string, SavedPosition>,
  id: string,
  position: number,
  duration: number,
  now: number,
  limit = POSITION_LIMIT,
): Record<string, SavedPosition> {
  const next = { ...positions };

  if (position < MIN_RESUME_SECONDS || isFinished(position, duration)) {
    delete next[id];
    return next;
  }

  next[id] = { position, duration, updatedAt: now };

  const ids = Object.keys(next);
  if (ids.length <= limit) return next;

  const newestFirst = ids.sort((a, b) => next[b].updatedAt - next[a].updatedAt);
  return Object.fromEntries(newestFirst.slice(0, limit).map((key) => [key, next[key]]));
}

/** A seek target kept inside the episode; an unknown length only bounds below. */
export function clampSeek(target: number, duration: number): number {
  const floor = Math.max(0, target);
  return duration > 0 ? Math.min(floor, Math.max(0, duration - 1)) : floor;
}

/** 0:07, 12:05, 1:02:03 — the clock format players use. */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = String(total % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${secs}` : `${minutes}:${secs}`;
}
