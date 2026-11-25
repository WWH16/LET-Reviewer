import { describe, expect, it, vi } from 'vitest';
import { dropWhileRunning } from './AsyncButton';

describe('dropWhileRunning', () => {
  it('runs the work once however often it is pressed while running, then allows it again', async () => {
    let finish = () => {};
    const work = vi.fn(() => new Promise<void>((done) => (finish = done)));
    const seen: boolean[] = [];
    const press = dropWhileRunning(work, (running) => seen.push(running));

    const first = press();
    void press();
    void press();
    expect(work).toHaveBeenCalledTimes(1);

    finish();
    await first;
    expect(seen).toEqual([true, false]);

    void press();
    expect(work).toHaveBeenCalledTimes(2);
  });

  it('frees the button when the work fails', async () => {
    const press = dropWhileRunning(() => Promise.reject(new Error('no')), () => {});
    await expect(press()).rejects.toThrow('no');
    const work = vi.fn();
    const again = dropWhileRunning(work, () => {});
    await again();
    expect(work).toHaveBeenCalledTimes(1);
  });
});
