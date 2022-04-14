export class SimProfiler extends Map {
  constructor(logger) {
    super();
    this.logger = logger || console.log;
  }
  start(name) {
    if (this.has(name)) this.stop(name);
    this.set(name, new Date());
  }
  stop(name) {
    if (!this.has(name)) return;
    const duration = (new Date()) - this.get(name);
    if (this.logger !== null) {
      this.logger(`LOG: ${name} took ${duration}ms`);
    }
    this.delete(name);
    return duration;
  }
}