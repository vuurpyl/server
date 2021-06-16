import { AgentModule } from '@domain/agent/agent/agent.module';
import { CredentialModule } from '@domain/agent/credential/credential.module';
import { AuthorizationDefinition } from '@domain/common/authorization-definition';
import { UserModule } from '@domain/community/user/user.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationEngineModule } from '@src/services/platform/authorization-engine/authorization-engine.module';
import { AuthorizationResolverMutations } from './authorization.resolver.mutations';
import { AuthorizationResolverQueries } from './authorization.resolver.queries';
import { AuthorizationService } from './authorization.service';

@Module({
  imports: [
    AuthorizationEngineModule,
    AgentModule,
    UserModule,
    CredentialModule,
    TypeOrmModule.forFeature([AuthorizationDefinition]),
  ],
  providers: [
    AuthorizationService,
    AuthorizationResolverMutations,
    AuthorizationResolverQueries,
  ],
  exports: [AuthorizationService],
})
export class AuthorizationModule {}
