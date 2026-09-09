import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';

export interface LocationOption {
  id: number;
  name: string;
}

const CACHE_TTL_MS = 60 * 60 * 1000;

/** Reference data for address selection (il / ilçe / mahalle). Global, read-mostly, cached in memory. */
@Injectable()
export class LocationsService {
  private readonly cache = new Map<string, { value: LocationOption[]; at: number }>();

  constructor(private readonly prisma: PrismaService) {}

  provinces(): Promise<LocationOption[]> {
    return this.cached('provinces', () =>
      this.prisma.province.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    );
  }

  districts(provinceId: number): Promise<LocationOption[]> {
    return this.cached(`districts:${provinceId}`, () =>
      this.prisma.district.findMany({
        where: { provinceId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    );
  }

  neighborhoods(districtId: number): Promise<LocationOption[]> {
    return this.cached(`neighborhoods:${districtId}`, () =>
      this.prisma.neighborhood.findMany({
        where: { districtId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    );
  }

  /** Validates that province/district/neighborhood ids form a consistent chain. */
  async assertConsistent(
    provinceId?: number | null,
    districtId?: number | null,
    neighborhoodId?: number | null,
  ): Promise<boolean> {
    if (districtId) {
      const district = await this.prisma.district.findUnique({
        where: { id: districtId },
        select: { provinceId: true },
      });
      if (!district || (provinceId && district.provinceId !== provinceId)) return false;
    }
    if (neighborhoodId) {
      const neighborhood = await this.prisma.neighborhood.findUnique({
        where: { id: neighborhoodId },
        select: { districtId: true },
      });
      if (!neighborhood || (districtId && neighborhood.districtId !== districtId)) return false;
    }
    return true;
  }

  private async cached(
    key: string,
    load: () => Promise<LocationOption[]>,
  ): Promise<LocationOption[]> {
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
    const value = await load();
    this.cache.set(key, { value, at: Date.now() });
    return value;
  }
}
