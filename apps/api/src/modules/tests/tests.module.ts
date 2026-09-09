import { Module } from '@nestjs/common';
import { TestsController } from './tests.controller';
import { TestsRepository } from './tests.repository';
import { TestsService } from './tests.service';

@Module({
  controllers: [TestsController],
  providers: [TestsService, TestsRepository],
  exports: [TestsService, TestsRepository],
})
export class TestsModule {}
