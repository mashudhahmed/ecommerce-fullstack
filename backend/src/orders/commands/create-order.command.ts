// src/orders/commands/create-order.command.ts
import { ICommand } from '@nestjs/cqrs';
import { CreateOrderDto } from '../dto/create-order.dto';

export class CreateOrderCommand implements ICommand {
  constructor(
    public readonly userId: number,
    public readonly data: CreateOrderDto,
    public readonly idempotencyKey?: string,
  ) {}
}