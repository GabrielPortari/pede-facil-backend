import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';
import { User } from '../models/user.model';

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
}
