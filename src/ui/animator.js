/**
 * Drives a step generator with requestAnimationFrame. `speed` (1..100) controls
 * how many steps are consumed per frame (with an optional delay at low speeds).
 */
export class Animator {
  constructor({ onStep, onDone }) {
    this.onStep = onStep;
    this.onDone = onDone;
    this.gen = null;
    this.raf = null;
    this.speed = 50;
    this.running = false;
    this.lastTime = 0;
  }

  setSpeed(speed) {
    this.speed = Math.max(1, Math.min(100, Number(speed)));
  }

  /** Steps per frame and frame delay for the current speed. */
  #rate() {
    const s = this.speed;
    if (s >= 90) return { perFrame: 60, delay: 0 };
    if (s >= 70) return { perFrame: 12, delay: 0 };
    if (s >= 50) return { perFrame: 4, delay: 0 };
    if (s >= 30) return { perFrame: 1, delay: 0 };
    if (s >= 15) return { perFrame: 1, delay: 40 };
    return { perFrame: 1, delay: 120 };
  }

  play(generator) {
    this.stop();
    this.gen = generator;
    this.running = true;
    this.lastTime = 0;
    const tick = (now) => {
      if (!this.running) return;
      const { perFrame, delay } = this.#rate();
      if (delay && now - this.lastTime < delay) {
        this.raf = requestAnimationFrame(tick);
        return;
      }
      this.lastTime = now;
      for (let i = 0; i < perFrame; i++) {
        const { value, done } = this.gen.next();
        if (done) {
          this.running = false;
          this.gen = null;
          this.onDone(value);
          return;
        }
        this.onStep(value);
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  /** Drain a generator synchronously (no animation). Returns its return value. */
  static runToEnd(generator, onStep) {
    for (;;) {
      const { value, done } = generator.next();
      if (done) return value;
      if (onStep) onStep(value);
    }
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.gen = null;
  }
}
