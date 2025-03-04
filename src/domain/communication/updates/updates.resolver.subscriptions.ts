import { CurrentUser } from '@common/decorators/current-user.decorator';
import { SubscriptionType } from '@common/enums/subscription.type';
import { AgentInfo } from '@core/authentication/agent-info';
import { GraphqlGuard } from '@core/authorization';
import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Resolver, Subscription } from '@nestjs/graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PubSubEngine } from 'graphql-subscriptions';
import { CommunicationUpdateMessageReceived } from './dto/updates.dto.event.message.received';
import { LogContext } from '@common/enums/logging.context';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { UpdatesService } from './updates.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { SUBSCRIPTION_UPDATE_MESSAGE } from '@common/constants/providers';
import { UUID_LENGTH } from '@common/constants';
import { SubscriptionUserNotAuthenticated } from '@common/exceptions/subscription.user.not.authenticated';

@Resolver()
export class UpdatesResolverSubscriptions {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(SUBSCRIPTION_UPDATE_MESSAGE)
    private subscriptionUpdateMessage: PubSubEngine,
    private updatesService: UpdatesService,
    private authorizationService: AuthorizationService
  ) {}

  // Note: the resolving method should not be doing any heavy lifting.
  // Relies on users being cached for performance.
  @UseGuards(GraphqlGuard)
  @Subscription(() => CommunicationUpdateMessageReceived, {
    description:
      'Receive new Update messages on Communities the currently authenticated User is a member of.',
    async resolve(
      this: UpdatesResolverSubscriptions,
      value: CommunicationUpdateMessageReceived,
      _: any,
      context: any
    ): Promise<CommunicationUpdateMessageReceived> {
      const agentInfo = context.req?.user;
      const logMsgPrefix = `[User (${agentInfo.email}) Updates] - `;
      this.logger.verbose?.(
        `${logMsgPrefix} sending out event for Updates: ${value.updatesID} `,
        LogContext.SUBSCRIPTIONS
      );
      return value;
    },
    async filter(
      this: UpdatesResolverSubscriptions,
      payload: CommunicationUpdateMessageReceived,
      variables: any,
      context: any
    ) {
      const agentInfo = context.req?.user;
      const logMsgPrefix = `[User (${agentInfo.email}) Updates] - `;
      const updatesIDs: string[] = variables.updatesIDs;
      this.logger.verbose?.(
        `${logMsgPrefix}  Filtering event '${payload.eventID}'`,
        LogContext.SUBSCRIPTIONS
      );
      if (!updatesIDs) {
        // If subscribed to all then need to check on every update the authorization to see it
        this.logger.verbose?.(
          `${logMsgPrefix} Subscribed to all updates; filtering by Authorization to see ${payload.updatesID}`,
          LogContext.SUBSCRIPTIONS
        );
        const updates = await this.updatesService.getUpdatesOrFail(
          payload.updatesID
        );
        const filter = await this.authorizationService.isAccessGranted(
          agentInfo,
          updates.authorization,
          AuthorizationPrivilege.READ
        );
        this.logger.verbose?.(
          `${logMsgPrefix} Filter result: ${filter}`,
          LogContext.SUBSCRIPTIONS
        );
        return filter;
      } else {
        const inList = updatesIDs.includes(payload.updatesID);
        this.logger.verbose?.(
          `${logMsgPrefix} Filter result is ${inList}`,
          LogContext.SUBSCRIPTIONS
        );
        return inList;
      }
    },
  })
  async communicationUpdateMessageReceived(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      name: 'updatesIDs',
      type: () => [UUID],
      description:
        'The IDs of the Updates to subscribe to; if omitted subscribe to all Updates.',
      nullable: true,
    })
    updatesIDs: string[]
  ) {
    // Only allow subscriptions for logged in users
    if (agentInfo.userID.length !== UUID_LENGTH) {
      throw new SubscriptionUserNotAuthenticated(
        'Subscription attempted to Updates for non-authenticated user',
        LogContext.SUBSCRIPTIONS
      );
    }
    const logMsgPrefix = `[User (${agentInfo.email}) Updates] - `;
    if (updatesIDs) {
      this.logger.verbose?.(
        `${logMsgPrefix} Subscribing to the following updates: ${updatesIDs}`,
        LogContext.SUBSCRIPTIONS
      );
      for (const updatesID of updatesIDs) {
        // check the user has the READ privilege
        const updates = await this.updatesService.getUpdatesOrFail(updatesID);
        await this.authorizationService.grantAccessOrFail(
          agentInfo,
          updates.authorization,
          AuthorizationPrivilege.READ,
          `subscription to updates on: ${updates.displayName}`
        );
      }
    } else {
      this.logger.verbose?.(
        `${logMsgPrefix} Subscribing to all updates`,
        LogContext.SUBSCRIPTIONS
      );
      // Todo: either disable this option or find a way to do this once in this method and pass the resulting
      // array of discussionIDs to the filter call
    }

    return this.subscriptionUpdateMessage.asyncIterator(
      SubscriptionType.COMMUNICATION_UPDATE_MESSAGE_RECEIVED
    );
  }
}
