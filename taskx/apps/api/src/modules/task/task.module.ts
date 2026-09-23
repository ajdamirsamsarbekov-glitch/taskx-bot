import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { TaskEntity, PlatformSettingsEntity, TaskSubmissionEntity, UserEntity } from '@taskx/database';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { TaskProcessor } from './task.processor';
import { TaskSchedulerService } from './task-scheduler.service';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaskEntity, PlatformSettingsEntity, TaskSubmissionEntity, UserEntity]),
    BullModule.registerQueue({
      name: 'tasks',
    }),
    WalletModule,
    NotificationModule,
  ],
  providers: [TaskService, TaskProcessor, TaskSchedulerService],
  controllers: [TaskController],
  exports: [TaskService],
})
export class TaskModule {}
