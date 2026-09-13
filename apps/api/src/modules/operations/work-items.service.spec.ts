import { WorkItemsService } from './work-items.service';
describe('work items', () => {
  const setup = () => {
    const model = () => ({
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    });
    const db = {
      employee: model(),
      examination: model(),
      protocolItem: model(),
      $transaction: jest.fn().mockImplementation((rows: unknown[]) => Promise.all(rows)),
    };
    return { db, service: new WorkItemsService(db as never) };
  };
  it('only includes pending items on active visits and paginates before presenting', async () => {
    const { db, service } = setup();
    await service.pending('tenant-a', { page: 2, pageSize: 10 });
    expect(db.protocolItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        where: expect.objectContaining({
          tenantId: 'tenant-a',
          status: 'PENDING',
          protocol: expect.objectContaining({ status: { in: ['OPEN', 'IN_PROGRESS'] } }),
        }),
      }),
    );
    expect(db.protocolItem.count.mock.calls[0]![0].where).toEqual(
      db.protocolItem.findMany.mock.calls[0]![0].where,
    );
  });
  it('does not include approved or cancelled reports', async () => {
    const { db, service } = setup();
    await service.reports('tenant-a', { page: 1, pageSize: 10 });
    expect(db.examination.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-a',
          status: { in: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'] },
        }),
      }),
    );
  });
  it('returns missing field names without exposing identity values', async () => {
    const { db, service } = setup();
    db.employee.findMany.mockResolvedValue([
      {
        id: 'employee',
        firstName: 'Test',
        lastName: 'User',
        nationalId: 'sensitive',
        birthDate: null,
        companyId: null,
        createdAt: new Date(),
      },
    ]);
    const result = await service.missing('tenant-a', { page: 1, pageSize: 10 });
    expect(result.items[0]!.reasons).toEqual(['Doğum tarihi eksik', 'Firma atanmamış']);
    expect(JSON.stringify(result)).not.toContain('sensitive');
  });
});
