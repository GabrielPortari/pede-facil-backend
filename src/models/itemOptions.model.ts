export class ItemOptions {
  size?: string;
  observations?: string;

  constructor(init?: Partial<ItemOptions>) {
    Object.assign(this, init);
  }
}
