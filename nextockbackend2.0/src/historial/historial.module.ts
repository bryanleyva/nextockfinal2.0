import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalysisHistory } from './entities/analysis-history.entity';
import { HistorialController } from './historial.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AnalysisHistory])],
  controllers: [HistorialController],
})
export class HistorialModule {}
