import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SurveyUx } from './encuesta.entity';
import { EncuestaService } from './encuesta.service';
import { EncuestaController } from './encuesta.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SurveyUx])],
  providers: [EncuestaService],
  controllers: [EncuestaController],
})
export class EncuestaModule {}
