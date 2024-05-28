export class TopBlock {
  constructor(init?: Partial<TopBlock>) {
    Object.assign(this, init);
  }

  hash: string = '';
  nonce: number = 0;
  txCount: number = 0;
}
