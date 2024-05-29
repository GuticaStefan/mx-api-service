export class DailyActivity {
  constructor(init?: Partial<DailyActivity>) {
    Object.assign(this, init);
  }

  date: string = '';
  transactions: number = 0;
  maxTps: number = 0;
  maxTpsBlockHash: string = '';
}
