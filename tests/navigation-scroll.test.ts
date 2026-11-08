import {expect, test} from 'bun:test';
import {preserveNavigationScroll} from '../src/lib/navigation-scroll';

test('a persistent navigation DOM swap preserves the existing scroller in both axes', () => {
  const scroller = {scrollTop: 120, scrollLeft: 8, isConnected: true};
  const event = {calls: 0, swap() {this.calls++;scroller.scrollTop = 0;scroller.scrollLeft = 0;}};
  preserveNavigationScroll(event, scroller);
  event.swap();
  expect(event.calls).toBe(1);
  expect(scroller.scrollTop).toBe(120);
  expect(scroller.scrollLeft).toBe(8);
});

test('the latest position is captured when swapping, not when navigation starts', () => {
  const scroller = {scrollTop: 40, scrollLeft: 0, isConnected: true};
  const event = {swap() {scroller.scrollTop = 0;}};
  preserveNavigationScroll(event, scroller);
  scroller.scrollTop = 90;
  event.swap();
  expect(scroller.scrollTop).toBe(90);
});

test('a scroller removed during the swap is not written back', () => {
  const scroller = {scrollTop: 40, scrollLeft: 0, isConnected: true};
  const event = {swap() {scroller.isConnected = false;scroller.scrollTop = 0;}};
  preserveNavigationScroll(event, scroller);
  event.swap();
  expect(scroller.scrollTop).toBe(0);
});

test('restoration is synchronous, before the wrapped swap returns to Astro', () => {
  const scroller = {scrollTop: 40, scrollLeft: 0, isConnected: true};
  const steps: string[] = [];
  const event = {swap() {steps.push('swap');scroller.scrollTop = 0;}};
  preserveNavigationScroll(event, scroller);
  event.swap();
  steps.push(`returned:${scroller.scrollTop}`);
  expect(steps).toEqual(['swap', 'returned:40']);
});
