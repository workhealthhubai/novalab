import { Injectable, NotImplementedException } from '@nestjs/common';

/**
 * Placeholder for OHS trainings (İSG eğitimleri).
 * TODO(business-logic): add Training / TrainingSession / TrainingAttendance models,
 * attendance tracking, certificate issuance and periodic renewal reminders.
 */
@Injectable()
export class TrainingsService {
  list(_tenantId: string): never {
    throw new NotImplementedException({
      message: 'Trainings are not implemented yet',
      errorCode: 'NOT_IMPLEMENTED',
    });
  }
}
