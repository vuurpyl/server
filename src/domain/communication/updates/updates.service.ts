import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { RoomService } from '../room/room.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { Updates } from './updates.entity';
import { IUpdates } from './updates.interface';
import { CommunicationRoomResult } from '../room/communication.dto.room.result';
import { RoomRemoveMessageInput } from '../room/dto/room.dto.remove.message';
import { RoomSendMessageInput } from '../room/dto/room.dto.send.message';
import { CommunicationAdapter } from '@services/platform/communication-adapter/communication.adapter';

@Injectable()
export class UpdatesService {
  constructor(
    @InjectRepository(Updates)
    private updatesRepository: Repository<Updates>,
    private roomService: RoomService,
    private communicationAdapter: CommunicationAdapter
  ) {}

  async createUpdates(
    communicationGroupID: string,
    displayName: string
  ): Promise<IUpdates> {
    const updates = new Updates(communicationGroupID, displayName);
    updates.authorization = new AuthorizationPolicy();
    updates.communicationRoomID =
      await this.roomService.initializeCommunicationRoom(updates);
    return await this.updatesRepository.save(updates);
  }

  async getUpdatesOrFail(updatesID: string): Promise<IUpdates> {
    const updates = await this.updatesRepository.findOne({
      id: updatesID,
    });
    if (!updates)
      throw new EntityNotFoundException(
        `Not able to locate Updates with the specified ID: ${updatesID}`,
        LogContext.COMMUNICATION
      );
    return updates;
  }

  async deleteUpdates(updates: IUpdates): Promise<IUpdates> {
    const result = await this.updatesRepository.remove(updates as Updates);
    await this.communicationAdapter.removeRoom(updates.communicationRoomID);
    await this.roomService.removeRoom(updates);
    result.id = updates.id;
    return result;
  }

  async save(updates: IUpdates): Promise<IUpdates> {
    return await this.updatesRepository.save(updates);
  }

  async getUpdatesRoom(
    updates: IUpdates,
    communicationUserID: string
  ): Promise<CommunicationRoomResult> {
    return await this.roomService.getCommunicationRoom(
      updates,
      communicationUserID
    );
  }

  async sendUpdateMessage(
    updates: IUpdates,
    communicationUserID: string,
    messageData: RoomSendMessageInput
  ): Promise<string> {
    await this.communicationAdapter.grantUserAccesToRooms(
      updates.communicationGroupID,
      [updates.communicationRoomID],
      communicationUserID
    );
    return await this.roomService.sendMessage(
      updates,
      communicationUserID,
      messageData
    );
  }

  async removeUpdateMessage(
    updates: IUpdates,
    communicationUserID: string,
    messageData: RoomRemoveMessageInput
  ) {
    return await this.roomService.removeMessage(
      updates,
      communicationUserID,
      messageData
    );
  }
}
