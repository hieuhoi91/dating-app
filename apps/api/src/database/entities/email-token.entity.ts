import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type EmailTokenType = 'verification' | 'password_reset';

@Entity({ name: 'email_tokens' })
@Index('email_tokens_hash_type_unique', ['tokenHash', 'type'], { unique: true })
@Index('email_tokens_user_type_idx', ['userId', 'type'])
export class EmailToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'token_hash', type: 'varchar', length: 64 })
  tokenHash!: string;

  @Column({ type: 'varchar', length: 24 })
  type!: EmailTokenType;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'consumed_at', type: 'timestamptz', nullable: true })
  consumedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
