import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DisputeEntity, ReviewEntity, UserEntity } from '@taskx/database';
import { DisputeService } from './dispute.service';
import { DisputeController } from './dispute.controller';
import { TaskModule } from '../task/task.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DisputeEntity, ReviewEntity, UserEntity]),
    TaskModule,
    WalletModule,
  ],
  providers: [DisputeService],
  controllers: [DisputeController],
  exports: [DisputeService],
})
export class DisputeModule {}
