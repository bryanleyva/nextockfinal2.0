import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MlService } from './ml.service';

@Module({
  imports: [HttpModule.register({ timeout: 60000 })],
  providers: [MlService],
  exports: [MlService],
})
export class MlModule {}
