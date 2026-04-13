import { useState, useEffect, useRef, useCallback } from "react";

interface YTPlayerState {
  PLAYING: number;
  PAUSED: number;
  ENDED: number;
  BUFFERING: number;
  CUED: number;
}

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  nextVideo(): void;
  previousVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getVideoData(): { title: string; video_id: string };
  getCurrentTime(): number;
  getDuration(): number;
  getVolume(): number;
  setVolume(volume: number): void;
  destroy(): void;
}

interface YTPlayerEvent {
  target: YTPlayer;
}

interface YTStateChangeEvent {
  target: YTPlayer;
  data: number;
}

interface YTPlayerOptions {
  height: string;
  width: string;
  playerVars: {
    listType: string;
    list: string;
    autoplay: number;
    controls: number;
  };
  events: {
    onReady: (e: YTPlayerEvent) => void;
    onStateChange: (e: YTStateChangeEvent) => void;
  };
}

interface YTNamespace {
  Player: new (containerId: string, options: YTPlayerOptions) => YTPlayer;
  PlayerState: YTPlayerState;
}

declare global {
  interface Window {
    YT: YTNamespace;
    onYouTubeIframeAPIReady: () => void;
  }
}

export interface TrackInfo {
  title: string;
  videoId: string;
}

interface YouTubePlayerOptions {
  playlistId: string;
  containerId: string;
}

export function useYouTubePlayer({ playlistId, containerId }: YouTubePlayerOptions) {
  const playerRef = useRef<YTPlayer | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(50);
  const [trackInfo, setTrackInfo] = useState<TrackInfo>({ title: "Loading...", videoId: "" });

  const syncTrackInfo = useCallback(() => {
    if (!playerRef.current) return;
    const data = playerRef.current.getVideoData?.();
    if (data?.title) setTrackInfo({ title: data.title, videoId: data.video_id });
    setCurrentTime(playerRef.current.getCurrentTime?.() ?? 0);
    setDuration(playerRef.current.getDuration?.() ?? 0);
  }, []);

  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(syncTrackInfo, 500);
  }, [syncTrackInfo]);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const initPlayer = useCallback(() => {
    playerRef.current = new window.YT.Player(containerId, {
      height: "0",
      width: "0",
      playerVars: {
        listType: "playlist",
        list: playlistId,
        autoplay: 0,
        controls: 0,
      },
      events: {
        onReady: (e: YTPlayerEvent) => {
          setIsReady(true);
          setVolumeState(e.target.getVolume());
          syncTrackInfo();
        },
        onStateChange: (e: YTStateChangeEvent) => {
          const state = e.data;
          if (state === window.YT.PlayerState.PLAYING) {
            setIsPlaying(true);
            startInterval();
            syncTrackInfo();
          } else if (
            state === window.YT.PlayerState.PAUSED ||
            state === window.YT.PlayerState.ENDED
          ) {
            setIsPlaying(false);
            stopInterval();
            syncTrackInfo();
          }
        },
      },
    });
  }, [containerId, playlistId, syncTrackInfo, startInterval, stopInterval]);

  useEffect(() => {
    if (window.YT?.Player) {
      initPlayer();
    } else {
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      stopInterval();
      playerRef.current?.destroy?.();
    };
  }, [initPlayer, stopInterval]);

  const toggle = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const next = () => {
    playerRef.current?.nextVideo();
  };

  const prev = () => {
    playerRef.current?.previousVideo();
  };

  const seek = (time: number) => {
    playerRef.current?.seekTo(time, true);
    setCurrentTime(time);
  };

  const setVolume = (value: number) => {
    playerRef.current?.setVolume(value);
    setVolumeState(value);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return {
    trackInfo,
    isReady,
    isPlaying,
    currentTime,
    duration,
    volume,
    toggle,
    next,
    prev,
    seek,
    setVolume,
    formatTime,
  };
}
