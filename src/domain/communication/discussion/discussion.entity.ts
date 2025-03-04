import { Column, Entity, ManyToOne } from 'typeorm';
import { IDiscussion } from './discussion.interface';
import { Communication } from '../communication/communication.entity';
import { RoomableEntity } from '../room/roomable.entity';

@Entity()
export class Discussion extends RoomableEntity implements IDiscussion {
  constructor(
    communicationGroupID: string,
    displayName: string,
    title?: string,
    description?: string,
    category?: string
  ) {
    super(communicationGroupID, displayName);
    this.title = title || '';
    this.category = category || '';
    this.description = description || '';
    this.commentsCount = 0;
    this.createdBy = '';
  }

  @Column('text', { nullable: false })
  title!: string;

  @Column('text', { nullable: false })
  category!: string;

  @Column('text', { nullable: false })
  description!: string;

  @Column('int', { nullable: false })
  commentsCount!: number;

  @Column('varchar', { length: 36, nullable: true })
  createdBy!: string;

  @ManyToOne(() => Communication, communication => communication.discussions, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  communication?: Communication;
}
