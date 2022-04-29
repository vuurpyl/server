import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Mutation } from '@nestjs/graphql';
import { CommunicationService } from './communication.service';
import { CurrentUser } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { IDiscussion } from '../discussion/discussion.interface';
import { CommunicationCreateDiscussionInput } from './dto/communication.dto.create.discussion';
import { DiscussionService } from '../discussion/discussion.service';
import { DiscussionAuthorizationService } from '../discussion/discussion.service.authorization';
import { ClientProxy } from '@nestjs/microservices';
import { EventType } from '@common/enums/event.type';
import { NotificationsPayloadBuilder } from '@core/microservices';
import {
  NOTIFICATIONS_SERVICE,
  SUBSCRIPTION_DISCUSSION_UPDATED,
} from '@common/constants/providers';
import { PubSubEngine } from 'graphql-subscriptions';
import { CommunicationDiscussionUpdated } from './dto/communication.dto.event.discussion.updated';
import { SubscriptionType } from '@common/enums/subscription.type';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Resolver()
export class CommunicationResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private communicationService: CommunicationService,
    private discussionAuthorizationService: DiscussionAuthorizationService,
    private discussionService: DiscussionService,
    private notificationsPayloadBuilder: NotificationsPayloadBuilder,
    @Inject(NOTIFICATIONS_SERVICE) private notificationsClient: ClientProxy,
    @Inject(SUBSCRIPTION_DISCUSSION_UPDATED)
    private readonly subscriptionDiscussionMessage: PubSubEngine,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IDiscussion, {
    description: 'Creates a new Discussion as part of this Communication.',
  })
  async createDiscussion(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('createData') createData: CommunicationCreateDiscussionInput
  ): Promise<IDiscussion> {
    const communication =
      await this.communicationService.getCommunicationOrFail(
        createData.communicationID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      communication.authorization,
      AuthorizationPrivilege.CREATE,
      `create discussion on communication: ${communication.id}`
    );

    const discussion = await this.communicationService.createDiscussion(
      createData,
      agentInfo.userID,
      agentInfo.communicationID
    );

    const savedDiscussion = await this.discussionService.save(discussion);
    await this.discussionAuthorizationService.applyAuthorizationPolicy(
      discussion,
      communication.authorization
    );

    // Emit the events to notify others
    const payload =
      await this.notificationsPayloadBuilder.buildCommunicationDiscussionCreatedNotificationPayload(
        discussion
      );
    this.notificationsClient.emit<number>(
      EventType.COMMUNICATION_DISCUSSION_CREATED,
      payload
    );

    // Send out the subscription event
    const eventID = `discussion-message-updated-${Math.floor(
      Math.random() * 100
    )}`;
    const subscriptionPayload: CommunicationDiscussionUpdated = {
      eventID: eventID,
      discussionID: discussion.id,
    };
    this.logger.verbose?.(
      `[Discussion updated] - event published: '${eventID}'`,
      LogContext.SUBSCRIPTIONS
    );
    this.subscriptionDiscussionMessage.publish(
      SubscriptionType.COMMUNICATION_DISCUSSION_UPDATED,
      subscriptionPayload
    );

    return savedDiscussion;
  }
}
