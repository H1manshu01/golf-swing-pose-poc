import { Injectable } from '@angular/core';
import { FrameSample } from '../models/pose.models';

@Injectable({ providedIn: 'root' })
export class FrameExtractorService {
  /**
   * Loads a remote video into the supplied (hidden) element and extracts frames.
   */
  async extractFrames(
    videoEl: HTMLVideoElement,
    url: string,
    fps = 10,
    maxFrames = 200,
  ): Promise<FrameSample[]> {
    return new Promise((resolve, reject) => {
      videoEl.crossOrigin = 'anonymous';
      videoEl.playsInline = true;
      videoEl.muted = true;
      videoEl.src = url;
      videoEl.onloadedmetadata = async () => {
        const duration = videoEl.duration;
        const width = videoEl.videoWidth || 640;
        const height = videoEl.videoHeight || 360;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not create canvas context'));
          return;
        }

        const totalFrames = Math.min(Math.floor(duration * fps), maxFrames);
        const frames: FrameSample[] = [];
        for (let i = 0; i < totalFrames; i += 1) {
          const currentTime = i / fps;
          await this.seek(videoEl, currentTime);
          ctx.drawImage(videoEl, 0, 0, width, height);
          const frameCanvas = document.createElement('canvas');
          frameCanvas.width = width;
          frameCanvas.height = height;
          const frameCtx = frameCanvas.getContext('2d');
          // Copy pixel buffer so downstream pose calls see a stable frame.
          frameCtx?.drawImage(canvas, 0, 0, width, height);
          frames.push({ timestamp: currentTime, canvas: frameCanvas });
        }
        resolve(frames);
      };

      videoEl.onerror = () => reject(new Error('Failed to load video'));
      videoEl.load();
    });
  }

  private seek(videoEl: HTMLVideoElement, time: number): Promise<void> {
    return new Promise((resolve) => {
      const handler = () => {
        videoEl.removeEventListener('seeked', handler);
        resolve();
      };
      videoEl.addEventListener('seeked', handler, { once: true });
      videoEl.currentTime = Math.min(time, videoEl.duration);
    });
  }
}
