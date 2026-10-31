export type EventType = 'deposit' | 'withdraw' | 'transfer_in' | 'transfer_out';

export interface ChainEvent {
  type: EventType;
  block: number;
  tx: string;
  logIndex: number;
  amount: string; // raw, 6 decimals
}

export interface Snapshot {
  date: string; // YYYY-MM-DD, UTC
  block: number;
  balance: string; // raw aUSDT (6 decimals)
  netFlow: string; // raw, deposits - withdrawals since the previous snapshot
  interest: string; // raw
  partial?: boolean; // the day is still running
}

export interface Wallet {
  address: string;
  label: string;
  scannedThrough: number | null;
  events: ChainEvent[];
  snapshots: Snapshot[];
}

export interface Portfolio {
  version: number;
  updatedAt: string;
  wallets: Wallet[];
}

export interface Envelope {
  v: number;
  iterations: number;
  salt: string;
  iv: string;
  data: string;
}
