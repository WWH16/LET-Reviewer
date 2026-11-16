import { Children, isValidElement, type ReactNode } from 'react';
import { Select as KumoSelect } from '@cloudflare/kumo/components/select';

type OptionProps = { value: string | number; children: ReactNode };

// Kumo draws an empty value as a grey placeholder, but here '' is a real choice ("All topics"),
// so it travels under a stand-in value and is drawn in ink like any other choice.
const EMPTY = '\u0000all';
const enc = (v: string) => (v === '' ? EMPTY : v);
const dec = (v: string) => (v === EMPTY ? '' : v);

/** Kumo's select behind the native shape: `<option>` children in, the picked value out as a string. */
export function Select({ id, value, onChange, children }: { id: string; value: string | number; onChange: (value: string) => void; children: ReactNode }) {
  const items = Children.toArray(children)
    .filter((c) => isValidElement<OptionProps>(c))
    .map((o) => ({ value: enc(String(o.props.value)), label: o.props.children }));
  return <KumoSelect id={id} className="select" items={items} value={enc(String(value))} onValueChange={(v) => onChange(dec(v as string))} />;
}
