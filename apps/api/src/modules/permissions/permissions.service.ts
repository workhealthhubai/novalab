import { Injectable } from '@nestjs/common';
import { PERMISSION_DEFINITIONS } from '@osgb/shared-types';
import type { Permission as PermissionRecord } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<PermissionRecord[]> {
    return this.prisma.permission.findMany({ orderBy: [{ category: 'asc' }, { key: 'asc' }] });
  }

  /** Upserts the permission catalogue from @osgb/shared-types (idempotent). */
  async syncCatalogue(): Promise<number> {
    let count = 0;
    for (const def of PERMISSION_DEFINITIONS) {
      await this.prisma.permission.upsert({
        where: { key: def.key },
        create: {
          key: def.key,
          category: def.category,
          description: def.description,
          isMedical: def.medical ?? false,
        },
        update: {
          category: def.category,
          description: def.description,
          isMedical: def.medical ?? false,
        },
      });
      count += 1;
    }
    return count;
  }
}
