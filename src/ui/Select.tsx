import { Children, isValidElement, type ReactNode } from 'react';
import { Select as KumoSelect } from '@cloudflare/kumo/components/select';

type OptionProps = { value: string | number; children: ReactNode };

/** Kumo's select behind the native shape: `<option>` children in, the picked value out as a string. */
export function Select({ id, value, onChange, children }: { id: string; value: string | number; onChange: (value: string) => void; children: ReactNode }) {
  const items = Children.toArray(children)
    .filter((c) => isValidElement<OptionProps>(c))
    .map((o) => ({ value: String(o.props.value), label: o.props.children }));
  return <KumoSelect id={id} className="select" items={items} value={String(value)} onValueChange={(v) => onChange(v as string)} />;
}
