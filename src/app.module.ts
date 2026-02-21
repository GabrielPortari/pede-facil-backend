import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { AppService } from './app.service';
import { FirebaseModule } from './firebase/firebase.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), FirebaseModule.forRoot()],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
