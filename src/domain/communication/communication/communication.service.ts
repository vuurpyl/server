import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { ConfigurationTypes, LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import {
  Communication,
  ICommunication,
} from '@domain/communication/communication';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { ConfigService } from '@nestjs/config';
import { IDiscussion } from '../discussion/discussion.interface';
import { DiscussionService } from '../discussion/discussion.service';
import { CommunicationAdapter } from '@services/platform/communication-adapter/communication.adapter';
import { IUser } from '@domain/community/user/user.interface';
import { CommunicationCreateDiscussionInput } from './dto/communication.dto.create.discussion';
import { UpdatesService } from '../updates/updates.service';
import { IUpdates } from '../updates/updates.interface';

@Injectable()
export class CommunicationService {
  private communicationsEnabled = false;

  constructor(
    private configService: ConfigService,
    private discussionService: DiscussionService,
    private updatesService: UpdatesService,
    private communicationAdapter: CommunicationAdapter,
    @InjectRepository(Communication)
    private communicationRepository: Repository<Communication>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {
    // need both to be true
    this.communicationsEnabled = this.configService.get(
      ConfigurationTypes.COMMUNICATIONS
    )?.enabled;
  }

  async createCommunication(
    displayName: string,
    ecoverseID: string
  ): Promise<ICommunication> {
    const communication: ICommunication = new Communication(displayName);
    communication.authorization = new AuthorizationPolicy();
    communication.ecoverseID = ecoverseID;

    communication.discussions = [];

    // save to get the id assigned
    await this.save(communication);
    communication.communicationGroupID =
      await this.initializeCommunicationsGroup(communication);

    communication.updates = await this.updatesService.createUpdates(
      communication.communicationGroupID,
      `${displayName}-Updates`
    );

    return await this.communicationRepository.save(communication);
  }

  async initializeCommunicationsGroup(
    communication: ICommunication
  ): Promise<string> {
    if (!this.communicationsEnabled) {
      // not enabled, just return
      return '';
    }
    if (communication.communicationGroupID === '') {
      try {
        const communicationGroupID =
          await this.communicationAdapter.createCommunityGroup(
            communication.id,
            communication.displayName
          );
        return communicationGroupID;
      } catch (error) {
        this.logger.error?.(
          `Unable to initialize group for Communication (${communication.displayName}): ${error}`,
          LogContext.COMMUNICATION
        );
      }
    }
    return '';
  }

  async save(communication: ICommunication): Promise<ICommunication> {
    return await this.communicationRepository.save(communication);
  }

  async createDiscussion(
    discussionData: CommunicationCreateDiscussionInput,
    communicationUserID: string
  ): Promise<IDiscussion> {
    const title = discussionData.title;
    const communicationID = discussionData.communicationID;

    this.logger.verbose?.(
      `Adding discussion (${title}) to Communication (${communicationID})`,
      LogContext.COMMUNICATION
    );

    // Try to find the Communication
    const communication = await this.getCommunicationOrFail(communicationID);

    const discussion = await this.discussionService.createDiscussion(
      discussionData,
      communication.communicationGroupID,
      communicationUserID,
      `${communication.displayName}-discussion-${discussionData.title}`
    );

    const updates = this.getUpdates(communication);

    await this.communicationAdapter.replicateRoomMembership(
      discussion.communicationRoomID,
      updates.communicationRoomID
    );

    await this.discussionService.sendMessageToDiscussion(
      discussion,
      communicationUserID,
      {
        message: discussionData.message,
      }
    );
    communication.discussions?.push(discussion);
    await this.communicationRepository.save(communication);

    return discussion;
  }

  getDiscussions(communication: ICommunication): IDiscussion[] {
    if (!communication.discussions) {
      throw new EntityNotInitializedException(
        `Communication not initialized: ${communication.id}`,
        LogContext.COMMUNICATION
      );
    }
    return communication.discussions;
  }

  getUpdates(communication: ICommunication): IUpdates {
    if (!communication.updates) {
      throw new EntityNotInitializedException(
        `Communication not initialized, no Updates: ${communication.id}`,
        LogContext.COMMUNICATION
      );
    }
    return communication.updates;
  }

  async getCommunicationOrFail(
    communicationID: string,
    options?: FindOneOptions<Communication>
  ): Promise<ICommunication> {
    const communication = await this.communicationRepository.findOne(
      { id: communicationID },
      options
    );
    if (!communication)
      throw new EntityNotFoundException(
        `Unable to find Communication with ID: ${communicationID}`,
        LogContext.COMMUNICATION
      );
    return communication;
  }

  async removeCommunication(communicationID: string): Promise<boolean> {
    // Note need to load it in with all contained entities so can remove fully
    const communication = await this.getCommunicationOrFail(communicationID, {
      relations: ['discussions'],
    });

    // Remove all groups
    for (const discussion of this.getDiscussions(communication)) {
      await this.discussionService.removeDiscussion({
        ID: discussion.id,
      });
    }

    await this.updatesService.deleteUpdates(this.getUpdates(communication));

    await this.communicationRepository.remove(communication as Communication);
    return true;
  }

  async addUserToCommunications(
    communication: ICommunication,
    user: IUser
  ): Promise<boolean> {
    // get the list of rooms to add the user to
    const communicationRoomIDs: string[] = [
      this.getUpdates(communication).communicationRoomID,
    ];
    for (const discussion of this.getDiscussions(communication)) {
      communicationRoomIDs.push(discussion.communicationRoomID);
    }
    await this.communicationAdapter.grantUserAccesToRooms(
      communication.communicationGroupID,
      communicationRoomIDs,
      user.communicationID
    );

    return true;
  }

  async removeUserFromCommunications(
    communication: ICommunication,
    user: IUser
  ): Promise<boolean> {
    // get the list of rooms to add the user to
    const communicationRoomIDs: string[] = [
      this.getUpdates(communication).communicationRoomID,
    ];
    for (const discussion of this.getDiscussions(communication)) {
      communicationRoomIDs.push(discussion.communicationRoomID);
    }
    await this.communicationAdapter.removeUserFromRooms(
      communicationRoomIDs,
      user.communicationID
    );

    return true;
  }
}
