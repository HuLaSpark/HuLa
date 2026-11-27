/** Browser replacement of @tauri-apps/api/dpi */
export class LogicalSize {
  readonly type = 'Logical'
  constructor(
    public width: number,
    public height: number
  ) {}
  toPhysical(scaleFactor: number) {
    return new PhysicalSize(this.width * scaleFactor, this.height * scaleFactor)
  }
}

export class PhysicalSize {
  readonly type = 'Physical'
  constructor(
    public width: number,
    public height: number
  ) {}
  toLogical(scaleFactor: number) {
    return new LogicalSize(this.width / scaleFactor, this.height / scaleFactor)
  }
}

export class LogicalPosition {
  readonly type = 'Logical'
  constructor(
    public x: number,
    public y: number
  ) {}
  toPhysical(scaleFactor: number) {
    return new PhysicalPosition(this.x * scaleFactor, this.y * scaleFactor)
  }
}

export class PhysicalPosition {
  readonly type = 'Physical'
  constructor(
    public x: number,
    public y: number
  ) {}
  toLogical(scaleFactor: number) {
    return new LogicalPosition(this.x / scaleFactor, this.y / scaleFactor)
  }
}

export class Size {
  constructor(public size: LogicalSize | PhysicalSize) {}
}

export class Position {
  constructor(public position: LogicalPosition | PhysicalPosition) {}
}
