import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { ClientProxy } from '@nestjs/microservices';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { IReference } from '@domain/common/reference';
import { ContextService } from '@domain/context/context/context.service';
import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common/decorators';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication';
import { CreateReferenceOnContextInput } from '@domain/context/context/dto/context.dto.create.reference';
import { ReferenceService } from '@domain/common/reference/reference.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CreateCanvasOnContextInput } from './dto/context.dto.create.canvas';
import { ICanvas } from '@domain/common/canvas';
import { CanvasAuthorizationService } from '@domain/common/canvas/canvas.service.authorization';
import { DeleteCanvasOnContextInput } from './dto/context.dto.delete.canvas';
import { AspectAuthorizationService } from '../aspect/aspect.service.authorization';
import { CreateAspectOnContextInput } from './dto/context.dto.create.aspect';
import { IAspect } from '../aspect/aspect.interface';
import { PubSubEngine } from 'graphql-subscriptions';
import { SubscriptionType } from '@common/enums/subscription.type';
import { ContextAspectCreated } from '@domain/context/context/dto/context.dto.event.aspect.created';
import { Inject } from '@nestjs/common';
import {
  NOTIFICATIONS_SERVICE,
  SUBSCRIPTION_CONTEXT_ASPECT_CREATED,
} from '@src/common/constants/providers';
import { NotificationsPayloadBuilder } from '@core/microservices';
import { EventType } from '@common/enums/event.type';

@Resolver()
export class ContextResolverMutations {
  constructor(
    private referenceService: ReferenceService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private authorizationService: AuthorizationService,
    private canvasAuthorizationService: CanvasAuthorizationService,
    private aspectAuthorizationService: AspectAuthorizationService,
    private contextService: ContextService,
    @Inject(SUBSCRIPTION_CONTEXT_ASPECT_CREATED)
    private aspectCreatedSubscription: PubSubEngine,
    private notificationsPayloadBuilder: NotificationsPayloadBuilder,
    @Inject(NOTIFICATIONS_SERVICE) private notificationsClient: ClientProxy
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IReference, {
    description: 'Creates a new Reference on the specified Context.',
  })
  @Profiling.api
  async createReferenceOnContext(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('referenceInput') referenceInput: CreateReferenceOnContextInput
  ): Promise<IReference> {
    const context = await this.contextService.getContextOrFail(
      referenceInput.contextID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      context.authorization,
      AuthorizationPrivilege.CREATE,
      `create reference on context: ${context.id}`
    );
    const reference = await this.contextService.createReference(referenceInput);
    reference.authorization =
      await this.authorizationPolicyService.inheritParentAuthorization(
        reference.authorization,
        context.authorization
      );
    return await this.referenceService.saveReference(reference);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IAspect, {
    description: 'Create a new Aspect on the Context.',
  })
  @Profiling.api
  async createAspectOnContext(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('aspectData') aspectData: CreateAspectOnContextInput
  ): Promise<IAspect> {
    const context = await this.contextService.getContextOrFail(
      aspectData.contextID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      context.authorization,
      AuthorizationPrivilege.CREATE_ASPECT,
      `create aspect on context: ${context.id}`
    );
    let aspect = await this.contextService.createAspect(
      aspectData,
      agentInfo.userID
    );
    aspect = await this.aspectAuthorizationService.applyAuthorizationPolicy(
      aspect,
      context.authorization
    );
    const aspectCreatedEvent: ContextAspectCreated = {
      eventID: `context-aspect-created-${Math.round(Math.random() * 100)}`,
      contextID: context.id,
      aspect,
    };
    await this.aspectCreatedSubscription.publish(
      SubscriptionType.CONTEXT_ASPECT_CREATED,
      aspectCreatedEvent
    );

    const payload =
      await this.notificationsPayloadBuilder.buildAspectCreatedPayload(aspect);

    this.notificationsClient.emit<number>(EventType.ASPECT_CREATED, payload);

    return aspect;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICanvas, {
    description: 'Create a new Canvas on the Context.',
  })
  @Profiling.api
  async createCanvasOnContext(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('canvasData') canvasData: CreateCanvasOnContextInput
  ): Promise<ICanvas> {
    const context = await this.contextService.getContextOrFail(
      canvasData.contextID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      context.authorization,
      AuthorizationPrivilege.CREATE_CANVAS,
      `create canvas on context: ${context.id}`
    );
    const canvas = await this.contextService.createCanvas(canvasData);
    return await this.canvasAuthorizationService.applyAuthorizationPolicy(
      canvas,
      context.authorization
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICanvas, {
    description: 'Deletes the specified Canvas.',
  })
  async deleteCanvasOnContext(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteCanvasOnContextInput
  ): Promise<ICanvas> {
    const canvas = await this.contextService.getCanvasOnContextOrFail(
      deleteData.contextID,
      deleteData.canvasID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      canvas.authorization,
      AuthorizationPrivilege.DELETE,
      `delete canvas: ${canvas.id}`
    );
    return await this.contextService.deleteCanvas(deleteData.canvasID);
  }
}
