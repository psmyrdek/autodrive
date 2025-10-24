import {GameConfig} from "../config.js";

export class Radar {
  constructor(scene, car, track) {
    this.scene = scene;
    this.car = car;
    this.track = track;
    this.graphics = scene.add.graphics();

    // Timer for radar updates
    this.lastUpdate = 0;
    this.updateInterval = GameConfig.radar.updateInterval * 1000; // Convert to ms

    this.distances = [null, null, null, null];
    this.intersectionPoints = [null, null, null, null];
  }

  update(time) {
    if (time - this.lastUpdate >= this.updateInterval) {
      this.lastUpdate = time;
      this.scan();
    }
  }

  scan() {
    const corners = this.car.getCorners();
    const segments = this.track.getBorderSegments();
    const carAngle = this.car.getAngle();

    this.distances = [];
    this.intersectionPoints = [];

    // Define ray angles for each corner relative to car's forward direction (+X)
    // Index 0: Front-right, 1: Front-left, 2: Back-left, 3: Back-right
    const rayAngles = [
      carAngle + 45,
      carAngle - 45,
      carAngle - 135,
      carAngle + 135,
    ];

    corners.forEach((corner, index) => {
      const rayAngle = Phaser.Math.DegToRad(rayAngles[index]);
      let minDistance = Infinity;
      let closestIntersection = null;

      // Cast ray from corner at the specified angle
      segments.forEach((segment) => {
        const intersection = this.raySegmentIntersection(
          corner,
          rayAngle,
          segment
        );

        if (intersection) {
          const distance = Phaser.Math.Distance.Between(
            corner.x,
            corner.y,
            intersection.x,
            intersection.y
          );

          if (distance < minDistance) {
            minDistance = distance;
            closestIntersection = intersection;
          }
        }
      });

      this.distances[index] = minDistance === Infinity ? null : minDistance;
      this.intersectionPoints[index] = closestIntersection;

      // Log to console
      if (minDistance !== Infinity) {
        console.log(
          `Corner ${index + 1}: ${minDistance.toFixed(
            2
          )} pixels to border at ${rayAngles[index].toFixed(0)}°`
        );
      } else {
        console.log(`Corner ${index + 1}: No intersection found`);
      }
    });

    this.visualize();
  }

  raySegmentIntersection(origin, rayAngle, segment) {
    // Ray from origin in direction of rayAngle
    const rayDirX = Math.cos(rayAngle);
    const rayDirY = Math.sin(rayAngle);

    // Line segment from (x1, y1) to (x2, y2)
    const {x1, y1, x2, y2} = segment;
    const segDirX = x2 - x1;
    const segDirY = y2 - y1;

    // Solve for intersection using parametric equations:
    // Ray: P = origin + t * rayDir (t >= 0)
    // Segment: Q = (x1,y1) + s * segDir (0 <= s <= 1)
    // Set P = Q and solve for t and s

    const cross = rayDirX * segDirY - rayDirY * segDirX;

    // If cross product is near zero, ray and segment are parallel
    if (Math.abs(cross) < 1e-10) {
      return null;
    }

    const toSegmentX = x1 - origin.x;
    const toSegmentY = y1 - origin.y;

    const t = (toSegmentX * segDirY - toSegmentY * segDirX) / cross;
    const s = (toSegmentX * rayDirY - toSegmentY * rayDirX) / cross;

    // Check if intersection is valid: t >= 0 (ray goes forward), 0 <= s <= 1 (on segment)
    if (t >= 0 && s >= 0 && s <= 1) {
      return {
        x: origin.x + t * rayDirX,
        y: origin.y + t * rayDirY,
      };
    }

    return null;
  }

  visualize() {
    this.graphics.clear();

    const corners = this.car.getCorners();
    const carAngle = this.car.getAngle();

    // Ray angles for each corner (same as in scan())
    const rayAngles = [
      carAngle + 45, // Front-right
      carAngle - 45, // Front-left
      carAngle - 135, // Back-left
      carAngle + 135, // Back-right
    ];

    corners.forEach((corner, index) => {
      const rayAngle = Phaser.Math.DegToRad(rayAngles[index]);
      const intersection = this.intersectionPoints[index];

      // Draw the ray direction indicator (short line at corner showing direction)
      const indicatorLength = 15;
      const indicatorEndX = corner.x + Math.cos(rayAngle) * indicatorLength;
      const indicatorEndY = corner.y + Math.sin(rayAngle) * indicatorLength;

      this.graphics.lineStyle(3, 0xffff00, 0.8);
      this.graphics.lineBetween(
        corner.x,
        corner.y,
        indicatorEndX,
        indicatorEndY
      );

      if (intersection) {
        // Draw line from corner to intersection point
        this.graphics.lineStyle(
          GameConfig.radar.rayWidth,
          GameConfig.radar.rayColor,
          GameConfig.radar.rayAlpha
        );
        this.graphics.lineBetween(
          corner.x,
          corner.y,
          intersection.x,
          intersection.y
        );

        // Draw dot at intersection point
        this.graphics.fillStyle(GameConfig.radar.rayColor, 1);
        this.graphics.fillCircle(intersection.x, intersection.y, 4);

        // Optionally display distance text
        if (GameConfig.radar.showDistanceText && this.distances[index]) {
          const text = this.scene.add.text(
            intersection.x + 5,
            intersection.y - 5,
            this.distances[index].toFixed(0),
            {
              fontSize: "12px",
              fill: "#00ff00",
              backgroundColor: "#000000",
              padding: {x: 2, y: 2},
            }
          );

          // Remove text after a short delay
          this.scene.time.delayedCall(this.updateInterval * 0.9, () => {
            text.destroy();
          });
        }
      } else {
        // If no intersection, draw a long ray to show the direction
        const maxRayLength = 2000;
        const rayEndX = corner.x + Math.cos(rayAngle) * maxRayLength;
        const rayEndY = corner.y + Math.sin(rayAngle) * maxRayLength;

        this.graphics.lineStyle(GameConfig.radar.rayWidth, 0xff0000, 0.3);
        this.graphics.lineBetween(corner.x, corner.y, rayEndX, rayEndY);
      }
    });
  }
}
