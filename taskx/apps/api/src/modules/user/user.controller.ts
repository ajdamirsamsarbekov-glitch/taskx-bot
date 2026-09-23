import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '@/common/guards/auth.guard';

@Controller('users')
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  async getProfile(@Req() req: any) {
    return this.userService.getUserById(req.user.id);
  }

  @Get(':id')
  async getUserProfile(@Req() req: any) {
    return this.userService.getUserById(req.params.id);
  }
}
