/**
 * A 2D vector class providing essential operations for game position calculations.
 * Used throughout the game for snake positions, apple placement, and collision detection.
 * Supports vector arithmetic, comparison, and transformation operations.
 *
 * Example:
 * ```typescript
 * const pos = new Vector(10, 20);
 * const newPos = pos.add(new Vector(5, 0)); // Move right by 5
 * ```
 */
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

  /**
   * Checks if this vector equals another vector or coordinate pair.
   * Used for collision detection and position comparison.
   */
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

  /**
   * Creates a new Vector with the same coordinates.
   * Useful when you need a copy that won't be modified by reference.
   */
  clone(): Vector {
    return new Vector(this);
  }

  /**
   * Adds another vector or coordinate pair to this vector.
   * Returns a new Vector without modifying the original.
   * Used for calculating new positions and offsets.
   */
  add(v: Vector): Vector;
  add(x: number, y: number): Vector;
  add(vx: Vector | number, y?: number): Vector {
    if (vx instanceof Vector) {
      return new Vector(this.x + vx.x, this.y + vx.y);
    } else {
      return new Vector(this.x + vx, this.y + (y || 0));
    }
  }

  /**
   * Subtracts another vector or coordinate pair from this vector.
   * Returns a new Vector without modifying the original.
   * Used for calculating distances and relative positions.
   */
  sub(v: Vector): Vector;
  sub(x: number, y: number): Vector;
  sub(vx: Vector | number, y?: number): Vector {
    if (vx instanceof Vector) {
      return this.add(new Vector(-vx.x, -vx.y));
    } else {
      return this.add(-vx, -(y || 0));
    }
  }

  /**
   * Multiplies the vector by a scalar value.
   * Used for scaling positions and directions.
   */
  mul(scalar: number): Vector {
    return new Vector(this.x * scalar, this.y * scalar);
  }

  /**
   * Returns a new Vector with negated coordinates.
   * Shorthand for multiplying by -1.
   */
  invert(): Vector {
    return this.mul(-1);
  }
}
