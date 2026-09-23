import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { AuthGuard } from '@/common/guards/auth.guard';

@Controller('wallet')
@UseGuards(AuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  async getWallet(@Req() req: any) {
    return this.walletService.getWalletByUserId(req.user.id);
  }

  @Get('transactions')
  async getTransactions(@Req() req: any) {
    return this.walletService.getTransactionHistory(req.user.id);
  }

  @Post('deposit')
  async deposit(@Req() req: any, @Body() body: { amount: string; description?: string }) {
    return this.walletService.deposit(req.user.id, body.amount, body.description);
  }

  @Post('withdraw')
  async withdraw(@Req() req: any, @Body() body: { amount: string; description?: string }) {
    return this.walletService.withdraw(req.user.id, body.amount, body.description);
  }
}
