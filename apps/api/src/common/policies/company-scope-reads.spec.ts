import { NotFoundException } from '@nestjs/common';
import { EmployeesRepository } from '@/modules/employees/employees.repository';
import { CompaniesRepository } from '@/modules/companies/companies.repository';
import { WorkplacesRepository } from '@/modules/workplaces/workplaces.repository';
import { AppointmentsRepository } from '@/modules/appointments/appointments.repository';
import { EmployeesService } from '@/modules/employees/employees.service';
import type { PrismaService } from '@/infrastructure/prisma/prisma.service';
import type { AuthenticatedUser } from '../interfaces';

const actor: AuthenticatedUser = {
  id: 'u',
  tenantId: 't',
  email: 'test@example.test',
  firstName: 'T',
  lastName: 'U',
  status: 'ACTIVE',
  roles: ['company_representative'],
  permissions: [],
  companyId: 'a',
  companyAccessActive: true,
};
function fixture() {
  const delegate = () => ({
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn().mockResolvedValue(null),
    count: jest.fn().mockResolvedValue(0),
  });
  const db = {
    employee: delegate(),
    company: delegate(),
    workplace: delegate(),
    appointment: delegate(),
    $transaction: jest
      .fn()
      .mockImplementation((queries: Promise<unknown>[]) => Promise.all(queries)),
  };
  const prisma = db as unknown as PrismaService;
  return {
    db,
    employees: new EmployeesRepository(prisma),
    companies: new CompaniesRepository(prisma),
    workplaces: new WorkplacesRepository(prisma),
    appointments: new AppointmentsRepository(prisma),
  };
}
describe('company scope at database boundaries', () => {
  it('scopes employee list, count and direct detail identically', async () => {
    const { db, employees } = fixture();
    await employees.findMany('t', 0, 20, { companyId: 'a', search: 'Other' });
    await employees.findById('t', 'foreign-employee', 'a');
    expect(db.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 't', companyId: 'a' }),
      }),
    );
    expect(db.employee.count).toHaveBeenCalledWith({
      where: db.employee.findMany.mock.calls[0]![0].where,
    });
    expect(db.employee.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'foreign-employee', tenantId: 't', deletedAt: null, companyId: 'a' },
      }),
    );
  });
  it('uses AND for a company detail ID so the URL cannot override the account company', async () => {
    const { db, companies, workplaces } = fixture();
    await companies.findById('t', 'b', 'a');
    await workplaces.findById('t', 'workplace-b', 'a');
    expect(db.company.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'b', AND: { id: 'a' } }) }),
    );
    expect(db.workplace.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'workplace-b', companyId: 'a' }),
      }),
    );
  });
  it('restricts appointments by both their company and current employee ownership', async () => {
    const { db, appointments } = fixture();
    await appointments.findMany('t', 0, 20, { companyId: 'a', employeeId: 'foreign' });
    expect(db.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 't',
          companyId: 'a',
          employeeId: 'foreign',
          OR: [
            { employeeId: null },
            { employee: { companyId: 'a', tenantId: 't', deletedAt: null } },
          ],
        }),
      }),
    );
  });
  it('passes the authenticated scope through the employee service and rejects foreign details', async () => {
    const { employees } = fixture();
    const service = new EmployeesService(
      employees,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(service.getForActor('t', actor, 'foreign')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
