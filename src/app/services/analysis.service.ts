import { Injectable } from '@angular/core';
import {
  FramePoseData,
  PoseKeypoint,
  PoseMetrics,
  SwingAnalysis,
  SwingPhase,
  SwingStage,
} from '../models/pose.models';

interface Point {
  x: number;
  y: number;
  z?: number;
}

@Injectable({ providedIn: 'root' })
export class AnalysisService {
  private readonly idx = {
    nose: 0,
    leftShoulder: 11,
    rightShoulder: 12,
    leftElbow: 13,
    rightElbow: 14,
    leftWrist: 15,
    rightWrist: 16,
    leftIndex: 19,
    rightIndex: 20,
    leftHip: 23,
    rightHip: 24,
    leftKnee: 25,
    rightKnee: 26,
    leftAnkle: 27,
    rightAnkle: 28,
  };

  buildFrame(
    landmarks: PoseKeypoint[],
    timestamp: number,
  ): FramePoseData {
    const metrics = this.computeMetrics(landmarks);
    return { timestamp, landmarks, metrics };
  }

  computeMetrics(landmarks: PoseKeypoint[]): PoseMetrics {
    const leftShoulder = landmarks[this.idx.leftShoulder];
    const rightShoulder = landmarks[this.idx.rightShoulder];
    const leftHip = landmarks[this.idx.leftHip];
    const rightHip = landmarks[this.idx.rightHip];
    const leftElbow = landmarks[this.idx.leftElbow];
    const rightElbow = landmarks[this.idx.rightElbow];
    const leftWrist = landmarks[this.idx.leftWrist];
    const rightWrist = landmarks[this.idx.rightWrist];
    const leftIndex = landmarks[this.idx.leftIndex];
    const rightIndex = landmarks[this.idx.rightIndex];
    const leftKnee = landmarks[this.idx.leftKnee];
    const rightKnee = landmarks[this.idx.rightKnee];
    const leftAnkle = landmarks[this.idx.leftAnkle];
    const rightAnkle = landmarks[this.idx.rightAnkle];

    const midShoulder = this.midPoint(leftShoulder, rightShoulder);
    const midHip = this.midPoint(leftHip, rightHip);

    const spineTilt = this.angleToVertical(midHip, midShoulder);
    const shoulderRotation = this.angleToHorizontal(leftShoulder, rightShoulder);
    const hipRotation = this.angleToHorizontal(leftHip, rightHip);
    const leftElbowAngle = this.jointAngle(leftShoulder, leftElbow, leftWrist);
    const rightElbowAngle = this.jointAngle(rightShoulder, rightElbow, rightWrist);
    const leftWristAngle = this.jointAngle(leftElbow, leftWrist, leftIndex || leftWrist);
    const rightWristAngle = this.jointAngle(rightElbow, rightWrist, rightIndex || rightWrist);
    const kneeFlexion = this.jointAngle(leftHip, leftKnee, leftAnkle);
    const handHeight = 1 - ((leftWrist.y + rightWrist.y) / 2);

    return {
      spineTilt,
      shoulderRotation,
      hipRotation,
      leftElbowAngle,
      rightElbowAngle,
      leftWristAngle,
      rightWristAngle,
      kneeFlexion,
      handHeight,
    };
  }

  summarize(frames: FramePoseData[]): SwingAnalysis {
    if (!frames.length) {
      return { phases: [], summary: [], frameCount: 0, duration: 0 };
    }

    // Heuristic scoring: hand height drives phase markers (address -> top -> impact -> finish).
    const topIndex = this.maxBy(frames, (f) => f.metrics.handHeight);
    const impactIndex = topIndex + this.minBy(frames.slice(topIndex), (f) => f.metrics.handHeight);
    const finalIndex = frames.length - 1;

    const staged = frames.map((frame, index) => ({
      ...frame,
      stage: this.stageForIndex(index, topIndex, impactIndex, finalIndex),
    }));

    const phases = this.buildPhases(staged, [0, topIndex, impactIndex, finalIndex]);
    const summary = this.buildSummary(phases);

    return {
      phases,
      summary,
      frameCount: frames.length,
      duration: frames[frames.length - 1].timestamp,
    };
  }

  private stageForIndex(
    idx: number,
    topIndex: number,
    impactIndex: number,
    finalIndex: number,
  ): SwingStage {
    if (idx === 0) return 'address';
    if (idx < topIndex) return 'backswing';
    if (idx === topIndex) return 'top';
    if (idx < impactIndex) return 'downswing';
    if (idx === impactIndex) return 'impact';
    if (idx < finalIndex) return 'followThrough';
    return 'followThrough';
  }

  private buildPhases(
    frames: FramePoseData[],
    markers: number[],
  ): SwingPhase[] {
    const [addressIdx, topIdx, impactIdx, finishIdx] = markers;
    const addressFrame = frames[addressIdx];
    const topFrame = frames[topIdx];
    const impactFrame = frames[impactIdx] || frames[frames.length - 1];
    const finishFrame = frames[finishIdx];

    return [
      this.phaseFromFrame('address', addressFrame, 'Address setup captured.'),
      this.phaseFromFrame('backswing', topIdx > 0 ? frames[Math.floor(topIdx / 2)] : addressFrame, 'Backswing loading.'),
      this.phaseFromFrame('top', topFrame, 'Top of swing reached.'),
      this.phaseFromFrame('downswing', impactIdx > topIdx ? frames[Math.floor((topIdx + impactIdx) / 2)] : impactFrame, 'Transition into downswing.'),
      this.phaseFromFrame('impact', impactFrame, 'Impact position detected.'),
      this.phaseFromFrame('followThrough', finishFrame, 'Follow through and finish.'),
    ];
  }

  private phaseFromFrame(
    name: SwingStage,
    frame: FramePoseData,
    description: string,
  ): SwingPhase {
    return {
      name,
      timestamp: frame.timestamp,
      description,
      metrics: frame.metrics,
    };
  }

  private buildSummary(phases: SwingPhase[]): string[] {
    const address = phases.find((p) => p.name === 'address');
    const top = phases.find((p) => p.name === 'top');
    const impact = phases.find((p) => p.name === 'impact');
    const follow = phases.find((p) => p.name === 'followThrough');

    const notes: string[] = [];
    if (address && address.metrics.spineTilt > 15) {
      notes.push('Spine tilt is strong at address; ensure comfort and balance.');
    } else if (address) {
      notes.push('Neutral spine tilt at address, good for rotation.');
    }

    if (top && top.metrics.leftElbowAngle < 150) {
      notes.push('Lead arm bends at the top; consider width in backswing.');
    } else if (top) {
      notes.push('Lead arm stays extended at the top of swing.');
    }

    if (impact && impact.metrics.hipRotation - impact.metrics.shoulderRotation > 10) {
      notes.push('Hips are leading shoulders into impact (good separation).');
    } else if (impact) {
      notes.push('Limited hip-shoulder separation at impact; focus on clearing hips.');
    }

    if (follow && follow.metrics.spineTilt < 5) {
      notes.push('Finish is upright; allow spine to extend through the ball.');
    }

    return notes;
  }

  private jointAngle(a: Point, b: Point, c: Point): number {
    const ab = { x: a.x - b.x, y: a.y - b.y };
    const cb = { x: c.x - b.x, y: c.y - b.y };
    const dot = ab.x * cb.x + ab.y * cb.y;
    const magAB = Math.hypot(ab.x, ab.y);
    const magCB = Math.hypot(cb.x, cb.y);
    if (!magAB || !magCB) {
      return 0;
    }
    const angle = Math.acos(this.clamp(dot / (magAB * magCB), -1, 1));
    return this.toDegrees(angle);
  }

  private angleToVertical(a: Point, b: Point): number {
    const dy = b.y - a.y;
    const dx = b.x - a.x;
    const angle = Math.atan2(dx, dy); // compare to vertical axis
    return Math.abs(this.toDegrees(angle));
  }

  private angleToHorizontal(a: Point, b: Point): number {
    const dy = b.y - a.y;
    const dx = b.x - a.x;
    const angle = Math.atan2(dy, dx);
    return Math.abs(this.toDegrees(angle));
  }

  private midPoint(a: Point, b: Point): Point {
    return {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      z: ((a.z ?? 0) + (b.z ?? 0)) / 2,
    };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  private toDegrees(rad: number): number {
    return (rad * 180) / Math.PI;
  }

  private maxBy<T>(arr: T[], selector: (item: T) => number): number {
    let maxIndex = 0;
    let maxValue = -Infinity;
    arr.forEach((item, idx) => {
      const val = selector(item);
      if (val > maxValue) {
        maxValue = val;
        maxIndex = idx;
      }
    });
    return maxIndex;
  }

  private minBy<T>(arr: T[], selector: (item: T) => number): number {
    let minIndex = 0;
    let minValue = Infinity;
    arr.forEach((item, idx) => {
      const val = selector(item);
      if (val < minValue) {
        minValue = val;
        minIndex = idx;
      }
    });
    return minIndex;
  }
}
