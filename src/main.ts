import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ['http://localhost:3000', 'https://tournament-frontend-d48p.vercel.app'],
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 8080, () => console.log('Server started'));
}
bootstrap();
