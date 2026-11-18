import { describe, it, expect } from 'vitest';
import { parseRoute, toHash } from '../js/router.js';

describe('parseRoute', () => {
  it('封面', () => {
    for (const h of ['', '#', '#/', undefined, null]) {
      expect(parseRoute(h)).toEqual({ name: 'cover', route: '' });
    }
  });
  it('章節', () => {
    expect(parseRoute('#/ch/3')).toEqual({ name: 'ch', no: 3, route: 'ch/3' });
    expect(parseRoute('#/ch/15')).toEqual({ name: 'ch', no: 15, route: 'ch/15' });
  });
  it('其他固定頁', () => {
    for (const name of ['toc', 'match', 'land', 'daily', 'about']) {
      expect(parseRoute(`#/${name}`)).toEqual({ name, route: name });
    }
  });
  it('結尾多一條斜線也認得', () => {
    expect(parseRoute('#/toc/')).toEqual({ name: 'toc', route: 'toc' });
    expect(parseRoute('#/ch/3/')).toEqual({ name: 'ch', no: 3, route: 'ch/3' });
  });
  it('不存在的頁一律回封面', () => {
    for (const h of ['#/ch/0', '#/ch/16', '#/ch/99', '#/ch/abc', '#/ch/3x', '#/ch/-1', '#/ch/1.5', '#/ch/', '#/xyz', '#/toc/extra', '#ch/3', '#/CH/3']) {
      expect(parseRoute(h), h).toEqual({ name: 'cover', route: '' });
    }
  });
  it('可以指定章數上限', () => {
    expect(parseRoute('#/ch/16', 20).name).toBe('ch');
  });
});

describe('toHash', () => {
  it('路由轉成 hash', () => {
    expect(toHash('')).toBe('#/');
    expect(toHash('ch/3')).toBe('#/ch/3');
    expect(toHash('daily')).toBe('#/daily');
  });
  it('和 parseRoute 來回一致', () => {
    for (const r of ['', 'toc', 'ch/1', 'ch/15', 'match', 'land', 'daily', 'about']) {
      expect(parseRoute(toHash(r)).route).toBe(r);
    }
  });
});
