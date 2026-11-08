import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'profiles' })
@Index('profiles_username_unique', ['username'], { unique: true })
export class Profile {
  @PrimaryColumn('uuid', { name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  username!: string | null;

  @Column({ name: 'display_name', type: 'varchar', length: 80, default: '' })
  displayName!: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  gender!: string | null;

  @Column({ type: 'text', default: '' })
  bio!: string;

  @Column({ name: 'coarse_location', type: 'varchar', length: 120, nullable: true })
  coarseLocation!: string | null;

  @Column({
    name: 'verification_status',
    type: 'varchar',
    length: 24,
    default: 'unverified',
  })
  verificationStatus!: string;

  @Column({
    name: 'profile_visibility',
    type: 'varchar',
    length: 24,
    default: 'discoverable',
  })
  profileVisibility!: string;

  @Column({ name: 'cover_photo_id', type: 'uuid', nullable: true })
  coverPhotoId!: string | null;

  @Column({ name: 'is_complete', type: 'boolean', default: false })
  isComplete!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
