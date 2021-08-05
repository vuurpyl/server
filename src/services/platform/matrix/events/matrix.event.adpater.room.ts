import { CommunicationMessageReceived } from '@services/platform/communication/communication.dto.message.received';
import { convertFromMatrixMessage } from '@services/platform/communication/communication.dto.message.result';
import { RoomInvitationReceived } from '@services/platform/communication/communication.dto.room.invitation.received';
import {
  IMatrixEventHandler,
  RoomTimelineEvent,
} from '@src/services/platform/matrix/events/matrix.event.dispatcher';
import { MatrixRoom } from '../adapter-room/matrix.room';
import { MatrixRoomAdapterService } from '../adapter-room/matrix.room.adapter.service';
import { MatrixUserAdapterService } from '../adapter-user/matrix.user.adapter.service';
import { MatrixClient } from '../types/matrix.client.type';

const noop = function () {
  // empty
};

export class AutoAcceptRoomMembershipMonitorFactory {
  static create(
    client: MatrixClient,
    adapter: MatrixRoomAdapterService
  ): IMatrixEventHandler['roomMemberMembershipMonitor'] {
    return {
      complete: noop,
      error: noop,
      next: async ({ event, member }) => {
        const content = event.getContent();
        if (
          content.membership === 'invite' &&
          member.userId === client.credentials.userId
        ) {
          const roomId = event.getRoomId();
          const senderId = event.getSender();

          await client.joinRoom(roomId);
          if (content.is_direct) {
            await adapter.setDmRoom(client, roomId, senderId);
          }
        }
      },
    };
  }
}

export class RoomTimelineMonitorFactory {
  static create(
    matrixUserAdapterService: MatrixUserAdapterService,
    onMessageReceived: (event: CommunicationMessageReceived) => void
  ): IMatrixEventHandler['roomTimelineMonitor'] {
    return {
      complete: noop,
      error: noop,
      next: async ({ event, room }: RoomTimelineEvent) => {
        const message = convertFromMatrixMessage(
          event,
          matrixUserAdapterService.id2email.bind(matrixUserAdapterService)
        );

        if (message) {
          onMessageReceived({
            message,
            roomId: room.roomId,
          });
        }
      },
    };
  }
}

export class RoomMonitorFactory {
  static create(
    onMessageReceived: (event: RoomInvitationReceived) => void
  ): IMatrixEventHandler['roomMonitor'] {
    return {
      complete: noop,
      error: noop,
      next: async ({ room }: { room: MatrixRoom }) => {
        onMessageReceived({
          roomId: room?.roomId,
        });
      },
    };
  }
}
