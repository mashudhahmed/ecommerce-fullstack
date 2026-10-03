// backend/src/chat/chat.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @ApiOperation({ summary: 'Send message to vendor or customer' })
  @Post('send')
  async sendMessage(
    @Request() req: { user: { id: number } },
    @Body()
    body: {
      recipientId: number;
      content: string;
      orderId?: number;
      productId?: number;
    },
  ) {
    return this.chatService.sendMessage(
      req.user.id,
      body.recipientId,
      body.content,
      body.orderId,
      body.productId,
    );
  }

  @ApiOperation({ summary: 'Get active conversation thread with a user' })
  @Get('conversation/:partnerId')
  async getConversation(
    @Request() req: { user: { id: number } },
    @Param('partnerId', ParseIntPipe) partnerId: number,
  ) {
    return this.chatService.getConversation(req.user.id, partnerId);
  }

  @ApiOperation({ summary: 'Get all active message threads for current user' })
  @Get('threads')
  async getThreads(@Request() req: { user: { id: number } }) {
    return this.chatService.getConversationsList(req.user.id);
  }

  @ApiOperation({ summary: 'Get unread message count' })
  @Get('unread-count')
  async getUnreadCount(@Request() req: { user: { id: number } }) {
    return this.chatService.getUnreadCount(req.user.id);
  }
}
