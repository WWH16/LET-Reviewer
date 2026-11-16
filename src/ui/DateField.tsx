import { useState } from 'react';
import { DatePicker } from '@cloudflare/kumo/components/date-picker';
import { Popover } from '@cloudflare/kumo/components/popover';
import { Icon } from './Icon';
import { KUMO } from './btn';
import { isoDay, parseDay } from '../domain/dates';


/** Kumo's calendar in a popover. Value is 'YYYY-MM-DD' or null; picking the selected day again clears it. */
export function DateField({ id, value, onChange }: { id: string; value: string | null; onChange: (value: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const date = value ? parseDay(value) : undefined;
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
            onChange(d ? isoDay(d) : null);
            setOpen(false);
          }}
        />
      </Popover.Content>
    </Popover>
  );
}
