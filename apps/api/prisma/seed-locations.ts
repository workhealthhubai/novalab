/* eslint-disable no-console */
/**
 * Loads Turkish provinces + districts from the bundled data file and, optionally, all
 * neighborhoods from api.turkiyeapi.dev (public dataset, paginated). Idempotent.
 *
 *   pnpm --filter @osgb/api prisma:seed:locations                  # provinces + districts
 *   LOCATIONS_FETCH_NEIGHBORHOODS=true pnpm --filter @osgb/api prisma:seed:locations
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

loadEnv({
  path: [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')],
  quiet: true,
});

interface ProvinceRecord {
  id: number;
  name: string;
  districts: Array<{ id: number; name: string }>;
}

interface NeighborhoodRecord {
  id: number;
  districtId: number;
  name: string;
}

const NEIGHBORHOODS_API =
  process.env.LOCATIONS_NEIGHBORHOODS_URL ?? 'https://api.turkiyeapi.dev/v1/neighborhoods';
const PAGE = 1000;

export async function seedLocations(
  prisma: PrismaClient,
  options: { neighborhoods: boolean },
): Promise<void> {
  const provinces = JSON.parse(
    readFileSync(resolve(__dirname, 'data/provinces-districts.json'), 'utf8'),
  ) as ProvinceRecord[];
  for (const province of provinces) {
    await prisma.province.upsert({
      where: { id: province.id },
      create: { id: province.id, name: province.name },
      update: { name: province.name },
    });
  }
  const districts = provinces.flatMap((p) =>
    p.districts.map((d) => ({ id: d.id, provinceId: p.id, name: d.name })),
  );
  await prisma.district.createMany({ data: districts, skipDuplicates: true });
  console.log(`✔ ${provinces.length} provinces, ${districts.length} districts`);

  if (!options.neighborhoods) return;
  const knownDistricts = new Set(districts.map((d) => d.id));
  let offset = 0;
  let imported = 0;
  for (;;) {
    const response = await fetch(`${NEIGHBORHOODS_API}?limit=${PAGE}&offset=${offset}`, {
      headers: { 'User-Agent': 'osgb-platform-seed' },
    });
    if (!response.ok) throw new Error(`Neighborhood fetch failed: HTTP ${response.status}`);
    const page = ((await response.json()) as { data?: NeighborhoodRecord[] }).data ?? [];
    if (page.length === 0) break;
    const rows = page
      .filter((n) => knownDistricts.has(n.districtId))
      .map((n) => ({ id: n.id, districtId: n.districtId, name: n.name }));
    await prisma.neighborhood.createMany({ data: rows, skipDuplicates: true });
    imported += rows.length;
    offset += PAGE;
    if (page.length < PAGE) break;
  }
  console.log(`✔ ${imported} neighborhoods`);
}

if (require.main === module) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  seedLocations(prisma, { neighborhoods: process.env.LOCATIONS_FETCH_NEIGHBORHOODS === 'true' })
    .then(() => prisma.$disconnect())
    .catch(async (error: unknown) => {
      console.error('Location seed failed:', error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
