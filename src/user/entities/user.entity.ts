import * as admin from 'firebase-admin';
import { User } from '../../models/user.model';
import { BaseModel } from '../../models/base.model';
import { Collections } from 'src/constants/collections';

export class UserEntity {
  static collection = Collections.USERS;

  static collectionRef() {
    return admin.firestore().collection(UserEntity.collection);
  }

  static docRef(id?: string) {
    return id
      ? UserEntity.collectionRef().doc(id)
      : UserEntity.collectionRef().doc();
  }

  static toFirestore(model: User) {
    return BaseModel.toFirestore(model);
  }

  static fromFirestore(doc: admin.firestore.DocumentSnapshot): User {
    return (User as any).fromFirestore(doc) as User;
  }
}
