export function announcementPriority(id: string) {
  if (
    /^(knockout|perfect|you-win|you-lose|final-round|boss-battle|final-battle|final-boss|rob|santa|new-challenger|christmas-arcade-champion|congratulations)$/.test(
      id,
    )
  )
    return 5;
  if (
    /^(fight|super|super-ready|special-attack)$/.test(id) ||
    /slam|rampage|blizzard|fury|delivery|father-special/.test(id)
  )
    return 3;
  if (
    /round|choose|christmas-arcade-fighters|jamie|nash|bucket|beardy|frost/.test(
      id,
    )
  )
    return 2;
  return 1;
}
export function announcementCooldown(id: string) {
  return /combo|counter|special-attack|super-ready/.test(id) ? 6000 : 2200;
}
// Reserve before fetching/decoding: old asynchronous work must never revive a callout.
export class AnnouncementGate {
  private until = 0;
  private priority = 0;
  private serial = 0;
  private last = new Map<string, number>();
  reserve(id: string, now: number) {
    const priority = announcementPriority(id);
    if (
      now - (this.last.get(id) ?? -Infinity) < announcementCooldown(id) ||
      (now < this.until && priority <= this.priority)
    )
      return null;
    this.last.set(id, now);
    this.until = now + 1600;
    this.priority = priority;
    return ++this.serial;
  }
  current(ticket: number) {
    return ticket === this.serial;
  }
  started(ticket: number, now: number, duration: number) {
    if (this.current(ticket)) this.until = now + duration * 1000 + 80;
  }
  release(ticket: number) {
    if (this.current(ticket)) {
      this.until = 0;
      this.priority = 0;
    }
  }
  cancel() {
    this.serial++;
    this.until = 0;
    this.priority = 0;
  }
}
