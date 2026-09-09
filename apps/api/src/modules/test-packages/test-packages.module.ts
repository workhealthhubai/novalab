import { Module } from '@nestjs/common';
import { TestPackagesController } from './test-packages.controller';
import { TestPackagesRepository } from './test-packages.repository';
import { TestPackagesService } from './test-packages.service';

@Module({
  controllers: [TestPackagesController],
  providers: [TestPackagesService, TestPackagesRepository],
  exports: [TestPackagesService],
})
export class TestPackagesModule {}
