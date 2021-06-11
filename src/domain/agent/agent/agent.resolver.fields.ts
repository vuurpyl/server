import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { AgentService } from './agent.service';
import { AuthorizationPrivilege, ConfigurationTypes } from '@common/enums';
import { AuthorizationAgentPrivilege, Profiling } from '@common/decorators';
import { Agent, IAgent } from '@domain/agent/agent';
import { GraphqlGuard } from '@core/authorization';
import { VerifiedCredential } from '@src/services/platform/ssi/agent';
import { ConfigService } from '@nestjs/config';

@Resolver(() => IAgent)
export class AgentResolverFields {
  constructor(
    private configService: ConfigService,
    private agentService: AgentService
  ) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('verifiedCredentials', () => [VerifiedCredential], {
    nullable: true,
    description: 'The Verfied Credentials for this Agent.',
  })
  @Profiling.api
  async verifiedCredentials(
    @Parent() agent: Agent
  ): Promise<VerifiedCredential[]> {
    const ssiEnabled = this.configService.get(ConfigurationTypes.Identity).ssi
      .enabled;
    if (ssiEnabled) {
      return await this.agentService.getVerifiedCredentials(agent);
    }
    return [];
  }
}
