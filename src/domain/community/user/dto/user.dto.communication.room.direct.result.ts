import { CommunicationMessageResult } from '@domain/communication/message/communication.dto.message.result';
import { CommunicationRoomResult } from '@domain/communication/room/communication.dto.room.result';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('DirectRoom')
export class DirectRoomResult extends CommunicationRoomResult {
  @Field(() => String, {
    nullable: true,
    description: 'The recepient userID',
  })
  receiverID?: string;

  @Field(() => String, {
    nullable: false,
    description: 'The identifier of the direct room',
  })
  id!: string;

  @Field(() => [CommunicationMessageResult], {
    nullable: false,
    description: 'The messages that have been sent to the Direct Room.',
  })
  messages!: CommunicationMessageResult[];
}
