export interface MacroEvent {
  id: string;
  event_type: 'MPC' | 'CPI' | 'IIP';
  date: string; // YYYY-MM-DD
  time: string | null;
  outcome: string | null;
  actual: number | null;
  consensus: number | null;
  surprise_score: number | null;
  notes: string | null;
}

export interface WindowData {
  price: number | null;
  pct_change_from_T60: number | null;
  resolution: '1hr' | '1d';
}

export interface AssetSnapshot {
  'T-60'?: WindowData;
  'T0'?: WindowData;
  'T+30'?: WindowData;
  'T+2H'?: WindowData;
  'T+1D'?: WindowData;
}

export interface EventDetail {
  event: MacroEvent;
  snapshots: {
    NIFTY: AssetSnapshot | null;
    USDINR: AssetSnapshot | null;
    VIX: AssetSnapshot | null;
    GSEC: AssetSnapshot | null;
  };
}

export interface ScatterPoint {
  event_id: string;
  event_date: string;
  surprise_score: number;
  reaction_pct: number;
  actual: number;
  consensus: number;
}

export interface ScatterResponse {
  points: ScatterPoint[];
  regression: {
    slope: number;
    intercept: number;
    r_squared: number;
  };
  message?: string;
}

export interface EventStudyPath {
  decision_type: 'hike' | 'cut' | 'hold';
  asset: string;
  days: [-2, -1, 0, 1, 2];
  mean_indexed: number[];
  upper_band: number[];
  lower_band: number[];
  event_count: number;
}
