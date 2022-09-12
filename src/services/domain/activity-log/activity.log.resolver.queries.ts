import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Query } from '@nestjs/graphql';
import { ActivityLogService } from './activity.log.service';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { ActivityLogInput } from './dto/activity.log.dto.collaboration.input';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { AgentInfo } from '@core/authentication/agent-info';
import { IActivity } from '@src/platform/activity/activity.interface';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';

@Resolver()
export class ActivityLogResolverQueries {
  constructor(
    private activityLogService: ActivityLogService,
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private collaborationService: CollaborationService
  ) {}

  @UseGuards(GraphqlGuard)
  @Query(() => [IActivity], {
    nullable: false,
    description: 'Retrieve the ActivityLog for the specified Collaboration',
  })
  @Profiling.api
  async activityLogOnCollaboration(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('queryData', { type: () => ActivityLogInput, nullable: false })
    queryData: ActivityLogInput
  ): Promise<IActivity[]> {
    const collaboration =
      await this.collaborationService.getCollaborationOrFail(
        queryData.collaborationID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      collaboration.authorization,
      AuthorizationPrivilege.READ,
      `Collaboration activity query: ${agentInfo.email}`
    );
    return await this.activityLogService.activityLog(queryData, agentInfo);
  }
}
