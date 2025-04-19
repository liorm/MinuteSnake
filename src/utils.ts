export class Vector {
  x: number;
  y: number;

  constructor(v: Vector);
  constructor(x: number, y: number);
  constructor(vx: Vector | number, y?: number) {
    if (vx instanceof Vector) {
      this.x = vx.x;
      this.y = vx.y;
    } else {
      this.x = vx || 0;
      this.y = y || 0;
    }
  }

  equals(v: Vector | null | undefined): boolean;
  equals(x: number, y: number): boolean;
  equals(vx: Vector | number | null | undefined, y?: number): boolean {
    if (vx === undefined || vx === null) {
      return false;
    }

    if (vx instanceof Vector) {
      return this.x === vx.x && this.y === vx.y;
    } else {
      return this.x === vx && this.y === y;
    }
  }

  clone(): Vector {
    return new Vector(this);
  }

  add(v: Vector): Vector;
  add(x: number, y: number): Vector;
  add(vx: Vector | number, y?: number): Vector {
    if (vx instanceof Vector) {
      return new Vector(this.x + vx.x, this.y + vx.y);
    } else {
      return new Vector(this.x + vx, this.y + (y || 0));
    }
  }

  sub(v: Vector): Vector;
  sub(x: number, y: number): Vector;
  sub(vx: Vector | number, y?: number): Vector {
    if (vx instanceof Vector) {
      return this.add(new Vector(-vx.x, -vx.y));
    } else {
      return this.add(-vx, -(y || 0));
    }
  }

  mul(scalar: number): Vector {
    return new Vector(this.x * scalar, this.y * scalar);
  }

  invert(): Vector {
    return this.mul(-1);
  }
}
