import Phaser from 'phaser';
import type { Track } from '../types/track';

export default class GameScene extends Phaser.Scene {
  private track: Track | null = null;
  private graphics: Phaser.GameObjects.Graphics | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  setTrack(track: Track) {
    this.track = track;
  }

  create() {
    this.graphics = this.add.graphics();
    this.renderTrack();
  }

  private renderTrack() {
    if (!this.graphics || !this.track) return;

    this.graphics.clear();

    // Draw outer border in blue
    this.graphics.lineStyle(4, 0x4169e1, 1);
    if (this.track.outerBorder.length > 1) {
      this.drawPath(this.track.outerBorder);
    }

    // Draw inner border in red
    this.graphics.lineStyle(4, 0xdc143c, 1);
    if (this.track.innerBorder.length > 1) {
      this.drawPath(this.track.innerBorder);
    }

    // Draw start point as a green circle
    if (this.track.startPoint) {
      this.graphics.fillStyle(0x32cd32, 1);
      this.graphics.fillCircle(
        this.track.startPoint.x,
        this.track.startPoint.y,
        10
      );
    }
  }

  private drawPath(points: { x: number; y: number }[]) {
    if (!this.graphics || points.length < 2) return;

    this.graphics.beginPath();
    this.graphics.moveTo(points[0].x, points[0].y);

    // Draw lines between all dense points - they're already interpolated
    for (let i = 1; i < points.length; i++) {
      this.graphics.lineTo(points[i].x, points[i].y);
    }

    // Close the path back to the first point
    this.graphics.closePath();
    this.graphics.strokePath();
  }

  updateTrack(track: Track) {
    this.track = track;
    this.renderTrack();
  }
}
