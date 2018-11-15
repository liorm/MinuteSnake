export class Vector {
    x: number;
    y: number;

    constructor(v: Vector);
    constructor(x: number, y: number);
    constructor(vx, y?) {
        // VECTOR SYNTAX
        if (arguments.length === 1) {
            this.x = vx.x;
            this.y = vx.y;
        } else {
            this.x = vx || 0;
            this.y = y || 0;
        }
    }

    equals(v: Vector | null | undefined);
    equals(x: number, y: number);
    equals(vx, y?) {
        if (vx === undefined || vx === null)
            return false;

        // VECTOR SYNTAX
        if (arguments.length === 1) {
            return this.x === vx.x && this.y === vx.y;
        } else {
            return this.x === vx && this.y === y;
        }
    }

    clone() {
        return new Vector(this);
    }

    add(v: Vector);
    add(x: number, y: number);
    add(vx, y?) {
        // VECTOR SYNTAX
        if (arguments.length === 1) {
            return new Vector(this.x + vx.x, this.y + vx.y);
        } else {
            return new Vector(this.x + vx, this.y + y);
        }
    }

    sub(v: Vector);
    sub(x: number, y: number);
    sub(vx, y?) {
        // VECTOR SYNTAX
        if (arguments.length === 1) {
            return this.add(-vx.x, -vx.y);
        } else {
            return this.add(-vx, -y);
        }
    }

    mul(scalar: number) {
        return new Vector(this.x * scalar, this.y * scalar);
    }

    invert() {
        return this.mul(-1);
    }
}

