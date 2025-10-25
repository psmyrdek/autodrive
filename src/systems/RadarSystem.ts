import Phaser from "phaser";
import type {Track} from "../types/track";
import type {CarBody} from "./CarPhysics";

export interface RadarDistances {
  left: number;
  center: number;
  right: number;
}

export class RadarSystem {
  private readonly RADAR_MAX_DISTANCE = 1500;
  private readonly ANGLE_OFFSET = (20 * Math.PI) / 180; // 20 degrees in radians

  private radarGraphics: Phaser.GameObjects.Graphics;
  private radarTexts: {
    left: Phaser.GameObjects.Text;
    center: Phaser.GameObjects.Text;
    right: Phaser.GameObjects.Text;
  };

  public distances: RadarDistances = {left: 0, center: 0, right: 0};
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.radarGraphics = this.scene.add.graphics();
    this.radarTexts = this.createRadarDisplay();
  }

  private createRadarDisplay() {
    const textStyle = {
      fontSize: "20px",
      color: "#00ff00",
      fontFamily: "Arial",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 3,
    };

    return {
      left: this.scene.add.text(20, 500, "L: 0", textStyle),
      center: this.scene.add.text(20, 530, "C: 0", textStyle),
      right: this.scene.add.text(20, 560, "R: 0", textStyle),
    };
  }

  update(carBody: CarBody, track: Track) {
    this.radarGraphics.clear();

    const hw = carBody.width / 2;
    const hh = carBody.height / 2;
    const rotation = carBody.rotation;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    // Calculate the three sensor positions (front of car)
    const leftSensorX = carBody.x + (hw * cos - hh * sin);
    const leftSensorY = carBody.y + (hw * sin + hh * cos);

    const centerSensorX = carBody.x + hw * cos;
    const centerSensorY = carBody.y + hw * sin;

    const rightSensorX = carBody.x + (hw * cos + hh * sin);
    const rightSensorY = carBody.y + (hw * sin - hh * cos);

    // Ray directions with 20-degree angles for corners
    const leftAngle = rotation + this.ANGLE_OFFSET;
    const leftDirX = Math.cos(leftAngle);
    const leftDirY = Math.sin(leftAngle);

    const centerDirX = cos;
    const centerDirY = sin;

    const rightAngle = rotation - this.ANGLE_OFFSET;
    const rightDirX = Math.cos(rightAngle);
    const rightDirY = Math.sin(rightAngle);

    // Cast rays from each sensor
    const leftHit = this.castRay(
      leftSensorX,
      leftSensorY,
      leftDirX,
      leftDirY,
      track
    );
    const centerHit = this.castRay(
      centerSensorX,
      centerSensorY,
      centerDirX,
      centerDirY,
      track
    );
    const rightHit = this.castRay(
      rightSensorX,
      rightSensorY,
      rightDirX,
      rightDirY,
      track
    );

    // Update distances
    this.distances.left = leftHit ? leftHit.distance : this.RADAR_MAX_DISTANCE;
    this.distances.center = centerHit
      ? centerHit.distance
      : this.RADAR_MAX_DISTANCE;
    this.distances.right = rightHit
      ? rightHit.distance
      : this.RADAR_MAX_DISTANCE;

    // Draw radar beams
    this.radarGraphics.lineStyle(2, 0x00ff00, 0.6);

    if (leftHit) {
      this.radarGraphics.lineBetween(
        leftSensorX,
        leftSensorY,
        leftHit.x,
        leftHit.y
      );
    }
    if (centerHit) {
      this.radarGraphics.lineBetween(
        centerSensorX,
        centerSensorY,
        centerHit.x,
        centerHit.y
      );
    }
    if (rightHit) {
      this.radarGraphics.lineBetween(
        rightSensorX,
        rightSensorY,
        rightHit.x,
        rightHit.y
      );
    }

    // Update distance text displays
    this.radarTexts.left.setText(`L: ${Math.round(this.distances.left)}`);
    this.radarTexts.center.setText(`C: ${Math.round(this.distances.center)}`);
    this.radarTexts.right.setText(`R: ${Math.round(this.distances.right)}`);
  }

  private castRay(
    originX: number,
    originY: number,
    dirX: number,
    dirY: number,
    track: Track
  ): {x: number; y: number; distance: number} | null {
    const rayEndX = originX + dirX * this.RADAR_MAX_DISTANCE;
    const rayEndY = originY + dirY * this.RADAR_MAX_DISTANCE;

    let closestIntersection: {x: number; y: number} | null = null;
    let closestDistance = Infinity;

    // Check against outer border segments
    for (let i = 0; i < track.outerBorder.length; i++) {
      const p1 = track.outerBorder[i];
      const p2 = track.outerBorder[(i + 1) % track.outerBorder.length];

      const intersection = this.lineIntersection(
        originX,
        originY,
        rayEndX,
        rayEndY,
        p1.x,
        p1.y,
        p2.x,
        p2.y
      );

      if (intersection) {
        const distance = Math.sqrt(
          (intersection.x - originX) ** 2 + (intersection.y - originY) ** 2
        );
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIntersection = intersection;
        }
      }
    }

    // Check against inner border segments
    for (let i = 0; i < track.innerBorder.length; i++) {
      const p1 = track.innerBorder[i];
      const p2 = track.innerBorder[(i + 1) % track.innerBorder.length];

      const intersection = this.lineIntersection(
        originX,
        originY,
        rayEndX,
        rayEndY,
        p1.x,
        p1.y,
        p2.x,
        p2.y
      );

      if (intersection) {
        const distance = Math.sqrt(
          (intersection.x - originX) ** 2 + (intersection.y - originY) ** 2
        );
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIntersection = intersection;
        }
      }
    }

    // Check against obstacles
    if (track.obstacles) {
      for (const obstacle of track.obstacles) {
        const intersection = this.lineIntersection(
          originX,
          originY,
          rayEndX,
          rayEndY,
          obstacle.start.x,
          obstacle.start.y,
          obstacle.end.x,
          obstacle.end.y
        );

        if (intersection) {
          const distance = Math.sqrt(
            (intersection.x - originX) ** 2 + (intersection.y - originY) ** 2
          );
          if (distance < closestDistance) {
            closestDistance = distance;
            closestIntersection = intersection;
          }
        }
      }
    }

    if (closestIntersection) {
      return {
        x: closestIntersection.x,
        y: closestIntersection.y,
        distance: closestDistance,
      };
    }

    return null;
  }

  private lineIntersection(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    x4: number,
    y4: number
  ): {x: number; y: number} | null {
    const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

    if (Math.abs(denominator) < 0.0001) {
      return null; // Lines are parallel
    }

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;

    // Check if intersection is within both line segments
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        x: x1 + t * (x2 - x1),
        y: y1 + t * (y2 - y1),
      };
    }

    return null;
  }
}
