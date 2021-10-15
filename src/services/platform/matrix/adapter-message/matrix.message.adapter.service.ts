import { LogContext } from '@common/enums';
import { CommunicationMessageResult } from '@domain/common/communication/communication.dto.message.result';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MatrixRoomResponseMessage } from '../adapter-room/matrix.room.dto.response.message';

@Injectable()
export class MatrixMessageAdapterService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  convertFromMatrixMessage(
    message: MatrixRoomResponseMessage,
    receiverMatrixID: string
  ): CommunicationMessageResult {
    const { event, sender } = message;

    // need to use getContent - should be able to resolve the edited value if any
    const content = message.getContent();
    // if (!content.body) {
    //   return;
    // }

    // these are used to detect whether a message is a replacement one
    // const isRelation = message.isRelation('m.replace');
    // const mRelatesTo = message.getWireContent()['m.relates_to'];

    return {
      message: content.body,
      sender: sender.userId,
      timestamp: event.origin_server_ts || 0,
      id: event.event_id || '',
      receiverID: receiverMatrixID,
    };
  }

  isMessageToIgnore(message: MatrixRoomResponseMessage): boolean {
    const event = message.event;
    // Only handle events that are for messages (more in there)
    if (event.type !== 'm.room.message') {
      this.logger.verbose?.(
        `[MessageAction] Ignorning message of type: ${event.type} as it is not m.room.message type `,
        LogContext.COMMUNICATION
      );
      return true;
    }
    // Want to ignore acknowledgements
    // if (event.event_id?.indexOf(event.room_id || '') !== -1) {
    //   this.logger.verbose?.(
    //     `[MessageAction] Identified as temporary: ${event.type} - ${event.event_id}`,
    //     LogContext.COMMUNICATION
    //   );
    //   //return true;
    // }
    this.logger.verbose?.(
      `[MessageAction] Processing message with type: ${event.type} - ${event.event_id}`,
      LogContext.COMMUNICATION
    );
    return false;
  }
}
