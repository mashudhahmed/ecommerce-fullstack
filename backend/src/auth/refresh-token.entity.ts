// auth/refresh-token.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../user/user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  tokenHash!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @Column()
  userId!: number;

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @Column({ default: false })
  revoked!: boolean;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  ipAddress?: string;

  @CreateDateColumn()
  createdAt!: Date;
}