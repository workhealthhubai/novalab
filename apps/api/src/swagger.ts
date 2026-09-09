import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication, apiPrefix: string): string {
  const config = new DocumentBuilder()
    .setTitle('OSGB Platform API')
    .setDescription(
      'Multi-tenant occupational health & safety platform. All business endpoints require a Bearer access token; ' +
        'the active tenant is derived from the token, never from request input.',
    )
    .setVersion('0.1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();
  const document = SwaggerModule.createDocument(app, config);
  const path = `${apiPrefix}/docs`;
  SwaggerModule.setup(path, app, document, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'OSGB Platform API',
  });
  return path;
}
