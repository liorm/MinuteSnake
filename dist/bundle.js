var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// node_modules/seedrandom/lib/alea.js
var require_alea = __commonJS({
  "node_modules/seedrandom/lib/alea.js"(exports, module) {
    (function(global, module2, define2) {
      function Alea(seed) {
        var me = this, mash = Mash();
        me.next = function() {
          var t = 2091639 * me.s0 + me.c * 23283064365386963e-26;
          me.s0 = me.s1;
          me.s1 = me.s2;
          return me.s2 = t - (me.c = t | 0);
        };
        me.c = 1;
        me.s0 = mash(" ");
        me.s1 = mash(" ");
        me.s2 = mash(" ");
        me.s0 -= mash(seed);
        if (me.s0 < 0) {
          me.s0 += 1;
        }
        me.s1 -= mash(seed);
        if (me.s1 < 0) {
          me.s1 += 1;
        }
        me.s2 -= mash(seed);
        if (me.s2 < 0) {
          me.s2 += 1;
        }
        mash = null;
      }
      function copy(f, t) {
        t.c = f.c;
        t.s0 = f.s0;
        t.s1 = f.s1;
        t.s2 = f.s2;
        return t;
      }
      function impl(seed, opts) {
        var xg = new Alea(seed), state = opts && opts.state, prng = xg.next;
        prng.int32 = function() {
          return xg.next() * 4294967296 | 0;
        };
        prng.double = function() {
          return prng() + (prng() * 2097152 | 0) * 11102230246251565e-32;
        };
        prng.quick = prng;
        if (state) {
          if (typeof state == "object")
            copy(state, xg);
          prng.state = function() {
            return copy(xg, {});
          };
        }
        return prng;
      }
      function Mash() {
        var n = 4022871197;
        var mash = function(data) {
          data = String(data);
          for (var i = 0; i < data.length; i++) {
            n += data.charCodeAt(i);
            var h = 0.02519603282416938 * n;
            n = h >>> 0;
            h -= n;
            h *= n;
            n = h >>> 0;
            h -= n;
            n += h * 4294967296;
          }
          return (n >>> 0) * 23283064365386963e-26;
        };
        return mash;
      }
      if (module2 && module2.exports) {
        module2.exports = impl;
      } else if (define2 && define2.amd) {
        define2(function() {
          return impl;
        });
      } else {
        this.alea = impl;
      }
    })(
      exports,
      typeof module == "object" && module,
      // present in node.js
      typeof define == "function" && define
      // present with an AMD loader
    );
  }
});

// node_modules/seedrandom/lib/xor128.js
var require_xor128 = __commonJS({
  "node_modules/seedrandom/lib/xor128.js"(exports, module) {
    (function(global, module2, define2) {
      function XorGen(seed) {
        var me = this, strseed = "";
        me.x = 0;
        me.y = 0;
        me.z = 0;
        me.w = 0;
        me.next = function() {
          var t = me.x ^ me.x << 11;
          me.x = me.y;
          me.y = me.z;
          me.z = me.w;
          return me.w ^= me.w >>> 19 ^ t ^ t >>> 8;
        };
        if (seed === (seed | 0)) {
          me.x = seed;
        } else {
          strseed += seed;
        }
        for (var k = 0; k < strseed.length + 64; k++) {
          me.x ^= strseed.charCodeAt(k) | 0;
          me.next();
        }
      }
      function copy(f, t) {
        t.x = f.x;
        t.y = f.y;
        t.z = f.z;
        t.w = f.w;
        return t;
      }
      function impl(seed, opts) {
        var xg = new XorGen(seed), state = opts && opts.state, prng = function() {
          return (xg.next() >>> 0) / 4294967296;
        };
        prng.double = function() {
          do {
            var top = xg.next() >>> 11, bot = (xg.next() >>> 0) / 4294967296, result = (top + bot) / (1 << 21);
          } while (result === 0);
          return result;
        };
        prng.int32 = xg.next;
        prng.quick = prng;
        if (state) {
          if (typeof state == "object")
            copy(state, xg);
          prng.state = function() {
            return copy(xg, {});
          };
        }
        return prng;
      }
      if (module2 && module2.exports) {
        module2.exports = impl;
      } else if (define2 && define2.amd) {
        define2(function() {
          return impl;
        });
      } else {
        this.xor128 = impl;
      }
    })(
      exports,
      typeof module == "object" && module,
      // present in node.js
      typeof define == "function" && define
      // present with an AMD loader
    );
  }
});

// node_modules/seedrandom/lib/xorwow.js
var require_xorwow = __commonJS({
  "node_modules/seedrandom/lib/xorwow.js"(exports, module) {
    (function(global, module2, define2) {
      function XorGen(seed) {
        var me = this, strseed = "";
        me.next = function() {
          var t = me.x ^ me.x >>> 2;
          me.x = me.y;
          me.y = me.z;
          me.z = me.w;
          me.w = me.v;
          return (me.d = me.d + 362437 | 0) + (me.v = me.v ^ me.v << 4 ^ (t ^ t << 1)) | 0;
        };
        me.x = 0;
        me.y = 0;
        me.z = 0;
        me.w = 0;
        me.v = 0;
        if (seed === (seed | 0)) {
          me.x = seed;
        } else {
          strseed += seed;
        }
        for (var k = 0; k < strseed.length + 64; k++) {
          me.x ^= strseed.charCodeAt(k) | 0;
          if (k == strseed.length) {
            me.d = me.x << 10 ^ me.x >>> 4;
          }
          me.next();
        }
      }
      function copy(f, t) {
        t.x = f.x;
        t.y = f.y;
        t.z = f.z;
        t.w = f.w;
        t.v = f.v;
        t.d = f.d;
        return t;
      }
      function impl(seed, opts) {
        var xg = new XorGen(seed), state = opts && opts.state, prng = function() {
          return (xg.next() >>> 0) / 4294967296;
        };
        prng.double = function() {
          do {
            var top = xg.next() >>> 11, bot = (xg.next() >>> 0) / 4294967296, result = (top + bot) / (1 << 21);
          } while (result === 0);
          return result;
        };
        prng.int32 = xg.next;
        prng.quick = prng;
        if (state) {
          if (typeof state == "object")
            copy(state, xg);
          prng.state = function() {
            return copy(xg, {});
          };
        }
        return prng;
      }
      if (module2 && module2.exports) {
        module2.exports = impl;
      } else if (define2 && define2.amd) {
        define2(function() {
          return impl;
        });
      } else {
        this.xorwow = impl;
      }
    })(
      exports,
      typeof module == "object" && module,
      // present in node.js
      typeof define == "function" && define
      // present with an AMD loader
    );
  }
});

// node_modules/seedrandom/lib/xorshift7.js
var require_xorshift7 = __commonJS({
  "node_modules/seedrandom/lib/xorshift7.js"(exports, module) {
    (function(global, module2, define2) {
      function XorGen(seed) {
        var me = this;
        me.next = function() {
          var X = me.x, i = me.i, t, v, w;
          t = X[i];
          t ^= t >>> 7;
          v = t ^ t << 24;
          t = X[i + 1 & 7];
          v ^= t ^ t >>> 10;
          t = X[i + 3 & 7];
          v ^= t ^ t >>> 3;
          t = X[i + 4 & 7];
          v ^= t ^ t << 7;
          t = X[i + 7 & 7];
          t = t ^ t << 13;
          v ^= t ^ t << 9;
          X[i] = v;
          me.i = i + 1 & 7;
          return v;
        };
        function init(me2, seed2) {
          var j, w, X = [];
          if (seed2 === (seed2 | 0)) {
            w = X[0] = seed2;
          } else {
            seed2 = "" + seed2;
            for (j = 0; j < seed2.length; ++j) {
              X[j & 7] = X[j & 7] << 15 ^ seed2.charCodeAt(j) + X[j + 1 & 7] << 13;
            }
          }
          while (X.length < 8)
            X.push(0);
          for (j = 0; j < 8 && X[j] === 0; ++j)
            ;
          if (j == 8)
            w = X[7] = -1;
          else
            w = X[j];
          me2.x = X;
          me2.i = 0;
          for (j = 256; j > 0; --j) {
            me2.next();
          }
        }
        init(me, seed);
      }
      function copy(f, t) {
        t.x = f.x.slice();
        t.i = f.i;
        return t;
      }
      function impl(seed, opts) {
        if (seed == null)
          seed = +/* @__PURE__ */ new Date();
        var xg = new XorGen(seed), state = opts && opts.state, prng = function() {
          return (xg.next() >>> 0) / 4294967296;
        };
        prng.double = function() {
          do {
            var top = xg.next() >>> 11, bot = (xg.next() >>> 0) / 4294967296, result = (top + bot) / (1 << 21);
          } while (result === 0);
          return result;
        };
        prng.int32 = xg.next;
        prng.quick = prng;
        if (state) {
          if (state.x)
            copy(state, xg);
          prng.state = function() {
            return copy(xg, {});
          };
        }
        return prng;
      }
      if (module2 && module2.exports) {
        module2.exports = impl;
      } else if (define2 && define2.amd) {
        define2(function() {
          return impl;
        });
      } else {
        this.xorshift7 = impl;
      }
    })(
      exports,
      typeof module == "object" && module,
      // present in node.js
      typeof define == "function" && define
      // present with an AMD loader
    );
  }
});

// node_modules/seedrandom/lib/xor4096.js
var require_xor4096 = __commonJS({
  "node_modules/seedrandom/lib/xor4096.js"(exports, module) {
    (function(global, module2, define2) {
      function XorGen(seed) {
        var me = this;
        me.next = function() {
          var w = me.w, X = me.X, i = me.i, t, v;
          me.w = w = w + 1640531527 | 0;
          v = X[i + 34 & 127];
          t = X[i = i + 1 & 127];
          v ^= v << 13;
          t ^= t << 17;
          v ^= v >>> 15;
          t ^= t >>> 12;
          v = X[i] = v ^ t;
          me.i = i;
          return v + (w ^ w >>> 16) | 0;
        };
        function init(me2, seed2) {
          var t, v, i, j, w, X = [], limit = 128;
          if (seed2 === (seed2 | 0)) {
            v = seed2;
            seed2 = null;
          } else {
            seed2 = seed2 + "\0";
            v = 0;
            limit = Math.max(limit, seed2.length);
          }
          for (i = 0, j = -32; j < limit; ++j) {
            if (seed2)
              v ^= seed2.charCodeAt((j + 32) % seed2.length);
            if (j === 0)
              w = v;
            v ^= v << 10;
            v ^= v >>> 15;
            v ^= v << 4;
            v ^= v >>> 13;
            if (j >= 0) {
              w = w + 1640531527 | 0;
              t = X[j & 127] ^= v + w;
              i = 0 == t ? i + 1 : 0;
            }
          }
          if (i >= 128) {
            X[(seed2 && seed2.length || 0) & 127] = -1;
          }
          i = 127;
          for (j = 4 * 128; j > 0; --j) {
            v = X[i + 34 & 127];
            t = X[i = i + 1 & 127];
            v ^= v << 13;
            t ^= t << 17;
            v ^= v >>> 15;
            t ^= t >>> 12;
            X[i] = v ^ t;
          }
          me2.w = w;
          me2.X = X;
          me2.i = i;
        }
        init(me, seed);
      }
      function copy(f, t) {
        t.i = f.i;
        t.w = f.w;
        t.X = f.X.slice();
        return t;
      }
      ;
      function impl(seed, opts) {
        if (seed == null)
          seed = +/* @__PURE__ */ new Date();
        var xg = new XorGen(seed), state = opts && opts.state, prng = function() {
          return (xg.next() >>> 0) / 4294967296;
        };
        prng.double = function() {
          do {
            var top = xg.next() >>> 11, bot = (xg.next() >>> 0) / 4294967296, result = (top + bot) / (1 << 21);
          } while (result === 0);
          return result;
        };
        prng.int32 = xg.next;
        prng.quick = prng;
        if (state) {
          if (state.X)
            copy(state, xg);
          prng.state = function() {
            return copy(xg, {});
          };
        }
        return prng;
      }
      if (module2 && module2.exports) {
        module2.exports = impl;
      } else if (define2 && define2.amd) {
        define2(function() {
          return impl;
        });
      } else {
        this.xor4096 = impl;
      }
    })(
      exports,
      // window object or global
      typeof module == "object" && module,
      // present in node.js
      typeof define == "function" && define
      // present with an AMD loader
    );
  }
});

// node_modules/seedrandom/lib/tychei.js
var require_tychei = __commonJS({
  "node_modules/seedrandom/lib/tychei.js"(exports, module) {
    (function(global, module2, define2) {
      function XorGen(seed) {
        var me = this, strseed = "";
        me.next = function() {
          var b = me.b, c = me.c, d = me.d, a = me.a;
          b = b << 25 ^ b >>> 7 ^ c;
          c = c - d | 0;
          d = d << 24 ^ d >>> 8 ^ a;
          a = a - b | 0;
          me.b = b = b << 20 ^ b >>> 12 ^ c;
          me.c = c = c - d | 0;
          me.d = d << 16 ^ c >>> 16 ^ a;
          return me.a = a - b | 0;
        };
        me.a = 0;
        me.b = 0;
        me.c = 2654435769 | 0;
        me.d = 1367130551;
        if (seed === Math.floor(seed)) {
          me.a = seed / 4294967296 | 0;
          me.b = seed | 0;
        } else {
          strseed += seed;
        }
        for (var k = 0; k < strseed.length + 20; k++) {
          me.b ^= strseed.charCodeAt(k) | 0;
          me.next();
        }
      }
      function copy(f, t) {
        t.a = f.a;
        t.b = f.b;
        t.c = f.c;
        t.d = f.d;
        return t;
      }
      ;
      function impl(seed, opts) {
        var xg = new XorGen(seed), state = opts && opts.state, prng = function() {
          return (xg.next() >>> 0) / 4294967296;
        };
        prng.double = function() {
          do {
            var top = xg.next() >>> 11, bot = (xg.next() >>> 0) / 4294967296, result = (top + bot) / (1 << 21);
          } while (result === 0);
          return result;
        };
        prng.int32 = xg.next;
        prng.quick = prng;
        if (state) {
          if (typeof state == "object")
            copy(state, xg);
          prng.state = function() {
            return copy(xg, {});
          };
        }
        return prng;
      }
      if (module2 && module2.exports) {
        module2.exports = impl;
      } else if (define2 && define2.amd) {
        define2(function() {
          return impl;
        });
      } else {
        this.tychei = impl;
      }
    })(
      exports,
      typeof module == "object" && module,
      // present in node.js
      typeof define == "function" && define
      // present with an AMD loader
    );
  }
});

// (disabled):crypto
var require_crypto = __commonJS({
  "(disabled):crypto"() {
  }
});

// node_modules/seedrandom/seedrandom.js
var require_seedrandom = __commonJS({
  "node_modules/seedrandom/seedrandom.js"(exports, module) {
    (function(global, pool, math) {
      var width = 256, chunks = 6, digits = 52, rngname = "random", startdenom = math.pow(width, chunks), significance = math.pow(2, digits), overflow = significance * 2, mask = width - 1, nodecrypto;
      function seedrandom2(seed, options, callback) {
        var key = [];
        options = options == true ? { entropy: true } : options || {};
        var shortseed = mixkey(flatten(
          options.entropy ? [seed, tostring(pool)] : seed == null ? autoseed() : seed,
          3
        ), key);
        var arc4 = new ARC4(key);
        var prng = function() {
          var n = arc4.g(chunks), d = startdenom, x = 0;
          while (n < significance) {
            n = (n + x) * width;
            d *= width;
            x = arc4.g(1);
          }
          while (n >= overflow) {
            n /= 2;
            d /= 2;
            x >>>= 1;
          }
          return (n + x) / d;
        };
        prng.int32 = function() {
          return arc4.g(4) | 0;
        };
        prng.quick = function() {
          return arc4.g(4) / 4294967296;
        };
        prng.double = prng;
        mixkey(tostring(arc4.S), pool);
        return (options.pass || callback || function(prng2, seed2, is_math_call, state) {
          if (state) {
            if (state.S) {
              copy(state, arc4);
            }
            prng2.state = function() {
              return copy(arc4, {});
            };
          }
          if (is_math_call) {
            math[rngname] = prng2;
            return seed2;
          } else
            return prng2;
        })(
          prng,
          shortseed,
          "global" in options ? options.global : this == math,
          options.state
        );
      }
      function ARC4(key) {
        var t, keylen = key.length, me = this, i = 0, j = me.i = me.j = 0, s = me.S = [];
        if (!keylen) {
          key = [keylen++];
        }
        while (i < width) {
          s[i] = i++;
        }
        for (i = 0; i < width; i++) {
          s[i] = s[j = mask & j + key[i % keylen] + (t = s[i])];
          s[j] = t;
        }
        (me.g = function(count) {
          var t2, r = 0, i2 = me.i, j2 = me.j, s2 = me.S;
          while (count--) {
            t2 = s2[i2 = mask & i2 + 1];
            r = r * width + s2[mask & (s2[i2] = s2[j2 = mask & j2 + t2]) + (s2[j2] = t2)];
          }
          me.i = i2;
          me.j = j2;
          return r;
        })(width);
      }
      function copy(f, t) {
        t.i = f.i;
        t.j = f.j;
        t.S = f.S.slice();
        return t;
      }
      ;
      function flatten(obj, depth) {
        var result = [], typ = typeof obj, prop;
        if (depth && typ == "object") {
          for (prop in obj) {
            try {
              result.push(flatten(obj[prop], depth - 1));
            } catch (e) {
            }
          }
        }
        return result.length ? result : typ == "string" ? obj : obj + "\0";
      }
      function mixkey(seed, key) {
        var stringseed = seed + "", smear, j = 0;
        while (j < stringseed.length) {
          key[mask & j] = mask & (smear ^= key[mask & j] * 19) + stringseed.charCodeAt(j++);
        }
        return tostring(key);
      }
      function autoseed() {
        try {
          var out;
          if (nodecrypto && (out = nodecrypto.randomBytes)) {
            out = out(width);
          } else {
            out = new Uint8Array(width);
            (global.crypto || global.msCrypto).getRandomValues(out);
          }
          return tostring(out);
        } catch (e) {
          var browser = global.navigator, plugins = browser && browser.plugins;
          return [+/* @__PURE__ */ new Date(), global, plugins, global.screen, tostring(pool)];
        }
      }
      function tostring(a) {
        return String.fromCharCode.apply(0, a);
      }
      mixkey(math.random(), pool);
      if (typeof module == "object" && module.exports) {
        module.exports = seedrandom2;
        try {
          nodecrypto = require_crypto();
        } catch (ex) {
        }
      } else if (typeof define == "function" && define.amd) {
        define(function() {
          return seedrandom2;
        });
      } else {
        math["seed" + rngname] = seedrandom2;
      }
    })(
      // global: `self` in browsers (including strict mode and web workers),
      // otherwise `this` in Node and other environments
      typeof self !== "undefined" ? self : exports,
      [],
      // pool: entropy pool starts empty
      Math
      // math: package containing random, pow, and seedrandom
    );
  }
});

// node_modules/seedrandom/index.js
var require_seedrandom2 = __commonJS({
  "node_modules/seedrandom/index.js"(exports, module) {
    var alea = require_alea();
    var xor128 = require_xor128();
    var xorwow = require_xorwow();
    var xorshift7 = require_xorshift7();
    var xor4096 = require_xor4096();
    var tychei = require_tychei();
    var sr = require_seedrandom();
    sr.alea = alea;
    sr.xor128 = xor128;
    sr.xorwow = xorwow;
    sr.xorshift7 = xorshift7;
    sr.xor4096 = xor4096;
    sr.tychei = tychei;
    module.exports = sr;
  }
});

// src/backend/utils.ts
var Vector = class _Vector {
  constructor(vx, y) {
    __publicField(this, "x");
    __publicField(this, "y");
    if (vx instanceof _Vector) {
      this.x = vx.x;
      this.y = vx.y;
    } else {
      this.x = vx || 0;
      this.y = y || 0;
    }
  }
  equals(vx, y) {
    if (vx === void 0 || vx === null) {
      return false;
    }
    if (vx instanceof _Vector) {
      return this.x === vx.x && this.y === vx.y;
    } else {
      return this.x === vx && this.y === y;
    }
  }
  /**
   * Creates a new Vector with the same coordinates.
   * Useful when you need a copy that won't be modified by reference.
   */
  clone() {
    return new _Vector(this);
  }
  add(vx, y) {
    if (vx instanceof _Vector) {
      return new _Vector(this.x + vx.x, this.y + vx.y);
    } else {
      return new _Vector(this.x + vx, this.y + (y || 0));
    }
  }
  sub(vx, y) {
    if (vx instanceof _Vector) {
      return this.add(new _Vector(-vx.x, -vx.y));
    } else {
      return this.add(-vx, -(y || 0));
    }
  }
  /**
   * Multiplies the vector by a scalar value.
   * Used for scaling positions and directions.
   */
  mul(scalar) {
    return new _Vector(this.x * scalar, this.y * scalar);
  }
  /**
   * Returns a new Vector with negated coordinates.
   * Shorthand for multiplying by -1.
   */
  invert() {
    return this.mul(-1);
  }
};

// src/backend/game-logic.ts
var import_seedrandom = __toESM(require_seedrandom2(), 1);
function assertNever(x) {
  throw new Error("Unexpected object: " + x);
}
var GameLogic = class {
  constructor(_stage) {
    this._stage = _stage;
    __publicField(this, "_prng");
    __publicField(this, "_state");
    __publicField(this, "_pendingDuration", 0);
    __publicField(this, "_totalDuration", 0);
    __publicField(this, "onInputCallback");
    this._prng = (0, import_seedrandom.default)(`${_stage.seed}\0`);
    this._state = this._createInitialState();
  }
  get options() {
    return this._stage;
  }
  get state() {
    return this._state;
  }
  get totalDuration() {
    return this._totalDuration;
  }
  _createInitialState() {
    let blocks = [];
    for (let x = 0; x < this._stage.xTiles; ++x) {
      blocks.push(new Vector(x, 0), new Vector(x, this._stage.yTiles - 1));
    }
    for (let y = 1; y < this._stage.yTiles - 1; ++y) {
      blocks.push(new Vector(0, y), new Vector(this._stage.xTiles - 1, y));
    }
    blocks = blocks.filter((block) => {
      return !this._stage.wallHoles.find((hole) => hole.equals(block));
    });
    blocks.push(...this._stage.blocks);
    return {
      blocks,
      speed: 12,
      applePos: null,
      snakes: this._stage.snakes.map((snake) => ({
        position: snake.position,
        length: 4,
        tiles: [],
        dir: snake.direction,
        pendingDirs: []
      })),
      gameOver: false
    };
  }
  _resetState() {
    this._pendingDuration = 0;
    this._totalDuration = 0;
    this._prng = (0, import_seedrandom.default)(`${this.options.seed}\0`);
    this._state = this._createInitialState();
  }
  _actionStep() {
    const state = this._state;
    if (state.gameOver) {
      return false;
    }
    for (let i = 0; i < state.snakes.length; i++) {
      const snake = state.snakes[i];
      if (snake.pendingDirs.length > 0) {
        snake.dir = snake.pendingDirs[0];
        snake.pendingDirs.splice(0, 1);
      }
      let direction;
      switch (snake.dir) {
        case 1 /* UP */:
          direction = new Vector(0, 1);
          break;
        case -1 /* DOWN */:
          direction = new Vector(0, -1);
          break;
        case -2 /* LEFT */:
          direction = new Vector(-1, 0);
          break;
        case 2 /* RIGHT */:
          direction = new Vector(1, 0);
          break;
        default:
          return assertNever(snake.dir);
      }
      const newPosition = snake.position.add(direction);
      for (let j = 0; j < state.snakes.length; j++) {
        if (i !== j) {
          const otherSnake = state.snakes[j];
          if (otherSnake.tiles.find((v) => v.equals(newPosition))) {
            state.gameOver = true;
            return false;
          }
        }
      }
      if (state.blocks.find((v) => v.equals(newPosition))) {
        state.gameOver = true;
        return false;
      }
      if (snake.tiles.find((v) => v.equals(newPosition))) {
        state.gameOver = true;
        return false;
      }
      if (newPosition.x < 0) {
        newPosition.x = this.options.xTiles - 1;
      }
      if (newPosition.y < 0) {
        newPosition.y = this.options.yTiles - 1;
      }
      if (newPosition.x > this.options.xTiles - 1) {
        newPosition.x = 0;
      }
      if (newPosition.y > this.options.yTiles - 1) {
        newPosition.y = 0;
      }
      snake.position = newPosition;
      snake.tiles.push(newPosition);
      if (snake.position.equals(state.applePos)) {
        state.applePos = null;
        snake.length += 2;
      }
      while (snake.tiles.length > snake.length) {
        snake.tiles.splice(0, 1);
      }
      for (let j = 0; j < state.snakes.length; j++) {
        if (i !== j) {
          const otherSnake = state.snakes[j];
          if (otherSnake.tiles.find((v) => v.equals(newPosition))) {
            state.gameOver = true;
            return false;
          }
        }
      }
      snake.position = newPosition;
      snake.tiles.push(newPosition);
    }
    if (!state.applePos) {
      this._actionNewApple();
    }
    return true;
  }
  _actionNewApple() {
    let newPos;
    while (true) {
      newPos = new Vector(
        Math.floor(this._prng() * this.options.xTiles),
        Math.floor(this._prng() * this.options.yTiles)
      );
      if (this._state.blocks.find((v) => v.equals(newPos))) {
        continue;
      }
      if (this._state.snakes.find(
        (snake) => !!snake.tiles.find((v) => v.equals(newPos))
      )) {
        continue;
      }
      break;
    }
    this._state.applePos = newPos;
  }
  _actionNewDir(snakeIdx, newDir) {
    const snakeState = this._state.snakes[snakeIdx];
    if (snakeState.pendingDirs.length >= 2) {
      return false;
    }
    let curDir = snakeState.dir;
    if (snakeState.pendingDirs.length > 0) {
      curDir = snakeState.pendingDirs[snakeState.pendingDirs.length - 1];
    }
    if (curDir === newDir || curDir + newDir === 0) {
      return false;
    }
    snakeState.pendingDirs.push(newDir);
    return true;
  }
  _actionSpeedChange(speedIncrement) {
    let newSpeed = this._state.speed + speedIncrement;
    newSpeed = Math.max(1, Math.min(1e3, newSpeed));
    this._state.speed = newSpeed;
    return true;
  }
  input(input) {
    let handled = false;
    switch (input.inputType) {
      case "direction":
        handled = this._actionNewDir(input.snakeIdx, input.dir);
        break;
      case "speed":
        handled = this._actionSpeedChange(input.speedIncrement);
        break;
      default:
        assertNever(input);
    }
    if (this.onInputCallback && handled) {
      this.onInputCallback({
        eventTime: this._totalDuration,
        gameInput: input
      });
    }
  }
  advanceTime(duration) {
    this._totalDuration += duration;
    this._pendingDuration += duration;
    const stepSize = 1e3 / this._state.speed;
    const totalSteps = Math.floor(this._pendingDuration / stepSize);
    for (let i = 0; i < totalSteps; ++i) {
      this._actionStep();
    }
    this._pendingDuration -= totalSteps * stepSize;
  }
};

// src/game-renderer.ts
var GameRenderer = class {
  constructor() {
    __publicField(this, "_paddingX", 0);
    __publicField(this, "_paddingY", 0);
    __publicField(this, "_tileWidth", 0);
    __publicField(this, "_tileHeight", 0);
    __publicField(this, "_boardHeight", 0);
    __publicField(this, "_boardWidth", 0);
    __publicField(this, "_canvasHeight", 0);
    __publicField(this, "_canvasWidth", 0);
    __publicField(this, "_gameOptions");
  }
  initRenderer(gameOptions) {
    this._gameOptions = gameOptions;
  }
  onCanvasSizeChanged(w, h) {
    const tileLength = Math.min(
      w / this._gameOptions.xTiles,
      h / this._gameOptions.yTiles
    );
    this._tileWidth = tileLength;
    this._tileHeight = tileLength;
    this._boardWidth = this._gameOptions.xTiles * this._tileWidth;
    this._boardHeight = this._gameOptions.yTiles * this._tileHeight;
    this._paddingX = (w - this._boardWidth) / 2;
    this._paddingY = (h - this._boardHeight) / 2;
    this._canvasWidth = w;
    this._canvasHeight = h;
  }
  _drawTile(ctx, v, style) {
    const { fillStyle, strokeStyle } = typeof style === "string" ? { fillStyle: style, strokeStyle: style } : style;
    ctx.fillStyle = fillStyle;
    ctx.fillRect(
      this._paddingX + v.x * this._tileWidth,
      this._paddingY + this._boardHeight - v.y * this._tileHeight - this._tileHeight,
      this._tileWidth,
      this._tileHeight
    );
    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle;
      ctx.strokeRect(
        this._paddingX + v.x * this._tileWidth,
        this._paddingY + this._boardHeight - v.y * this._tileHeight - this._tileHeight,
        this._tileWidth,
        this._tileHeight
      );
    }
  }
  render(ctx, gameState, playbackMode) {
    ctx.fillStyle = "green";
    ctx.fillRect(
      this._paddingX,
      this._paddingY,
      this._boardWidth,
      this._boardHeight
    );
    gameState.blocks.forEach((block) => {
      this._drawTile(ctx, block, "black");
    });
    if (gameState.applePos) {
      this._drawTile(ctx, gameState.applePos, "red");
    }
    const snakeColors = [
      "#4040FF",
      "#FF4040",
      "#40FF40",
      "#FFFF40",
      "#FF40FF",
      "#40FFFF"
    ];
    const darkenedSnakeColors = snakeColors.map((color) => {
      const num = parseInt(color.slice(1), 16);
      const r = Math.max((num >> 16) - 40, 0);
      const g = Math.max((num >> 8 & 255) - 40, 0);
      const b = Math.max((num & 255) - 40, 0);
      return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, "0")}`;
    });
    gameState.snakes.forEach((snake, index) => {
      const bodyColor = snakeColors[index % snakeColors.length];
      const headColor = darkenedSnakeColors[index % darkenedSnakeColors.length];
      snake.tiles.forEach((tile) => {
        this._drawTile(ctx, tile, bodyColor);
      });
      this._drawTile(ctx, snake.position, headColor);
    });
    if (playbackMode) {
      ctx.beginPath();
      ctx.moveTo(10, 10);
      ctx.lineTo(10, 60);
      ctx.lineTo(60, 35);
      ctx.closePath();
      ctx.fillStyle = "#50FF50";
      ctx.fill();
    }
    if (gameState.gameOver) {
      const fontSize = this._boardHeight / 10;
      ctx.font = `Bold ${fontSize}px Georgia`;
      const text = "Game Over!";
      const measurement = ctx.measureText(text);
      const x = (this._canvasWidth - measurement.width) / 2;
      const y = (this._canvasHeight - fontSize) / 2;
      ctx.fillStyle = "black";
      ctx.fillText(text, x, y);
      ctx.strokeStyle = "white";
      ctx.strokeText(text, x, y);
    }
  }
};

// src/backend/state-handlers.ts
var GameHandlerBase = class {
};
var PlaybackHandler = class extends GameHandlerBase {
  constructor(_gameStage, savedInputs) {
    super();
    this._gameStage = _gameStage;
    this.savedInputs = savedInputs;
    __publicField(this, "_gameLogic");
    __publicField(this, "_inputIndex");
    this._gameLogic = new GameLogic(this._gameStage);
    this._inputIndex = 0;
  }
  get gameStage() {
    return this._gameStage;
  }
  get isDone() {
    return this._inputIndex >= this.savedInputs.length;
  }
  advanceTime(duration) {
    if (this._inputIndex >= this.savedInputs.length) {
      return;
    }
    while (duration > 0) {
      let newPlayedDuration = this._gameLogic.totalDuration + duration;
      const nextInput = this.savedInputs[this._inputIndex];
      if (newPlayedDuration >= nextInput.eventTime) {
        newPlayedDuration = nextInput.eventTime;
      }
      this._gameLogic.advanceTime(
        newPlayedDuration - this._gameLogic.totalDuration
      );
      if (this._gameLogic.totalDuration >= nextInput.eventTime) {
        this._gameLogic.input(nextInput.gameInput);
        ++this._inputIndex;
      }
      duration = newPlayedDuration - this._gameLogic.totalDuration;
    }
  }
  get state() {
    return this._gameLogic.state;
  }
  performInput(_input) {
  }
};
var LiveHandler = class extends GameHandlerBase {
  constructor(_gameStage, savedInputs) {
    super();
    this._gameStage = _gameStage;
    __publicField(this, "_gameLogic");
    __publicField(this, "savedInputs");
    this.savedInputs = savedInputs || [];
    this._gameLogic = new GameLogic(this._gameStage);
    if (this.savedInputs.length > 0) {
      for (const savedInput of this.savedInputs) {
        this._gameLogic.advanceTime(
          savedInput.eventTime - this._gameLogic.totalDuration
        );
        this._gameLogic.input(savedInput.gameInput);
      }
    }
    this._gameLogic.onInputCallback = (e) => this._onGameInput(e);
  }
  get gameStage() {
    return this._gameStage;
  }
  advanceTime(duration) {
    this._gameLogic.advanceTime(duration);
  }
  get isDone() {
    return false;
  }
  get state() {
    return this._gameLogic.state;
  }
  _onGameInput(e) {
    this.savedInputs.push(e);
  }
  performInput(input) {
    this._gameLogic.input(input);
  }
};

// src/game-engine.ts
var GameEngine = class {
  constructor(window2, canvas, ctx) {
    this.window = window2;
    this.canvas = canvas;
    this.ctx = ctx;
    __publicField(this, "_gameRenderer");
    // Will be initialized in start()
    __publicField(this, "_handler");
    // Will be initialized in start()
    __publicField(this, "_lastEngineTime");
    // Will be initialized in start()
    __publicField(this, "_isPlaybackMode", false);
  }
  start() {
    this._gameRenderer = new GameRenderer();
    this._restartLiveMode();
    this._initListeners();
    this._updateCanvasDimensions();
    this._timeout();
  }
  _initListeners() {
    this.window.addEventListener(
      "resize",
      () => this._updateCanvasDimensions()
    );
    this.window.addEventListener("keydown", (e) => this._onKeyDown(e));
  }
  _onKeyDown(event) {
    if (event.defaultPrevented) {
      return;
    }
    if (event.key.toLowerCase() === "p") {
      if (!this._isPlaybackMode) {
        this._enterPlaybackMode();
      } else {
        this._resumeLiveMode();
      }
    } else if (event.key.toLowerCase() === "n") {
      this._restartLiveMode();
    } else if (event.key === "+") {
      this._performInput({
        inputType: "speed",
        speedIncrement: 1
      });
    } else if (event.key === "-") {
      this._performInput({
        inputType: "speed",
        speedIncrement: -1
      });
    } else {
      let newDirection;
      let snakeIdx = 1;
      switch (event.key.toLowerCase()) {
        case "s":
          snakeIdx = 0;
        case "arrowdown":
          newDirection = -1 /* DOWN */;
          break;
        case "w":
          snakeIdx = 0;
        case "arrowup":
          newDirection = 1 /* UP */;
          break;
        case "a":
          snakeIdx = 0;
        case "arrowleft":
          newDirection = -2 /* LEFT */;
          break;
        case "d":
          snakeIdx = 0;
        case "arrowright":
          newDirection = 2 /* RIGHT */;
          break;
        default:
          return;
      }
      this._performInput({
        inputType: "direction",
        dir: newDirection,
        snakeIdx
      });
    }
    event.preventDefault();
  }
  _updateCanvasDimensions() {
    this.canvas.height = this.window.innerHeight;
    this.canvas.width = this.window.innerWidth;
    this._gameRenderer.onCanvasSizeChanged(
      this.canvas.width,
      this.canvas.height
    );
    this._draw();
  }
  _timeout() {
    this._update();
    this._draw();
    requestAnimationFrame(() => this._timeout());
  }
  _update() {
    this._advanceTimeToNow();
  }
  _performInput(input) {
    this._advanceTimeToNow();
    this._handler.performInput(input);
  }
  _advanceTimeToNow() {
    const now = performance.now();
    const duration = now - this._lastEngineTime;
    this._handler.advanceTime(duration);
    this._lastEngineTime = now;
    if (this._isPlaybackMode && this._handler.isDone) {
      this._resumeLiveMode();
    }
  }
  _restartLiveMode() {
    const x = 60, y = 40;
    const gameStage = {
      xTiles: x,
      yTiles: y,
      seed: Date.now(),
      wallHoles: [
        new Vector(0, y / 2),
        new Vector(0, y / 2 + 1),
        new Vector(x - 1, y / 2),
        new Vector(x - 1, y / 2 + 1)
      ],
      blocks: [
        new Vector(x / 2, y / 2),
        new Vector(x / 2 - 1, y / 2 - 1),
        new Vector(x / 2, y / 2 - 1),
        new Vector(x / 2 - 1, y / 2)
      ],
      snakes: [
        {
          position: new Vector(4, 4),
          direction: 2 /* RIGHT */
        },
        {
          position: new Vector(x - 4, y - 4),
          direction: -2 /* LEFT */
        }
      ]
    };
    this._isPlaybackMode = false;
    this._handler = new LiveHandler(gameStage);
    this._lastEngineTime = performance.now();
    this._gameRenderer.initRenderer(this._handler.gameStage);
  }
  _resumeLiveMode() {
    this._isPlaybackMode = false;
    this._handler = new LiveHandler(
      this._handler.gameStage,
      this._handler.savedInputs
    );
  }
  _enterPlaybackMode() {
    this._isPlaybackMode = true;
    this._handler = new PlaybackHandler(
      this._handler.gameStage,
      this._handler.savedInputs
    );
    this._lastEngineTime = performance.now();
  }
  _draw() {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this._gameRenderer.render(
      this.ctx,
      this._handler.state,
      this._isPlaybackMode
    );
  }
};

// src/app.ts
var GameApp = class {
  constructor() {
    __publicField(this, "gameEngine", null);
    window.addEventListener("DOMContentLoaded", () => this.initialize());
  }
  initialize() {
    const canvas = document.querySelector("#canvas");
    if (!canvas) {
      console.error("Canvas element not found");
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      console.error("Could not get 2D context");
      return;
    }
    this.gameEngine = new GameEngine(window, canvas, context);
    this.gameEngine.start();
  }
};
new GameApp();
//# sourceMappingURL=bundle.js.map
