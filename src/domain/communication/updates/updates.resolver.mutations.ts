import { Inject, UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Mutation } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UpdatesService } from './updates.service';
import { UpdatesSendMessageInput } from './dto/updates.dto.send.message';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { UpdatesRemoveMessageInput } from './dto/updates.dto.remove.message';
import { MessageID } from '@domain/common/scalars';
import { CommunicationMessageResult } from '../message/communication.dto.message.result';
import { EventType } from '@common/enums/event.type';
import { NOTIFICATIONS_SERVICE } from '@core/microservices/microservices.module';
import { ClientProxy } from '@nestjs/microservices';
import { NotificationsPayloadBuilder } from '@core/microservices';

@Resolver()
export class UpdatesResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private updatesService: UpdatesService,
    private notificationsPayloadBuilder: NotificationsPayloadBuilder,
    @Inject(NOTIFICATIONS_SERVICE) private notificationsClient: ClientProxy
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => CommunicationMessageResult, {
    description:
      'Sends an update message. Returns the id of the new Update message.',
  })
  @Profiling.api
  async sendUpdate(
    @Args('messageData') messageData: UpdatesSendMessageInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<CommunicationMessageResult> {
    const updates = await this.updatesService.getUpdatesOrFail(
      messageData.updatesID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      updates.authorization,
      AuthorizationPrivilege.UPDATE,
      `updates send message: ${updates.displayName}`
    );

    const payload =
      await this.notificationsPayloadBuilder.buildCommunicationUpdateSentNotificationPayload(
        agentInfo.userID,
        updates
      );

    this.notificationsClient.emit<number>(
      EventType.COMMUNICATION_UPDATE_SENT,
      payload
    );

    return await this.updatesService.sendUpdateMessage(
      updates,
      agentInfo.communicationID,
      messageData
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => MessageID, {
    description: 'Removes an update message.',
  })
  @Profiling.api
  async removeUpdate(
    @Args('messageData') messageData: UpdatesRemoveMessageInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<string> {
    const updates = await this.updatesService.getUpdatesOrFail(
      messageData.updatesID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      updates.authorization,
      AuthorizationPrivilege.UPDATE,
      `communication send message: ${updates.displayName}`
    );
    return await this.updatesService.removeUpdateMessage(
      updates,
      agentInfo.communicationID,
      messageData
    );
  }
}
