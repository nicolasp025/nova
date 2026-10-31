import {
  Controller,
  ExecutionContext,
  Get,
  HttpStatus,
  Injectable,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';
import { AuthUser, JwtAuthGuard } from './jwt.guard';

const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const NEXUS_LOGIN_COOKIE_MAX_AGE_MS = 10 * 60 * 1000;

@Injectable()
export class NexusGoogleLoginGuard extends AuthGuard('google') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const nexusUrl = process.env.NEXUS_URL;
    if (!nexusUrl) {
      throw new Error('NEXUS_URL must be configured for Nexus Google login');
    }

    const response = context.switchToHttp().getResponse<Response>();
    response.cookie('nexus_google_login', '1', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: NEXUS_LOGIN_COOKIE_MAX_AGE_MS,
      path: '/api/auth/google/callback',
    });
    return super.canActivate(context);
  }
}

@Controller('auth')
export class AuthController {
  constructor(private readonly jwtService: JwtService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {
    // passport redirects to Google; nothing to do here.
  }

  @Get('google/nexus')
  @UseGuards(NexusGoogleLoginGuard)
  nexusGoogleLogin() {
    // The guard marks this OAuth flow so the callback can return to Nexus.
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as AuthUser;
    const token = await this.jwtService.signAsync({ email: user.email });
    const cookieDomain = process.env.AUTH_COOKIE_DOMAIN;

    res.clearCookie('access_token', { path: '/' });
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE_MS,
      path: '/',
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    });

    const nexusLogin = req.cookies?.nexus_google_login === '1';
    res.clearCookie('nexus_google_login', {
      path: '/api/auth/google/callback',
    });
    res.redirect(
      nexusLogin && process.env.NEXUS_URL
        ? process.env.NEXUS_URL
        : (process.env.FRONTEND_URL ?? '/'),
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request) {
    return req.user;
  }

  @Post('logout')
  logout(@Res() res: Response) {
    res.clearCookie('access_token', { path: '/' });
    if (process.env.AUTH_COOKIE_DOMAIN) {
      res.clearCookie('access_token', {
        domain: process.env.AUTH_COOKIE_DOMAIN,
        path: '/',
      });
    }
    res.status(HttpStatus.NO_CONTENT).send();
  }
}
