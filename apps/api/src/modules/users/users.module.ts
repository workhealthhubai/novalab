import { PasswordRecoveryService } from '@/modules/users/password-recovery.service';
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, PasswordRecoveryService],
  exports: [UsersService, UsersRepository, PasswordRecoveryService],
})
export class UsersModule {}
