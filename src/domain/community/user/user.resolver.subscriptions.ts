import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthorizationPrivilege } from '@common/enums';
import { SubscriptionType } from '@common/enums/subscription.type';
import { AgentInfo } from '@core/authentication/agent-info';
import { GraphqlGuard } from '@core/authorization';
import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Resolver, Subscription } from '@nestjs/graphql';
import { CommunicationMessageReceived } from '@services/platform/communication/communication.dto.message.received';
import { RoomInvitationReceived } from '@services/platform/communication/communication.dto.room.invitation.received';
import { PUB_SUB } from '@services/platform/subscription/subscription.module';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UserService } from './user.service';
import { PubSubEngine } from 'graphql-subscriptions';
import { AuthorizationService } from '@core/authorization/authorization.service';

@Resolver()
export class UserResolverSubscriptions {
  constructor(
    private userService: UserService,
    private authorizationService: AuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(PUB_SUB) private pubSub: PubSubEngine
  ) {}

  @UseGuards(GraphqlGuard)
  @Subscription(() => CommunicationMessageReceived, {
    description:
      'Receive new messages for rooms the currently authenticated User is a member of.',
    async resolve(
      this: UserResolverSubscriptions,
      value: CommunicationMessageReceived
    ) {
      // Use this to update the sender identifer
      // Todo: should not be doing any heavy work during the resolving
      // The user is now cached so it should be better
      const user = await this.userService.getUserByCommunicationId(
        value.message.senderId
      );
      if (!user) {
        return new CommunicationMessageReceived();
      }

      // Note: we need to convert the senderId only
      // the value.userID should remain a matrix id
      value.message.senderId = user?.id;

      return value;
    },
    async filter(
      this: UserResolverSubscriptions,
      payload: CommunicationMessageReceived,
      _: any,
      context: any
    ) {
      // Note: by going through the passport authentication mechanism the "user" property on
      // the request will contain the AgentInfo that was authenticated.
      return payload.userID === context.req?.user?.communicationID;
    },
  })
  async messageReceived(@CurrentUser() agentInfo: AgentInfo) {
    const user = await this.userService.getUserOrFail(agentInfo.userID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      user.authorization,
      AuthorizationPrivilege.UPDATE,
      `subscribe to user message received events: ${user.displayName}`
    );
    return this.pubSub.asyncIterator(
      SubscriptionType.COMMUNICATION_MESSAGE_RECEIVED
    );
  }

  @Subscription(() => RoomInvitationReceived, {
    description: 'Receive new room invitations.',
    resolve: value => {
      return value;
    },
  })
  roomNotificationReceived() {
    return this.pubSub.asyncIterator(
      SubscriptionType.COMMUNICATION_ROOM_JOINED
    );
  }
}
