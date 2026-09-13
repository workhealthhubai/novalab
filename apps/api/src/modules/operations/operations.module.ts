import { WorkItemsController } from './work-items.controller';
import { WorkItemsService } from './work-items.service';
import { Module } from '@nestjs/common';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';
@Module({
  controllers: [OperationsController, WorkItemsController],
  providers: [OperationsService, WorkItemsService],
})
export class OperationsModule {}
