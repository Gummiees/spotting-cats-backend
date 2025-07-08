export interface Cat {
  _id?: string; // MongoDB will use ObjectId, but string is fine for TS
  name: string;
  age: number;
  breed?: string;
}
