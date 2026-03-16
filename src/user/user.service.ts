import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';
import { User } from '../models/user.model';
import * as admin from 'firebase-admin';
import { Collections } from 'src/constants/collections';
import { UserBusinessViewDto } from './dto/user-business-view.dto';

@Injectable()
export class UserService {
  async findAll() {
    const snapshot = await UserEntity.collectionRef()
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map((d) => UserEntity.fromFirestore(d));
  }

  async findOne(id: string) {
    const doc = await UserEntity.docRef(id).get();
    if (!doc.exists) throw new NotFoundException('User not found');
    return UserEntity.fromFirestore(doc);
  }

  async findOneForBusiness(
    userId: string,
    businessId: string,
  ): Promise<UserBusinessViewDto> {
    const hasRelationship = await this.hasBusinessRelationship(
      businessId,
      userId,
    );

    if (!hasRelationship) {
      throw new ForbiddenException(
        'Business has no relationship with this user',
      );
    }

    const user = await this.findOne(userId);
    return this.toBusinessView(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const docRef = UserEntity.docRef(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException('User not found');

    const existing = UserEntity.fromFirestore(doc);
    const merged = Object.assign(new User(existing), updateUserDto as any);
    const data = UserEntity.toFirestore(merged);
    await docRef.update(data);
    const updated = await docRef.get();
    return UserEntity.fromFirestore(updated);
  }

  async remove(id: string) {
    const docRef = UserEntity.docRef(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException('User not found');
    await docRef.delete();
    return { id };
  }

  private async hasBusinessRelationship(
    businessId: string,
    userId: string,
  ): Promise<boolean> {
    const snapshot = await admin
      .firestore()
      .collection(Collections.ORDERS)
      .where('businessId', '==', businessId)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    return !snapshot.empty;
  }

  private toBusinessView(user: User): UserBusinessViewDto {
    return {
      id: user.id,
      name: user.name,
      createdAt: user.createdAt as Date | undefined,
      updatedAt: user.updatedAt as Date | undefined,
    };
  }
}
