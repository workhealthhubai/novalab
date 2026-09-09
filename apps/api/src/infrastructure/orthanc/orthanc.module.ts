import { Global, Module } from '@nestjs/common';
import { OrthancService } from './orthanc.service';

@Global()
@Module({
  providers: [OrthancService],
  exports: [OrthancService],
})
export class OrthancModule {}
