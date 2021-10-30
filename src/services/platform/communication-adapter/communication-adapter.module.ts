import { Module } from '@nestjs/common';
import { MatrixAgentPoolModule } from '@src/services/platform/matrix/agent-pool/matrix.agent.pool.module';
import { MatrixUserManagementModule } from '@src/services/platform/matrix/management/matrix.user.management.module';
import { MatrixGroupAdapterModule } from '../matrix/adapter-group/matrix.group.adapter.module';
import { MatrixRoomAdapterModule } from '../matrix/adapter-room/matrix.room.adapter.module';
import { MatrixAgentModule } from '../matrix/agent/matrix.agent.module';
import { MatrixUserAdapterModule } from '../matrix/adapter-user/matrix.user.adapter.module';
import { CommunicationAdapter } from './communication.adapter';
import { SubscriptionModule } from '../subscription/subscription.module';
import { MatrixMessageAdapterModule } from '../matrix/adapter-message/matrix.message.adapter.module';

@Module({
  imports: [
    MatrixUserManagementModule,
    MatrixUserAdapterModule,
    MatrixRoomAdapterModule,
    MatrixGroupAdapterModule,
    MatrixMessageAdapterModule,
    MatrixAgentModule,
    MatrixAgentPoolModule,
    SubscriptionModule,
  ],
  providers: [CommunicationAdapter],
  exports: [CommunicationAdapter],
})
export class CommunicationAdapterModule {}
