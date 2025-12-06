export type SwingStage =
  | 'address'
  | 'backswing'
  | 'top'
  | 'downswing'
  | 'impact'
  | 'followThrough';

export interface PoseKeypoint {
  name: string;
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface PoseMetrics {
  spineTilt: number;
  shoulderRotation: number;
  hipRotation: number;
  leftElbowAngle: number;
  rightElbowAngle: number;
  leftWristAngle: number;
  rightWristAngle: number;
  kneeFlexion: number;
  handHeight: number;
}

export interface FramePoseData {
  timestamp: number;
  landmarks: PoseKeypoint[];
  metrics: PoseMetrics;
  stage?: SwingStage;
}

export interface SwingPhase {
  name: SwingStage;
  timestamp: number;
  description: string;
  metrics: PoseMetrics;
}

export interface SwingAnalysis {
  phases: SwingPhase[];
  summary: string[];
  frameCount: number;
  duration: number;
}

export interface FrameSample {
  timestamp: number;
  canvas: HTMLCanvasElement;
}
