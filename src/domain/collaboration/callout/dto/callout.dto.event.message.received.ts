import { CommunicationMessageResult } from '@domain/communication/message/communication.dto.message.result';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('CalloutCommentsMessageReceived')
export class CalloutCommentsMessageReceived {
  // To identify the event
  eventID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The identifier for the Callout.',
  })
  calloutID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The identifier for the Comments.',
  })
  commentsID!: string;

  @Field(() => CommunicationMessageResult, {
    nullable: false,
    description: 'The message that has been sent.',
  })
  message!: CommunicationMessageResult;
}
