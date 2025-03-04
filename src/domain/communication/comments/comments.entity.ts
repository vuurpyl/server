import { Entity } from 'typeorm';
import { IComments } from './comments.interface';
import { RoomableEntity } from '../room/roomable.entity';

@Entity()
export class Comments extends RoomableEntity implements IComments {
  constructor(communicationGroupID: string, displayName: string) {
    super(communicationGroupID, displayName);
  }
}
