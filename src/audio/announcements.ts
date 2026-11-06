// Reserve before asynchronous decoding so late fetches cannot interrupt newer calls.
export class AnnouncementGate {
  private until = 0;
  private priority = 0;
  private serial = 0;
  private last = new Map<string, number>();
  reserve(id: string, now: number) {
    const priority = /knockout|you-win|you-lose|congratulations|champion/.test(
      id,
    )
      ? 3
      : /round|fight|boss|battle/.test(id)
        ? 2
        : 1;
    if (
      now - (this.last.get(id) ?? -Infinity) < 2200 ||
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
}
