import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { CommunicationModule } from '@domain/communication/communication/communication.module';
import { ApplicationModule } from '@domain/community/application/application.module';
import { UserGroupModule } from '@domain/community/user-group/user-group.module';
import { UserModule } from '@domain/community/user/user.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Community } from './community.entity';
import { CommunityLifecycleOptionsProvider } from './community.lifecycle.options.provider';
import { CommunityResolverFields } from './community.resolver.fields';
import { CommunityResolverMutations } from './community.resolver.mutations';
import { CommunityService } from './community.service';
import { CommunityAuthorizationService } from './community.service.authorization';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    AgentModule,
    UserGroupModule,
    UserModule,
    ApplicationModule,
    CommunicationModule,
    LifecycleModule,
    AgentModule,
    TypeOrmModule.forFeature([Community]),
  ],
  providers: [
    CommunityService,
    CommunityAuthorizationService,
    CommunityResolverMutations,
    CommunityResolverFields,
    CommunityLifecycleOptionsProvider,
  ],
  exports: [CommunityService, CommunityAuthorizationService],
})
export class CommunityModule {}
