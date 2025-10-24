import {GameConfig} from "../config.js";

export class Track {
  constructor(scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.borders = [];
    this.borderSegments = [];
    this.startPosition = {x: 100, y: 100, angle: 0};
    this.staticGroup = scene.physics.add.staticGroup();
  }

  async load(trackPath) {
    try {
      const response = await fetch(trackPath);
      const trackData = await response.json();

      this.name = trackData.name;
      this.startPosition = trackData.startPosition;
      this.borders = trackData.borders;

      this.render();
      this.createPhysicsBodies();

      return this.startPosition;
    } catch (error) {
      console.error("Failed to load track:", error);
      return {x: 100, y: 100, angle: 0};
    }
  }

  render() {
    this.graphics.clear();
    this.borderSegments = [];

    // Draw each border
    this.borders.forEach((border) => {
      const points = border.points;
      const borderType = border.type || "outer"; // Default to outer if not specified

      if (points.length < 2) return;

      // Set color based on border type
      let borderColor = GameConfig.track.borderColor;
      if (borderType === "inner") {
        borderColor = GameConfig.track.innerBorderColor || GameConfig.track.borderColor;
      } else if (borderType === "outer") {
        borderColor = GameConfig.track.outerBorderColor || GameConfig.track.borderColor;
      }

      this.graphics.lineStyle(
        GameConfig.track.borderWidth,
        borderColor,
        1
      );

      // Draw lines connecting all points
      for (let i = 0; i < points.length; i++) {
        const start = points[i];
        const end = points[(i + 1) % points.length];

        this.graphics.lineBetween(start[0], start[1], end[0], end[1]);

        // Store line segment for radar calculations
        this.borderSegments.push({
          x1: start[0],
          y1: start[1],
          x2: end[0],
          y2: end[1],
          type: borderType,
        });
      }
    });
  }

  createPhysicsBodies() {
    // Create static physics bodies for each border segment
    this.borderSegments.forEach((segment) => {
      const length = Phaser.Math.Distance.Between(
        segment.x1,
        segment.y1,
        segment.x2,
        segment.y2
      );
      const angle = Phaser.Math.Angle.Between(
        segment.x1,
        segment.y1,
        segment.x2,
        segment.y2
      );
      const centerX = (segment.x1 + segment.x2) / 2;
      const centerY = (segment.y1 + segment.y2) / 2;

      // Create a thin rectangle for the wall
      const wall = this.scene.add.rectangle(
        centerX,
        centerY,
        length,
        GameConfig.track.borderWidth,
        0xffffff,
        0
      );

      this.scene.physics.add.existing(wall, true);
      wall.body.setSize(length, GameConfig.track.borderWidth);
      wall.setRotation(angle);

      this.staticGroup.add(wall);
    });
  }

  getBorderSegments() {
    return this.borderSegments;
  }

  getCollisionGroup() {
    return this.staticGroup;
  }

  getStartPosition() {
    return this.startPosition;
  }
}
