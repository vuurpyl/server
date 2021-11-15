import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege, Profiling } from '@src/common/decorators';
import { IOpportunity, Opportunity } from '@domain/collaboration/opportunity';
import { OpportunityService } from './opportunity.service';
import { IRelation } from '@domain/collaboration/relation';
import { ILifecycle } from '@domain/common/lifecycle';
import { IContext } from '@domain/context/context';
import { ICommunity } from '@domain/community/community';
import { INVP } from '@domain/common/nvp/nvp.interface';
import { AuthorizationPrivilege } from '@common/enums';
import { UseGuards } from '@nestjs/common/decorators';
import { GraphqlGuard } from '@core/authorization';

@Resolver(() => IOpportunity)
export class OpportunityResolverFields {
  constructor(private opportunityService: OpportunityService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('relations', () => [IRelation], {
    nullable: true,
    description: 'The set of Relations within the context of this Opportunity.',
  })
  @Profiling.api
  async relations(@Parent() opportunity: Opportunity) {
    return await this.opportunityService.getRelations(opportunity);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('lifecycle', () => ILifecycle, {
    nullable: true,
    description: 'The lifeycle for the Opportunity.',
  })
  @Profiling.api
  async lifecycle(@Parent() opportunity: Opportunity) {
    return await this.opportunityService.getLifecycle(opportunity.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('community', () => ICommunity, {
    nullable: true,
    description: 'The community for the Opportunity.',
  })
  @Profiling.api
  async community(@Parent() opportunity: Opportunity) {
    return await this.opportunityService.getCommunity(opportunity.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('context', () => IContext, {
    nullable: true,
    description: 'The context for the Opportunity.',
  })
  @Profiling.api
  async context(@Parent() opportunity: Opportunity) {
    return await this.opportunityService.getContext(opportunity.id);
  }

  @ResolveField('activity', () => [INVP], {
    nullable: true,
    description: 'The activity within this Opportunity.',
  })
  @Profiling.api
  async activity(@Parent() opportunity: Opportunity) {
    return await this.opportunityService.getActivity(opportunity);
  }

  @ResolveField('parentId', () => String, {
    nullable: true,
    description: 'The parent entity (challenge) ID.',
  })
  @Profiling.api
  async parentID(@Parent() opportunity: Opportunity) {
    const opp = await this.opportunityService.getOpportunityOrFail(
      opportunity.id,
      {
        relations: ['challenge'],
      }
    );
    return opp.challenge?.id;
  }

  @ResolveField('parentNameID', () => String, {
    nullable: true,
    description: 'The parent entity name (challenge) ID.',
  })
  @Profiling.api
  async parentNameID(@Parent() opportunity: Opportunity) {
    const opp = await this.opportunityService.getOpportunityOrFail(
      opportunity.id,
      {
        relations: ['challenge'],
      }
    );
    return opp.challenge?.nameID;
  }
}
