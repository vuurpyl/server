import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { getConnection, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums/logging.context';
import { ActivityService } from '@src/platform/activity/activity.service';
import { ActivityEventType } from '@common/enums/activity.event.type';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { SubscriptionPublishService } from '../../subscriptions/subscription-publish-service';
import { ActivityInputCalloutPublished } from './dto/activity.dto.input.callout.published';
import { ActivityInputAspectCreated } from './dto/activity.dto.input.aspect.created';
import { ActivityInputCanvasCreated } from './dto/activity.dto.input.canvas.created';
import { ActivityInputMemberJoined } from './dto/activity.dto.input.member.joined';
import { ActivityInputAspectComment } from './dto/activity.dto.input.aspect.comment';
import { ActivityInputCalloutDiscussionComment } from './dto/activity.dto.input.callout.discussion.comment';
import { ActivityInputChallengeCreated } from './dto/activity.dto.input.challenge.created';
import { ActivityInputOpportunityCreated } from './dto/activity.dto.input.opportunity.created';
import { ActivityInputUpdateSent } from './dto/activity.dto.input.update.sent';
import { Community } from '@domain/community/community/community.entity';

@Injectable()
export class ActivityAdapter {
  constructor(
    private activityService: ActivityService,
    @InjectRepository(Community)
    private communityRepository: Repository<Community>,
    @InjectRepository(Callout)
    private calloutRepository: Repository<Callout>,
    @InjectRepository(Collaboration)
    private collaborationRepository: Repository<Collaboration>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly graphqlSubscriptionService: SubscriptionPublishService
  ) {}

  public async challengeCreated(
    eventData: ActivityInputChallengeCreated
  ): Promise<boolean> {
    this.logger.verbose?.(
      `Event received: ${JSON.stringify(eventData)}`,
      LogContext.ACTIVITY
    );

    const challenge = eventData.challenge;

    if (!challenge.hubID) {
      throw new EntityNotInitializedException(
        `Unable to get hubID of Challenge: ${challenge.id}`,
        LogContext.ACTIVITY
      );
    }

    const collaborationID = await this.getCollaborationIdForHub(
      challenge.hubID
    );
    const description = challenge.displayName;

    const activity = await this.activityService.createActivity({
      collaborationID,
      triggeredBy: eventData.triggeredBy,
      resourceID: challenge.id,
      parentID: challenge.hubID,
      description,
      type: ActivityEventType.CHALLENGE_CREATED,
    });

    this.graphqlSubscriptionService.publishActivity(collaborationID, activity);

    return true;
  }

  public async opportunityCreated(
    eventData: ActivityInputOpportunityCreated
  ): Promise<boolean> {
    this.logger.verbose?.(
      `Event received: ${JSON.stringify(eventData)}`,
      LogContext.ACTIVITY
    );

    const opportunity = eventData.opportunity;

    const collaborationID = await this.getCollaborationIdForChallenge(
      eventData.challengeId
    );
    const description = opportunity.displayName;

    const activity = await this.activityService.createActivity({
      collaborationID,
      triggeredBy: eventData.triggeredBy,
      resourceID: opportunity.id,
      parentID: eventData.challengeId,
      description,
      type: ActivityEventType.OPPORTUNITY_CREATED,
    });

    this.graphqlSubscriptionService.publishActivity(collaborationID, activity);

    return true;
  }

  public async calloutPublished(
    eventData: ActivityInputCalloutPublished
  ): Promise<boolean> {
    this.logger.verbose?.(
      `Event received: ${JSON.stringify(eventData)}`,
      LogContext.ACTIVITY
    );
    const callout = eventData.callout;
    const collaborationID = await this.getCollaborationIdForCallout(callout.id);
    const description = `[${callout.displayName}] - ${callout.description}`;
    const activity = await this.activityService.createActivity({
      collaborationID,
      triggeredBy: eventData.triggeredBy,
      resourceID: callout.id,
      parentID: collaborationID,
      description: description,
      type: ActivityEventType.CALLOUT_PUBLISHED,
    });

    this.graphqlSubscriptionService.publishActivity(collaborationID, activity);

    return true;
  }

  public async aspectCreated(
    eventData: ActivityInputAspectCreated
  ): Promise<boolean> {
    this.logger.verbose?.(
      `Event received: ${JSON.stringify(eventData)}`,
      LogContext.ACTIVITY
    );

    const aspect = eventData.aspect;
    const description = `[${aspect.displayName}] - ${aspect.profile?.description}`;
    const collaborationID = await this.getCollaborationIdForAspect(aspect.id);
    const activity = await this.activityService.createActivity({
      triggeredBy: eventData.triggeredBy,
      collaborationID,
      resourceID: aspect.id,
      parentID: eventData.callout.id,
      description: description,
      type: ActivityEventType.CARD_CREATED,
    });

    this.graphqlSubscriptionService.publishActivity(collaborationID, activity);

    return true;
  }

  public async aspectComment(
    eventData: ActivityInputAspectComment
  ): Promise<boolean> {
    this.logger.verbose?.(
      `Event received: ${JSON.stringify(eventData)}`,
      LogContext.ACTIVITY
    );

    const aspectID = eventData.aspect.id;
    const calloutID = await this.getCalloutIdForAspect(aspectID);
    const collaborationID = await this.getCollaborationIdForCallout(calloutID);
    const activity = await this.activityService.createActivity({
      triggeredBy: eventData.triggeredBy,
      collaborationID,
      resourceID: aspectID,
      parentID: calloutID,
      description: eventData.message,
      type: ActivityEventType.CARD_COMMENT,
    });

    this.graphqlSubscriptionService.publishActivity(collaborationID, activity);

    return true;
  }

  public async canvasCreated(
    eventData: ActivityInputCanvasCreated
  ): Promise<boolean> {
    this.logger.verbose?.(
      `Event received: ${JSON.stringify(eventData)}`,
      LogContext.ACTIVITY
    );
    const canvas = eventData.canvas;
    const collaborationID = await this.getCollaborationIdForCanvas(canvas.id);

    const description = `[${canvas.displayName}]`;
    const activity = await this.activityService.createActivity({
      triggeredBy: eventData.triggeredBy,
      collaborationID,
      resourceID: canvas.id,
      parentID: eventData.callout.id,
      description: description,
      type: ActivityEventType.CANVAS_CREATED,
    });

    this.graphqlSubscriptionService.publishActivity(collaborationID, activity);

    return true;
  }

  public async calloutCommentCreated(
    eventData: ActivityInputCalloutDiscussionComment
  ): Promise<boolean> {
    this.logger.verbose?.(
      `Event received: ${JSON.stringify(eventData)}`,
      LogContext.ACTIVITY
    );

    const collaborationID = await this.getCollaborationIdForCallout(
      eventData.callout.id
    );

    const activity = await this.activityService.createActivity({
      triggeredBy: eventData.triggeredBy,
      collaborationID,
      resourceID: eventData.callout.id,
      parentID: collaborationID,
      description: eventData.message,
      type: ActivityEventType.DISCUSSION_COMMENT,
    });

    this.graphqlSubscriptionService.publishActivity(collaborationID, activity);

    return true;
  }

  public async memberJoined(
    eventData: ActivityInputMemberJoined
  ): Promise<boolean> {
    this.logger.verbose?.(
      `Event received: ${JSON.stringify(eventData)}`,
      LogContext.ACTIVITY
    );
    const community = eventData.community;
    const collaborationID = await this.getCollaborationIdFromCommunity(
      community.id
    );
    const description = `[${community.type}] '${eventData.user.displayName}'`;
    const activity = await this.activityService.createActivity({
      triggeredBy: eventData.triggeredBy,
      collaborationID,
      resourceID: eventData.user.id, // the user that joined
      parentID: community.id, // the community that was joined
      description: description,
      type: ActivityEventType.MEMBER_JOINED,
    });

    this.graphqlSubscriptionService.publishActivity(collaborationID, activity);

    return true;
  }

  public async updateSent(
    eventData: ActivityInputUpdateSent
  ): Promise<boolean> {
    this.logger.verbose?.(
      `Event received: ${JSON.stringify(eventData)}`,
      LogContext.ACTIVITY
    );
    const updates = eventData.updates;
    const communityID = await this.getCommunityIdFromUpdates(updates.id);
    const collaborationID = await this.getCollaborationIdFromCommunity(
      communityID
    );

    const activity = await this.activityService.createActivity({
      triggeredBy: eventData.triggeredBy,
      collaborationID,
      resourceID: updates.id,
      parentID: communityID,
      description: eventData.message,
      type: ActivityEventType.UPDATE_SENT,
    });

    this.graphqlSubscriptionService.publishActivity(collaborationID, activity);

    return true;
  }

  private async getCollaborationIdForHub(hubID: string): Promise<string> {
    const [result]: { collaborationId: string }[] = await getConnection().query(
      `
          SELECT collaboration.id as collaborationId FROM collaboration
          LEFT JOIN hub ON hub.collaborationId = collaboration.id
          WHERE hub.id = '${hubID}'
        `
    );

    if (!result) {
      throw new EntityNotFoundException(
        `Unable to identify Collaboration for Hub with ID: ${hubID}`,
        LogContext.ACTIVITY
      );
    }

    return result.collaborationId;
  }

  private async getCollaborationIdForChallenge(
    challengeID: string
  ): Promise<string> {
    const [result]: { collaborationId: string }[] = await getConnection().query(
      `
          SELECT collaboration.id as collaborationId FROM collaboration
          LEFT JOIN challenge ON challenge.collaborationId = collaboration.id
          WHERE challenge.id = '${challengeID}'
        `
    );

    if (!result) {
      throw new EntityNotFoundException(
        `Unable to identify Collaboration for Challenge with ID: ${challengeID}`,
        LogContext.ACTIVITY
      );
    }

    return result.collaborationId;
  }

  private async getCollaborationIdForCallout(
    calloutID: string
  ): Promise<string> {
    const collaboration = await this.collaborationRepository
      .createQueryBuilder('collaboration')
      .innerJoinAndSelect('collaboration.callouts', 'callout')
      .where('callout.id = :id')
      .setParameters({ id: `${calloutID}` })
      .getOne();
    if (!collaboration) {
      throw new EntityNotFoundException(
        `Unable to identify Collaboration for Canvas with ID: ${calloutID}`,
        LogContext.ACTIVITY
      );
    }
    return collaboration.id;
  }

  private async getCalloutIdForAspect(aspectID: string): Promise<string> {
    const callout = await this.calloutRepository
      .createQueryBuilder('callout')
      .innerJoinAndSelect('callout.aspects', 'aspect')
      .where('aspect.id = :id')
      .setParameters({ id: `${aspectID}` })
      .getOne();
    if (!callout) {
      throw new EntityNotFoundException(
        `Unable to identify Callout for Aspect with ID: ${aspectID}`,
        LogContext.ACTIVITY
      );
    }
    return callout.id;
  }

  private async getCollaborationIdForAspect(aspectID: string): Promise<string> {
    const collaboration = await this.collaborationRepository
      .createQueryBuilder('collaboration')
      .leftJoinAndSelect('collaboration.callouts', 'callouts')
      .innerJoinAndSelect('callouts.aspects', 'aspect')
      .where('aspect.id = :id')
      .setParameters({ id: `${aspectID}` })
      .getOne();
    if (!collaboration) {
      throw new EntityNotFoundException(
        `Unable to identify Collaboration for Canvas with ID: ${aspectID}`,
        LogContext.ACTIVITY
      );
    }
    return collaboration.id;
  }

  private async getCollaborationIdForCanvas(canvasID: string): Promise<string> {
    const collaboration = await this.collaborationRepository
      .createQueryBuilder('collaboration')
      .leftJoinAndSelect('collaboration.callouts', 'callouts')
      .innerJoinAndSelect('callouts.canvases', 'canvas')
      .where('canvas.id = :id')
      .setParameters({ id: `${canvasID}` })
      .getOne();
    if (!collaboration) {
      throw new EntityNotFoundException(
        `Unable to identify Collaboration for Canvas with ID: ${canvasID}`,
        LogContext.ACTIVITY
      );
    }
    return collaboration.id;
  }

  private async getCollaborationIdFromCommunity(communityId: string) {
    const [result]: {
      collaborationId: string;
    }[] = await getConnection().query(
      `
        SELECT collaborationId from \`hub\`
        WHERE \`hub\`.\`communityId\` = '${communityId}' UNION

        SELECT collaborationId from \`challenge\`
        WHERE \`challenge\`.\`communityId\` = '${communityId}' UNION

        SELECT collaborationId from \`opportunity\`
        WHERE \`opportunity\`.\`communityId\` = '${communityId}';
      `
    );
    if (!result) {
      this.logger.error(
        `Unable to identify Collaboration for provided communityID: ${communityId}`,
        LogContext.COMMUNITY
      );
      return '';
    }
    return result.collaborationId;
  }

  private async getCommunityIdFromUpdates(updatesID: string) {
    const community = await this.communityRepository
      .createQueryBuilder('community')
      .leftJoinAndSelect('community.communication', 'communication')
      .leftJoinAndSelect('communication.updates', 'updates')
      .where('updates.id = :updatesID')
      .setParameters({
        updatesID: `${updatesID}`,
      })
      .getOne();
    if (!community) {
      this.logger.error(
        `Unable to identify Community for provided updates: ${updatesID}`,
        LogContext.COMMUNITY
      );
      return '';
    }
    return community.id;
  }
}
