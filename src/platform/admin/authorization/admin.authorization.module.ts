import { AgentModule } from '@domain/agent/agent/agent.module';
import { CredentialModule } from '@domain/agent/credential/credential.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { UserModule } from '@domain/community/user/user.module';
import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AdminAuthorizationResolverMutations } from './admin.authorization.resolver.mutations';
import { AdminAuthorizationResolverQueries } from './admin.authorization.resolver.queries';
import { AdminAuthorizationService } from './admin.authorization.service';
import { PlatformAuthorizationModule } from '@src/platform/authorization/platform.authorization.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    AgentModule,
    UserModule,
    CredentialModule,
    PlatformAuthorizationModule,
  ],
  providers: [
    AdminAuthorizationService,
    AdminAuthorizationResolverMutations,
    AdminAuthorizationResolverQueries,
  ],
  exports: [AdminAuthorizationService],
})
export class AdminAuthorizationModule {}
