import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CommunicationRemoveUpdateMessageInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The communication the message is being removed from to',
  })
  communicationID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The message id that should be removed',
  })
  messageID!: string;
}
