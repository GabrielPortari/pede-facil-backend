import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { BusinessEntity } from './entities/business.entity';
import { Business } from '../models/business.model';

@Injectable()
export class BusinessService {
  async findAll() {
    const snapshot = await BusinessEntity.collectionRef()
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map((d) => BusinessEntity.fromFirestore(d));
  }

  async findOne(id: string) {
    const doc = await BusinessEntity.docRef(id).get();
    if (!doc.exists) throw new NotFoundException('Business not found');
    return BusinessEntity.fromFirestore(doc);
  }

  async update(id: string, updateBusinessDto: UpdateBusinessDto) {
    const docRef = BusinessEntity.docRef(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException('Business not found');

    const existing = BusinessEntity.fromFirestore(doc);
    const merged = Object.assign(
      new Business(existing),
      updateBusinessDto as any,
    );
    const data = BusinessEntity.toFirestore(merged);
    await docRef.update(data);
    const updated = await docRef.get();
    return BusinessEntity.fromFirestore(updated);
  }

  async remove(id: string) {
    const docRef = BusinessEntity.docRef(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException('Business not found');
    await docRef.delete();
    return { id };
  }
}
