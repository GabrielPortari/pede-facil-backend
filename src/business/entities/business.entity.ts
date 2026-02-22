import * as admin from 'firebase-admin';
import { Business } from '../../models/business.model';
import { BaseModel } from '../../models/base.model';

export class BusinessEntity {
  static collection = 'businesses';

  static collectionRef() {
    return admin.firestore().collection(BusinessEntity.collection);
  }

  static docRef(id?: string) {
    return id
      ? BusinessEntity.collectionRef().doc(id)
      : BusinessEntity.collectionRef().doc();
  }

  // Converte o model de domínio para o objeto salvo no Firestore
  static toFirestore(model: Business) {
    return BaseModel.toFirestore(model);
  }

  // Converte um DocumentSnapshot em Business (preserva id/createdAt/updatedAt)
  static fromFirestore(doc: admin.firestore.DocumentSnapshot): Business {
    return (Business as any).fromFirestore(doc) as Business;
  }
}
