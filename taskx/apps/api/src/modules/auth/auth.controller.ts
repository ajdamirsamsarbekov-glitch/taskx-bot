import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('telegram')
  async authenticateTelegram(@Body() body: { initData: string }) {
    return this.authService.authenticateFromTelegram(body.initData);
  }
}
