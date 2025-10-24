import Phaser from "phaser";

export class TimerDisplay {
  private timerText: Phaser.GameObjects.Text;
  private startTime: number = 0;
  private elapsedTime: number = 0;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.timerText = this.createTimerDisplay();
  }

  private createTimerDisplay(): Phaser.GameObjects.Text {
    const text = this.scene.add.text(1200, 20, "Time: 0:00.0", {
      fontSize: "28px",
      color: "#ffffff",
      fontFamily: "Arial",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 4,
    });
    text.setOrigin(1, 0); // Right-aligned
    return text;
  }

  start() {
    this.startTime = Date.now();
    this.elapsedTime = 0;
  }

  update(isRunning: boolean) {
    if (isRunning && this.startTime > 0) {
      this.elapsedTime = Date.now() - this.startTime;
      this.timerText.setText(this.formatTime(this.elapsedTime));
    }
  }

  private formatTime(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const deciseconds = Math.floor((milliseconds % 1000) / 100);

    return `Time: ${minutes}:${seconds
      .toString()
      .padStart(2, "0")}.${deciseconds}`;
  }

  getElapsedTime(): number {
    return this.elapsedTime;
  }
}
