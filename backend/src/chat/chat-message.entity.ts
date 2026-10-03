// backend/src/chat/chat-message.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../user/user.entity';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @Index()
  sender!: User;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @Index()
  recipient!: User;

  @Column({ type: 'text' })
  content!: string;

  @Column({ nullable: true })
  orderId?: number;

  @Column({ nullable: true })
  productId?: number;

  @Column({ default: false })
  isRead!: boolean;

  @CreateDateColumn()
  @Index()
  createdAt!: Date;
}
