import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Prefijo global /api para todos los endpoints
  app.setGlobalPrefix('api');

  // CORS habilitado para que el frontend Angular pueda consumir la API
  app.enableCors({ origin: true, credentials: true });

  // Validacion automatica de DTOs (class-validator)
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }),
  );

  const port = config.get<number>('PORT') ?? 3000;
  // 0.0.0.0 = accesible desde otros equipos de la red local (pruebas internas)
  await app.listen(port, '0.0.0.0');

  // Mostrar la(s) IP(s) de red local para compartir con el equipo
  const nets = require('os').networkInterfaces();
  const ips: string[] = [];
  for (const name of Object.keys(nets)) {
    for (const n of nets[name] ?? []) {
      if (n.family === 'IPv4' && !n.internal) ips.push(n.address);
    }
  }
  Logger.log(`NEXTOCK (frontend + API) en: http://localhost:${port}`, 'Bootstrap');
  ips.forEach((ip) => Logger.log(`  Acceso en red local: http://${ip}:${port}`, 'Bootstrap'));
}
bootstrap();
