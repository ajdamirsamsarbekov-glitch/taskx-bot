import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { TaskService } from './task.service';
import { AuthGuard } from '@/common/guards/auth.guard';
import { TaskCategory } from '@taskx/types';

@Controller('tasks')
@UseGuards(AuthGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  async createTask(
    @Req() req: any,
    @Body()
    body: {
      title: string;
      description: string;
      category: TaskCategory;
      price: string;
      deadline: string;
      location?: { latitude: number; longitude: number; address?: string };
      attachments?: string[];
    },
  ) {
    return this.taskService.createTask(req.user.id, {
      ...body,
      deadline: new Date(body.deadline),
    });
  }

  @Post(':id/publish')
  async publishTask(@Req() req: any, @Param('id') taskId: string) {
    return this.taskService.publishTask(taskId, req.user.id);
  }

  @Post(':id/assign')
  async assignTask(@Req() req: any, @Param('id') taskId: string) {
    return this.taskService.assignTask(taskId, req.user.id);
  }

  @Post(':id/start')
  async startTask(@Req() req: any, @Param('id') taskId: string) {
    return this.taskService.startTask(taskId, req.user.id);
  }

  @Post(':id/submit')
  async submitTask(@Req() req: any, @Param('id') taskId: string) {
    return this.taskService.submitTask(taskId, req.user.id);
  }

  @Post(':id/complete')
  async completeTask(@Req() req: any, @Param('id') taskId: string) {
    return this.taskService.completeTask(taskId, req.user.id);
  }

  @Post(':id/cancel')
  async cancelTask(@Req() req: any, @Param('id') taskId: string) {
    return this.taskService.cancelTask(taskId, req.user.id);
  }

  @Get()
  async getAvailableTasks(
    @Query('category') category?: TaskCategory,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
  ) {
    return this.taskService.getAvailableTasks({
      category,
      minPrice,
      maxPrice,
    });
  }

  @Get('my')
  async getMyTasks(@Req() req: any) {
    return this.taskService.getMyTasks(req.user.id);
  }

  @Get(':id')
  async getTask(@Param('id') taskId: string) {
    return this.taskService.getTaskById(taskId);
  }
}
