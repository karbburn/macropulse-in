import { MacroEvent } from './types';

export const formatOutcome = (event: MacroEvent): string => {
  if (event.event_type === 'MPC') {
    const outcome = event.outcome?.toLowerCase() || '';
    if (outcome.includes('hike')) {
      const bps = outcome.split('+')[1] || '25';
      return `Rate Hike (+${bps} bps)`;
    } else if (outcome.includes('cut')) {
      const bps = outcome.split('-')[1] || '25';
      return `Rate Cut (-${bps} bps)`;
    } else if (outcome === 'hold') {
      return 'Policy Repo Rate Held';
    }
    return event.outcome || 'Policy Decision';
  } else if (event.event_type === 'CPI') {
    return `CPI Inflation at ${event.actual !== null ? event.actual.toFixed(2) : '--'}%`;
  } else if (event.event_type === 'IIP') {
    return `Industrial Production Growth at ${event.actual !== null ? event.actual.toFixed(2) : '--'}%`;
  }
  return event.outcome || 'Macro Event';
};

export const formatEventDate = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
};
