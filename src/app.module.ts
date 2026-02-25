import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { AppService } from './app.service';
import { FirebaseModule } from './firebase/firebase.module';
import { AuthModule } from './auth/auth.module';
import { BusinessModule } from './business/business.module';
import { UserModule } from './user/user.module';
import { RolesModule } from './roles/roles.module';
import { ProductModule } from './product/product.module';
import { OrderModule } from './order/order.module';
import { OrderModule } from './order/order.module';
import { OrderModule } from './order/order.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    FirebaseModule.forRoot(),
    AuthModule,
    BusinessModule,
    UserModule,
    RolesModule,
    ProductModule,
    OrderModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
