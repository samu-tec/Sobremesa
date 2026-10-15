export class RoomCreationLimiter {
  private readonly attemptsByIp = new Map<string, number[]>();
  private readonly createdGlobally: number[] = [];
  private lastCleanup = 0;

  constructor(
    private readonly perIpLimit: number,
    private readonly globalLimit: number,
    private readonly windowMs: number,
    private readonly maxTrackedIps = 10000,
  ) {}

  allowAttempt(ip: string, now = Date.now()) {
    this.cleanup(now);
    const existing = this.attemptsByIp.get(ip);
    if (!existing && this.attemptsByIp.size >= this.maxTrackedIps) return false;
    const recent = this.recent(existing ?? [], now);
    if (recent.length >= this.perIpLimit) {
      this.attemptsByIp.set(ip, recent);
      return false;
    }
    recent.push(now);
    this.attemptsByIp.set(ip, recent);
    return true;
  }

  canCreateGlobally(now = Date.now()) {
    this.cleanup(now);
    return this.recent(this.createdGlobally, now).length < this.globalLimit;
  }

  recordCreated(now = Date.now()) {
    this.createdGlobally.push(now);
  }

  sweep(now = Date.now()) {
    this.cleanup(now);
  }

  private cleanup(now: number) {
    if (now - this.lastCleanup < this.windowMs) return;
    this.lastCleanup = now;
    for (const [ip, attempts] of this.attemptsByIp) {
      const recent = this.recent(attempts, now);
      if (!recent.length) this.attemptsByIp.delete(ip);
      else this.attemptsByIp.set(ip, recent);
    }
    this.createdGlobally.splice(
      0,
      this.createdGlobally.length,
      ...this.recent(this.createdGlobally, now),
    );
  }

  private recent(entries: number[], now: number) {
    const cutoff = now - this.windowMs;
    return entries.filter((timestamp) => timestamp > cutoff);
  }
}
