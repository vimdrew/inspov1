const MAX_FRAME_WIDTH = 1080;
const MIN_FRAMES = 3;
const LOAD_TIMEOUT_MS = 30_000;
const SEEK_TIMEOUT_MS = 15_000;
const JPEG_QUALITY = 0.8;

class VideoCaptureError extends Error {}

const withTimeout = <T>(promise: Promise<T>, ms: number, message: string): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new VideoCaptureError(message)), ms);
    }),
  ]);

const loadVideo = (video: HTMLVideoElement, url: string, anonymous: boolean) =>
  new Promise<void>((resolve, reject) => {
    if (anonymous) {
      video.crossOrigin = "anonymous";
    } else {
      video.removeAttribute("crossOrigin");
    }
    video.removeAttribute("src");
    video.load();

    const onLoaded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new VideoCaptureError("We couldn't load that video."));
    };
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("error", onError);
    };

    video.addEventListener("loadedmetadata", onLoaded, { once: true });
    video.addEventListener("error", onError, { once: true });
    video.src = url;
  });

const seekTo = (video: HTMLVideoElement, time: number) =>
  new Promise<void>((resolve, reject) => {
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new VideoCaptureError("We couldn't scan that video."));
    };
    const cleanup = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };

    video.addEventListener("seeked", onSeeked, { once: true });
    video.addEventListener("error", onError, { once: true });
    video.currentTime = time;
  });

const drawFrame = (video: HTMLVideoElement): string => {
  const videoWidth = video.videoWidth > 0 ? video.videoWidth : 1;
  const videoHeight = video.videoHeight > 0 ? video.videoHeight : 1;
  const width = Math.min(videoWidth, MAX_FRAME_WIDTH);
  const height = Math.round(videoHeight * (width / videoWidth));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new VideoCaptureError("We couldn't read frames from that video.");
  context.drawImage(video, 0, 0, width, height);

  try {
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } catch {
    // Cross-origin video tainted the canvas — the CDN didn't allow capture.
    throw new VideoCaptureError(
      "That video doesn't allow screenshots. Try importing a direct image link instead.",
    );
  }
};

/**
 * Seeks through a playable video URL and returns up to `maxFrames` JPEG frames
 * as data URLs, evenly spread across the duration. Runs entirely in the
 * browser; the server never sees the raw video. The caller is responsible for
 * showing a meaningful error when this rejects.
 */
export async function captureVideoFrames(videoUrl: string, maxFrames = 10): Promise<string[]> {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  try {
    try {
      await withTimeout(
        loadVideo(video, videoUrl, true),
        LOAD_TIMEOUT_MS,
        "That video took too long to load.",
      );
    } catch {
      // Retry without crossOrigin: some CDNs block CORS fetches but still allow
      // playback. Frames may then taint the canvas, which drawFrame reports.
      await withTimeout(
        loadVideo(video, videoUrl, false),
        LOAD_TIMEOUT_MS,
        "That video took too long to load.",
      );
    }

    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const count =
      duration > 0 ? Math.min(maxFrames, Math.max(MIN_FRAMES, Math.floor(duration))) : 1;

    const frames: string[] = [];
    for (let i = 0; i < count; i++) {
      const time = duration > 0 ? (duration * i) / (count - 1) : 0;
      await withTimeout(seekTo(video, time), SEEK_TIMEOUT_MS, "We couldn't scan that video.");
      frames.push(drawFrame(video));
    }
    return frames;
  } finally {
    video.removeAttribute("src");
    video.load();
  }
}
