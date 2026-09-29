import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import * as prefs from '../storage/prefs';
import {
  clampSeek,
  isFinished,
  nextRate,
  recordPosition,
  resumeFrom,
  type SavedPosition,
} from './playback';

/** What the player needs to know about an episode to play and label it. */
export interface NowPlaying {
  title: string;
  show: string;
  audioUrl: string;
  artworkUrl?: string;
}

export interface Player {
  current: NowPlaying | null;
  playing: boolean;
  /** Loading the stream, or stalled waiting on the network. */
  waiting: boolean;
  /** Seconds. */
  position: number;
  /** Seconds; 0 until the stream says. */
  duration: number;
  rate: number;
  /** Whether the full-screen player is open, as opposed to the mini bar. */
  expanded: boolean;
  setExpanded: (open: boolean) => void;
  /** Plays an episode; asking for the one already loaded toggles it instead. */
  start: (item: NowPlaying) => void;
  isCurrent: (audioUrl: string | undefined) => boolean;
  toggle: () => void;
  seekBy: (seconds: number) => void;
  seekTo: (seconds: number) => void;
  cycleRate: () => void;
  /** Stops, remembers the position, and takes the player off screen. */
  stop: () => void;
}

const PlayerContext = createContext<Player | null>(null);

/**
 * The same episode reached from the chart and from its show's feed can carry
 * different tracking parameters; without them it is one episode, so it keeps
 * one resume position.
 */
function episodeKey(audioUrl: string): string {
  return audioUrl.split('?')[0];
}

const SAVE_EVERY_SECONDS = 15;

/**
 * One audio player for the whole app, held above the screens so that playback
 * carries on while you read the news. It plays in the background and puts
 * itself on the lock screen — on Android the second is what keeps the first
 * going past a few minutes — and remembers where each episode was left.
 */
export function PlayerProvider({ children }: { children: ReactNode }) {
  const player = useAudioPlayer(null, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);

  const [current, setCurrent] = useState<NowPlaying | null>(null);
  const [rate, setRate] = useState(1);
  const [expanded, setExpanded] = useState(false);

  const positions = useRef<Record<string, SavedPosition>>({});
  const lastSavedAt = useRef(0);
  // A resume seek has to wait for the new stream: seeking the old one, or one
  // that is not ready, is lost. Right after a replace the status still
  // describes the previous episode, so the new one counts as loaded only once
  // the player has been seen unloading, or reports a different length.
  const pendingSeek = useRef<{
    to: number;
    phase: 'replacing' | 'loading';
    fromDuration: number;
  } | null>(null);

  useEffect(() => {
    // `doNotMix` is what lets the OS tie the lock-screen controls to this player.
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).catch(() => undefined);

    (async () => {
      positions.current = await prefs.loadPlaybackPositions();
      setRate(await prefs.loadPlaybackRate());
    })();
  }, []);

  const remember = useCallback((item: NowPlaying, position: number, duration: number) => {
    positions.current = recordPosition(
      positions.current,
      episodeKey(item.audioUrl),
      position,
      duration,
      Date.now(),
    );
    lastSavedAt.current = position;
    void prefs.savePlaybackPositions(positions.current);
  }, []);

  // Apply a pending resume once the new stream has actually loaded, and the
  // chosen speed with it, since replacing a source can reset the rate.
  useEffect(() => {
    const pending = pendingSeek.current;
    if (!pending) return;

    if (pending.phase === 'replacing') {
      if (!status.isLoaded) {
        pending.phase = 'loading';
        return;
      }
      if (!(status.duration > 0 && status.duration !== pending.fromDuration)) return;
    }

    if (status.isLoaded && status.duration > 0) {
      pendingSeek.current = null;
      if (pending.to > 0) void player.seekTo(clampSeek(pending.to, status.duration)).catch(() => undefined);
      player.setPlaybackRate(rate);
    }
  }, [status.isLoaded, status.duration, player, rate]);

  // Remember the position every so often while playing, and whenever it stops.
  useEffect(() => {
    if (!current || !status.isLoaded || pendingSeek.current) return;

    if (status.didJustFinish || !status.playing) {
      remember(current, status.currentTime, status.duration);
      return;
    }
    if (Math.abs(status.currentTime - lastSavedAt.current) >= SAVE_EVERY_SECONDS) {
      remember(current, status.currentTime, status.duration);
    }
  }, [current, status.isLoaded, status.playing, status.didJustFinish, status.currentTime, status.duration, remember]);

  const toggle = useCallback(() => {
    if (!current) return;
    if (player.playing) {
      player.pause();
      return;
    }
    // Pressing play on a finished episode means "again", not "nothing".
    if (isFinished(player.currentTime, player.duration)) void player.seekTo(0).catch(() => undefined);
    player.play();
  }, [current, player]);

  const start = useCallback(
    (item: NowPlaying) => {
      if (current && episodeKey(current.audioUrl) === episodeKey(item.audioUrl)) {
        toggle();
        return;
      }

      if (current) remember(current, player.currentTime, player.duration);

      pendingSeek.current = {
        to: resumeFrom(positions.current[episodeKey(item.audioUrl)]),
        phase: 'replacing',
        fromDuration: player.duration,
      };
      lastSavedAt.current = 0;

      player.replace({ uri: item.audioUrl, name: item.title });
      player.play();

      try {
        player.setActiveForLockScreen(
          true,
          { title: item.title, artist: item.show, artworkUrl: item.artworkUrl },
          { showSeekForward: true, showSeekBackward: true },
        );
      } catch {
        // Lock-screen controls are a nicety; playback does not depend on them.
      }

      setCurrent(item);
    },
    [current, player, remember, toggle],
  );

  const seekTo = useCallback(
    (seconds: number) => {
      void player.seekTo(clampSeek(seconds, player.duration)).catch(() => undefined);
    },
    [player],
  );

  const seekBy = useCallback(
    (seconds: number) => seekTo(player.currentTime + seconds),
    [player, seekTo],
  );

  const cycleRate = useCallback(() => {
    const next = nextRate(rate);
    player.setPlaybackRate(next);
    setRate(next);
    void prefs.savePlaybackRate(next);
  }, [player, rate]);

  const stop = useCallback(() => {
    if (current) remember(current, player.currentTime, player.duration);
    pendingSeek.current = null;
    player.pause();
    try {
      player.clearLockScreenControls();
      player.replace(null);
    } catch {
      // Already released or never loaded; either way there is nothing to stop.
    }
    setCurrent(null);
    setExpanded(false);
  }, [current, player, remember]);

  const isCurrent = useCallback(
    (audioUrl: string | undefined) =>
      !!current && !!audioUrl && episodeKey(current.audioUrl) === episodeKey(audioUrl),
    [current],
  );

  const value = useMemo<Player>(
    () => ({
      current,
      playing: status.playing,
      waiting: !!current && (!status.isLoaded || status.isBuffering),
      position: status.currentTime,
      duration: status.duration,
      rate,
      expanded,
      setExpanded,
      start,
      isCurrent,
      toggle,
      seekBy,
      seekTo,
      cycleRate,
      stop,
    }),
    [
      current,
      status.playing,
      status.isLoaded,
      status.isBuffering,
      status.currentTime,
      status.duration,
      rate,
      expanded,
      start,
      isCurrent,
      toggle,
      seekBy,
      seekTo,
      cycleRate,
      stop,
    ],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): Player {
  const player = useContext(PlayerContext);
  if (!player) throw new Error('usePlayer must be used inside <PlayerProvider>');
  return player;
}
