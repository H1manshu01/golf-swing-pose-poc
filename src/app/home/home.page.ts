import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { Results } from '@mediapipe/pose';
import { AnalysisService } from '../services/analysis.service';
import { FrameExtractorService } from '../services/frame-extractor.service';
import { PoseService } from '../services/pose.service';
import { FramePoseData, SwingAnalysis } from '../models/pose.models';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnDestroy {
  @ViewChild('hiddenVideo', { static: true }) hiddenVideo!: ElementRef<HTMLVideoElement>;

  videoUrl = '';
  frameRate = 10;
  fpsOptions = [5, 10, 15];
  isProcessing = false;
  statusMessage = 'Waiting for input';
  progress = 0;
  framesProcessed: FramePoseData[] = [];
  analysis?: SwingAnalysis;

  constructor(
    private readonly poseService: PoseService,
    private readonly frameExtractor: FrameExtractorService,
    private readonly analysisService: AnalysisService,
  ) {}

  ngOnDestroy(): void {
    this.poseService.dispose();
  }

  // Main workflow: load video -> sample frames -> run pose -> compute swing summary.
  async analyze(): Promise<void> {
    if (!this.videoUrl) {
      return;
    }

    this.isProcessing = true;
    this.statusMessage = 'Loading video...';
    this.framesProcessed = [];
    this.analysis = undefined;
    this.progress = 0;

    try {
      const frames = await this.frameExtractor.extractFrames(
        this.hiddenVideo.nativeElement,
        this.videoUrl,
        this.frameRate,
      );
      if (!frames.length) {
        this.statusMessage = 'No frames extracted from video';
        this.isProcessing = false;
        return;
      }

      const total = frames.length || 1;
      for (let i = 0; i < frames.length; i += 1) {
        const frame = frames[i];
        this.statusMessage = `Detecting pose ${i + 1}/${total}`;
        const results: Results = await this.poseService.estimate(frame.canvas);
        const keypoints = (results.poseLandmarks || []).map((lm, idx) => ({
          name: `landmark-${idx}`,
          x: lm.x,
          y: lm.y,
          z: lm.z,
          visibility: lm.visibility,
        }));

        if (keypoints.length) {
          const processedFrame = this.analysisService.buildFrame(keypoints, frame.timestamp);
          this.framesProcessed.push(processedFrame);
        }

        this.progress = Math.round(((i + 1) / total) * 100);
        await new Promise((resolve) => setTimeout(resolve, 0)); // yield to UI
      }

      this.analysis = this.analysisService.summarize(this.framesProcessed);
      this.statusMessage = 'Analysis complete';
    } catch (err) {
      console.error(err);
      this.statusMessage = 'Error analyzing video';
    } finally {
      this.isProcessing = false;
    }
  }
}
