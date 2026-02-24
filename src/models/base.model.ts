import * as admin from 'firebase-admin';

export class BaseModel {
  id: string;
  createdAt: Date | admin.firestore.Timestamp | undefined;
  updatedAt: Date | admin.firestore.Timestamp | undefined;

  constructor(init?: Partial<BaseModel>) {
    Object.assign(this, init);
  }

  private static toPlainObject(value: any): any {
    if (value === null || value === undefined) return value;
    if (value instanceof Date) return value;
    if (Array.isArray(value))
      return value.map((item) => BaseModel.toPlainObject(item));

    if (typeof value !== 'object') return value;

    // Keep known Firestore native/special objects untouched
    const constructorName = value.constructor?.name;
    if (
      constructorName === 'Timestamp' ||
      constructorName === 'GeoPoint' ||
      constructorName === 'DocumentReference' ||
      constructorName === 'FieldValue'
    ) {
      return value;
    }

    const result: Record<string, any> = {};
    Object.keys(value).forEach((key) => {
      const nested = BaseModel.toPlainObject(value[key]);
      if (nested !== undefined) result[key] = nested;
    });
    return result;
  }

  static toFirestore<T extends BaseModel>(model: T) {
    const data: any = BaseModel.toPlainObject(model);
    delete data.id;
    // remove undefined properties to avoid Firestore error
    Object.keys(data).forEach((k) => {
      if (data[k] === undefined) delete data[k];
    });
    data.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    if (!model.createdAt)
      data.createdAt = admin.firestore.FieldValue.serverTimestamp();
    return data;
  }

  static fromFirestore<T extends BaseModel>(
    this: new (init?: any) => T,
    doc: admin.firestore.DocumentSnapshot,
  ) {
    const data = doc.data() || {};
    const createdAt =
      data.createdAt &&
      (data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt);
    const updatedAt =
      data.updatedAt &&
      (data.updatedAt.toDate ? data.updatedAt.toDate() : data.updatedAt);
    return new this({ id: doc.id, createdAt, updatedAt, ...(data as object) });
  }
}
