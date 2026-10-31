import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController, NexusGoogleLoginGuard } from './auth.controller';
import { GoogleStrategy } from './google.strategy';
import { JwtAuthGuard } from './jwt.guard';

const jwtModule = JwtModule.register({
  secret: process.env.JWT_SECRET,
  signOptions: { expiresIn: '30d' },
});

@Module({
  imports: [PassportModule, jwtModule],
  controllers: [AuthController],
  providers: [GoogleStrategy, JwtAuthGuard, NexusGoogleLoginGuard],
  // Re-export JwtModule too: JwtAuthGuard's own JwtService dependency must
  // be resolvable in whichever module imports AuthModule to use the guard.
  exports: [JwtAuthGuard, jwtModule],
})
export class AuthModule {}
