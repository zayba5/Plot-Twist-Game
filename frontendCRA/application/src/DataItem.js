export class DataItem {
  constructor(itemJSON) {
    const item = itemJSON ?? {};

    this.text = item.text ?? "";
  }

  getText() {
    return this.text;
  }
}