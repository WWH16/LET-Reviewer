import { buttonVariants } from '@cloudflare/kumo/components/button';
import { expect, it } from 'vitest';
import { KUMO } from './btn';

it.each(Object.keys(KUMO) as (keyof typeof KUMO)[])('the %s classes match Kumo buttonVariants', (variant) => {
  expect(KUMO[variant]).toBe(buttonVariants({ variant }));
});
