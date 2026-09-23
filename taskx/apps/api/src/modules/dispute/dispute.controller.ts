import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { DisputeService } from './dispute.service';
import { AuthGuard } from '@/common/guards/auth.guard';
import { DisputeResolution } from '@taskx/types';

@Controller('disputes')
@UseGuards(AuthGuard)
export class DisputeController {
  constructor(private readonly disputeService: DisputeService) {}

  @Post()
  async createDispute(
    @Req() req: any,
    @Body() body: { taskId: string; reason: string; evidence?: string[] },
  ) {
    return this.disputeService.createDispute(
      body.taskId,
      req.user.id,
      body.reason,
      body.evidence,
    );
  }

  @Post(':id/evidence')
  async addEvidence(
    @Req() req: any,
    @Param('id') disputeId: string,
    @Body() body: { evidence: string[] },
  ) {
    return this.disputeService.addEvidence(disputeId, req.user.id, body.evidence);
  }

  @Get(':id')
  async getDispute(@Param('id') disputeId: string) {
    return this.disputeService.getDisputeById(disputeId);
  }

  @Post('reviews')
  async createReview(
    @Req() req: any,
    @Body()
    body: {
      taskId: string;
      reviewedId: string;
      rating: number;
      comment?: string;
    },
  ) {
    return this.disputeService.createReview(
      body.taskId,
      req.user.id,
      body.reviewedId,
      body.rating,
      body.comment,
    );
  }

  @Get('reviews/task/:taskId')
  async getTaskReviews(@Param('taskId') taskId: string) {
    return this.disputeService.getTaskReviews(taskId);
  }

  @Get('reviews/user/:userId')
  async getUserReviews(@Param('userId') userId: string) {
    return this.disputeService.getUserReviews(userId);
  }
}
