import { describe, it, expect } from 'vitest';
import { Vector } from './utils';

describe('Vector', () => {
  describe('constructor', () => {
    it('creates vector with x,y coordinates', () => {
      const v = new Vector(2, 3);
      expect(v.x).toBe(2);
      expect(v.y).toBe(3);
    });

    it('creates vector from another vector', () => {
      const v1 = new Vector(2, 3);
      const v2 = new Vector(v1);
      expect(v2.x).toBe(2);
      expect(v2.y).toBe(3);
    });
  });

  describe('equals', () => {
    it('compares with another vector', () => {
      const v1 = new Vector(2, 3);
      const v2 = new Vector(2, 3);
      const v3 = new Vector(2, 4);
      
      expect(v1.equals(v2)).toBe(true);
      expect(v1.equals(v3)).toBe(false);
    });

    it('compares with coordinates', () => {
      const v = new Vector(2, 3);
      expect(v.equals(2, 3)).toBe(true);
      expect(v.equals(2, 4)).toBe(false);
    });

    it('handles null and undefined', () => {
      const v = new Vector(2, 3);
      expect(v.equals(null)).toBe(false);
      expect(v.equals(undefined)).toBe(false);
    });
  });

  describe('clone', () => {
    it('creates a new copy of the vector', () => {
      const v1 = new Vector(2, 3);
      const v2 = v1.clone();
      
      expect(v2.x).toBe(2);
      expect(v2.y).toBe(3);
      expect(v2).not.toBe(v1); // Different instances
    });
  });

  describe('add', () => {
    it('adds another vector', () => {
      const v1 = new Vector(2, 3);
      const v2 = new Vector(1, 2);
      const result = v1.add(v2);
      
      expect(result.x).toBe(3);
      expect(result.y).toBe(5);
    });

    it('adds x,y coordinates', () => {
      const v = new Vector(2, 3);
      const result = v.add(1, 2);
      
      expect(result.x).toBe(3);
      expect(result.y).toBe(5);
    });
  });

  describe('sub', () => {
    it('subtracts another vector', () => {
      const v1 = new Vector(2, 3);
      const v2 = new Vector(1, 2);
      const result = v1.sub(v2);
      
      expect(result.x).toBe(1);
      expect(result.y).toBe(1);
    });

    it('subtracts x,y coordinates', () => {
      const v = new Vector(2, 3);
      const result = v.sub(1, 2);
      
      expect(result.x).toBe(1);
      expect(result.y).toBe(1);
    });
  });

  describe('mul', () => {
    it('multiplies by scalar', () => {
      const v = new Vector(2, 3);
      const result = v.mul(2);
      
      expect(result.x).toBe(4);
      expect(result.y).toBe(6);
    });
  });

  describe('invert', () => {
    it('negates the coordinates', () => {
      const v = new Vector(2, 3);
      const result = v.invert();
      
      expect(result.x).toBe(-2);
      expect(result.y).toBe(-3);
    });
  });
});