import { PasswordHelpDto, ResetPasswordDto } from '@/modules/users/dto/password-recovery.dto';
import { PasswordRecoveryService } from '@/modules/users/password-recovery.service';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser, Public, SkipAudit } from '@/common/decorators';
import {
  type AuthenticatedUser,
  extractRequestContext,
  type RequestWithUser,
} from '@/common/interfaces';
import { CompanySelfAccess } from '@/common/decorators/company-scoped.decorator';
import { parseCookies } from '@/common/utils/cookies';
import { AuthService, DICOMWEB_COOKIE } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('auth')
@SkipAudit() // login/refresh/logout are audited explicitly by AuthService (LOGIN, LOGIN_FAILED, LOGOUT, TOKEN_REUSE_DETECTED)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly recovery: PasswordRecoveryService,
  ) {}

  @Post('password-help')
  @Public()
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 3, ttl: 60 * 60_000 } })
  passwordHelp(@Body() dto: PasswordHelpDto) {
    return this.recovery.requestHelp(dto);
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60 * 60_000 } })
  resetPassword(@Body() dto: ResetPasswordDto, @Req() req: RequestWithUser) {
    return this.recovery.reset(dto, extractRequestContext(req));
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Exchange credentials for an access/refresh token pair' })
  login(@Body() dto: LoginDto, @Req() req: RequestWithUser) {
    return this.auth.login(dto, extractRequestContext(req));
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Rotate the refresh token and get a new access token' })
  refresh(@Body() dto: RefreshTokenDto, @Req() req: RequestWithUser) {
    return this.auth.refresh(dto.refreshToken, extractRequestContext(req));
  }

  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke the refresh session' })
  async logout(@Body() dto: RefreshTokenDto, @Req() req: RequestWithUser, @Res() res: Response) {
    await this.auth.logout(dto.refreshToken, extractRequestContext(req));
    res.clearCookie(DICOMWEB_COOKIE, { path: '/dicom-web' });
    res.status(HttpStatus.NO_CONTENT).send();
  }

  @Get('me')
  @CompanySelfAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current principal with roles and permissions' })
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  /**
   * Internal endpoint used by Nginx `auth_request` to gate `/dicom-web/*`.
   * Accepts the short-lived cookie issued by `POST /radiology/:id/viewer-session`.
   */
  @Get('verify-dicomweb')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Nginx auth_request endpoint for DICOMweb access (internal)' })
  async verifyDicomWeb(@Req() req: Request, @Res() res: Response): Promise<void> {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies[DICOMWEB_COOKIE];
    if (!token) throw new UnauthorizedException('Missing viewer session');
    try {
      const originalUri = req.headers['x-original-uri'];
      const originalMethod = req.headers['x-original-method'];
      if (typeof originalUri !== 'string' || typeof originalMethod !== 'string') {
        throw new Error('Missing original DICOMweb request metadata');
      }
      const payload = await this.auth.verifyDicomWebAccess(token, originalUri, originalMethod);
      res.setHeader('x-osgb-user-id', payload.sub);
      res.setHeader('x-osgb-tenant-id', payload.tid);
      res.setHeader('x-osgb-study-uid', payload.suid);
      res.status(HttpStatus.NO_CONTENT).send();
    } catch {
      throw new UnauthorizedException('Invalid viewer session');
    }
  }
}
