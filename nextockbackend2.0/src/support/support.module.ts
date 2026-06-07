import { Module } from '@nestjs/common';
import { SupportController } from './support.controller';
import { MailService } from './mail.service';

@Module({
  controllers: [SupportController],
  providers: [MailService],
})
export class SupportModule {}
