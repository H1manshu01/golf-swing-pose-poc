import { Injectable } from '@angular/core';
import { Pose, PoseConfig, Results } from '@mediapipe/pose';

@Injectable({ providedIn: 'root' })
export class PoseService {
  private pose: Pose | null = null;
  private ready: Promise<void> | null = null;

  private get config(): PoseConfig {
    return {
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`,
    };
  }

  async init(): Promise<void> {
    if (this.pose && this.ready) {
      return this.ready;
    }

    // Configure Pose to load assets locally (CDN) and stay on-device.
    this.pose = new Pose(this.config);
    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      selfieMode: false,
    });
    this.ready = this.pose.initialize();
    return this.ready;
  }

  async estimate(image: HTMLVideoElement | HTMLCanvasElement): Promise<Results> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.pose) {
        reject(new Error('Pose not initialized'));
        return;
      }

      this.pose.onResults((results) => resolve(results));
      this.pose
        .send({ image })
        .catch((err) => reject(err));
    });
  }

  async dispose(): Promise<void> {
    if (this.pose) {
      await this.pose.close();
      this.pose = null;
      this.ready = null;
    }
  }
}
