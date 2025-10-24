import {Car} from "../entities/Car.js";
import {Track} from "../entities/Track.js";
import {Radar} from "../utils/Radar.js";

export class GameScene extends Phaser.Scene {
  constructor() {
    super({key: "GameScene"});
    this.trackPath = null;
  }

  init(data) {
    // Accept track path from scene data
    this.trackPath = data.trackPath || "game/tracks/track1.json";
  }

  create() {
    // Create track
    this.track = new Track(this);

    // Load track and create car at starting position
    this.track.load(this.trackPath).then((startPos) => {
      // Create car at track starting position
      this.car = new Car(this, startPos.x, startPos.y, startPos.angle);

      // Setup collision detection between car and track borders
      this.physics.add.collider(
        this.car.getPhysicsBody(),
        this.track.getCollisionGroup()
      );

      // Create radar system
      this.radar = new Radar(this, this.car, this.track);

      // Setup camera to follow car
      this.cameras.main.startFollow(this.car.getPhysicsBody(), true, 0.1, 0.1);
    });
  }

  update(time, delta) {
    // Update car if it exists
    if (this.car) {
      this.car.update(delta);
    }

    // Update radar if it exists
    if (this.radar) {
      this.radar.update(time);
    }
  }
}
