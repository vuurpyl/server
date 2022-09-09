import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { Inject, UseGuards } from '@nestjs/common/decorators';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication';
import { CalloutService } from './callout.service';
import { IAspect } from '@domain/collaboration/aspect';
import {
  CalloutAspectCreatedPayload,
  CreateAspectOnCalloutInput,
  CreateCanvasOnCalloutInput,
  DeleteCalloutInput,
  UpdateCalloutInput,
} from '@domain/collaboration/callout/dto';
import { CanvasAuthorizationService } from '@domain/common/canvas/canvas.service.authorization';
import { AspectAuthorizationService } from '@domain/collaboration/aspect/aspect.service.authorization';
import { SubscriptionType } from '@common/enums/subscription.type';
import { ICanvas } from '@domain/common/canvas';
import {
  NOTIFICATIONS_SERVICE,
  SUBSCRIPTION_CALLOUT_ASPECT_CREATED,
  SUBSCRIPTION_CALLOUT_MESSAGE_CREATED,
} from '@common/constants';
import { ClientProxy } from '@nestjs/microservices';
import { PubSubEngine } from 'graphql-subscriptions';
import { NotificationsPayloadBuilder } from '@core/microservices';
import { EventType } from '@common/enums/event.type';
import { ICallout } from './callout.interface';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { CommunicationMessageResult } from '@domain/communication/message/communication.dto.message.result';
import {
  EntityNotInitializedException,
  getRandomId,
  NotSupportedException,
} from '@src/common';
import { CommentsService } from '@domain/communication/comments/comments.service';
import { SendMessageOnCalloutInput } from './dto/callout.args.message.created';
import { CalloutType } from '@common/enums/callout.type';
import { CalloutMessageReceivedPayload } from './dto/callout.message.received.payload';

@Resolver()
export class CalloutResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private calloutService: CalloutService,
    private commentsService: CommentsService,
    private canvasAuthorizationService: CanvasAuthorizationService,
    private aspectAuthorizationService: AspectAuthorizationService,
    @Inject(SUBSCRIPTION_CALLOUT_ASPECT_CREATED)
    private aspectCreatedSubscription: PubSubEngine,
    @Inject(SUBSCRIPTION_CALLOUT_MESSAGE_CREATED)
    private calloutMessageCreatedSubscription: PubSubEngine,
    private notificationsPayloadBuilder: NotificationsPayloadBuilder,
    @Inject(NOTIFICATIONS_SERVICE) private notificationsClient: ClientProxy
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICallout, {
    description: 'Delete a Callout.',
  })
  @Profiling.api
  async deleteCallout(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteCalloutInput
  ): Promise<ICallout> {
    const callout = await this.calloutService.getCalloutOrFail(deleteData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      callout.authorization,
      AuthorizationPrivilege.DELETE,
      `delete callout: ${callout.id}`
    );
    return await this.calloutService.deleteCallout(deleteData.ID);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => CommunicationMessageResult, {
    description: 'Send a message on a Comments Callout',
  })
  @Profiling.api
  async sendMessageOnCallout(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('data') data: SendMessageOnCalloutInput
  ): Promise<CommunicationMessageResult> {
    const callout = await this.calloutService.getCalloutOrFail(data.calloutID);

    if (callout.type !== CalloutType.COMMENTS) {
      throw new NotSupportedException(
        'Messages only supported on Comments Callout',
        LogContext.COLLABORATION
      );
    }

    const comments = await this.calloutService.getCommentsFromCallout(
      data.calloutID
    );

    if (!comments) {
      throw new EntityNotInitializedException(
        `Comments not initialized on Callout with ID ${data.calloutID}`,
        LogContext.COLLABORATION
      );
    }

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      comments.authorization,
      AuthorizationPrivilege.CREATE_COMMENT,
      `comments send message: ${comments.displayName}`
    );

    const commentSent = await this.commentsService.sendCommentsMessage(
      comments,
      agentInfo.communicationID,
      { message: data.message }
    );
    // build subscription payload
    const subscriptionPayload: CalloutMessageReceivedPayload = {
      eventID: `callout-comment-msg-${getRandomId()}`,
      calloutID: data.calloutID,
      commentsID: comments.id,
      message: commentSent,
    };
    // send the subscriptions event
    this.calloutMessageCreatedSubscription.publish(
      SubscriptionType.CALLOUT_MESSAGE_CREATED,
      subscriptionPayload
    );

    return commentSent;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICallout, {
    description: 'Update a Callout.',
  })
  @Profiling.api
  async updateCallout(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('calloutData') calloutData: UpdateCalloutInput
  ): Promise<ICallout> {
    const callout = await this.calloutService.getCalloutOrFail(calloutData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      callout.authorization,
      AuthorizationPrivilege.UPDATE,
      `update callout: ${callout.id}`
    );
    const result = await this.calloutService.updateCallout(calloutData);

    if (result.visibility === CalloutVisibility.PUBLISHED) {
      const payload =
        await this.notificationsPayloadBuilder.buildCalloutPublishedPayload(
          agentInfo.userID,
          result
        );

      this.notificationsClient.emit<number>(
        EventType.CALLOUT_PUBLISHED,
        payload
      );
    }

    return result;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IAspect, {
    description: 'Create a new Aspect on the Callout.',
  })
  @Profiling.api
  async createAspectOnCallout(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('aspectData') aspectData: CreateAspectOnCalloutInput
  ): Promise<IAspect> {
    const callout = await this.calloutService.getCalloutOrFail(
      aspectData.calloutID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      callout.authorization,
      AuthorizationPrivilege.CREATE_ASPECT,
      `create aspect on callout: ${callout.id}`
    );
    let aspect = await this.calloutService.createAspectOnCallout(
      aspectData,
      agentInfo.userID
    );
    aspect = await this.aspectAuthorizationService.applyAuthorizationPolicy(
      aspect,
      callout.authorization
    );
    const aspectCreatedEvent: CalloutAspectCreatedPayload = {
      eventID: `callout-aspect-created-${Math.round(Math.random() * 100)}`,
      calloutID: callout.id,
      aspect,
    };
    await this.aspectCreatedSubscription.publish(
      SubscriptionType.CALLOUT_ASPECT_CREATED,
      aspectCreatedEvent
    );

    const payload =
      await this.notificationsPayloadBuilder.buildAspectCreatedPayload(
        aspect.id
      );

    this.notificationsClient.emit<number>(EventType.ASPECT_CREATED, payload);

    return aspect;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICanvas, {
    description: 'Create a new Canvas on the Callout.',
  })
  @Profiling.api
  async createCanvasOnCallout(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('canvasData') canvasData: CreateCanvasOnCalloutInput
  ): Promise<ICanvas> {
    const callout = await this.calloutService.getCalloutOrFail(
      canvasData.calloutID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      callout.authorization,
      AuthorizationPrivilege.CREATE_CANVAS,
      `create canvas on callout: ${callout.id}`
    );
    const canvas = await this.calloutService.createCanvasOnCallout(
      canvasData,
      agentInfo.userID
    );
    return await this.canvasAuthorizationService.applyAuthorizationPolicy(
      canvas,
      callout.authorization
    );
  }
}
