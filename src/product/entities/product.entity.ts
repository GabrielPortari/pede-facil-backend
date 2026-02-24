import * as admin from 'firebase-admin';
import { Product } from '../../models/product.model';
import { BaseModel } from '../../models/base.model';
import { Collections } from 'src/constants/collections';

export class ProductEntity {
  static collectionRef(businessId: string) {
    return admin
      .firestore()
      .collection(Collections.BUSINESSES)
      .doc(businessId)
      .collection(Collections.PRODUCTS);
  }

  static docRef(businessId: string, id?: string) {
    return id
      ? ProductEntity.collectionRef(businessId).doc(id)
      : ProductEntity.collectionRef(businessId).doc();
  }

  static toFirestore(model: Product) {
    return BaseModel.toFirestore(model);
  }

  static fromFirestore(doc: admin.firestore.DocumentSnapshot): Product {
    return (Product as any).fromFirestore(doc) as Product;
  }
}
