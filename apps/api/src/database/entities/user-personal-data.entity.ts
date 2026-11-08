import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'private', name: 'user_personal_data' })
export class UserPersonalData {
  @PrimaryColumn('uuid', { name: 'user_id' })
  userId!: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth!: string | null;

  @Column({ type: 'double precision', nullable: true })
  latitude!: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude!: number | null;
}
