import { Module } from '@nestjs/common';
import { MlModule } from '../ml/ml.module';
import { AnalysisController } from './analysis.controller';

@Module({
  imports: [MlModule],
  controllers: [AnalysisController],
})
export class AnalysisModule {}
