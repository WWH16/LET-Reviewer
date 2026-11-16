import { useState } from 'react';
import { DatePicker } from '@cloudflare/kumo/components/date-picker';
import { Popover } from '@cloudflare/kumo/components/popover';
import { Icon } from './Icon';
import { KUMO } from './btn';

const pad = (n: number) => String(n).padStart(2, '0');
/** 'YYYY-MM-DD' as a local date; `new Date(iso)` would read it as UTC and can land a day off. */
const parse = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const format = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Kumo's calendar in a popover. Value is 'YYYY-MM-DD' or null; picking the selected day again clears it. */
export function DateField({ id, value, onChange }: { id: string; value: string | null; onChange: (value: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const date = value ? parse(value) : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Popover.Trigger id={id} className={`${KUMO.secondary} select date-trigger`}>
        {date ? date.toLocaleDateString(undefined, { dateStyle: 'medium' }) : <span className="muted">No date</span>}
        <Icon name="calendar" size={16} />
      </Popover.Trigger>
      <Popover.Content align="start" className="p-3">
        <DatePicker
          mode="single"
          selected={date}
          defaultMonth={date}
          onChange={(d) => {
            onChange(d ? format(d) : null);
            setOpen(false);
          }}
        />
      </Popover.Content>
    </Popover>
  );
}
