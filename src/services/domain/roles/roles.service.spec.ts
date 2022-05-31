import { MockApplicationService } from '@test/mocks/application.service.mock';
import { MockChallengeService } from '@test/mocks/challenge.service.mock';
import { MockCommunityService } from '@test/mocks/community.service.mock';
import { MockHubService } from '@test/mocks/hub.service.mock';
import { MockOpportunityService } from '@test/mocks/opportunity.service.mock';
import { MockOrganizationService } from '@test/mocks/organization.service.mock';
import { MockUserGroupService } from '@test/mocks/user.group.service.mock';
import { MockUserService } from '@test/mocks/user.service.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { Test } from '@nestjs/testing';
import { RolesService } from './roles.service';
import { UserService } from '@domain/community/user/user.service';
import { HubService } from '@domain/challenge/hub/hub.service';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { OpportunityService } from '@domain/collaboration/opportunity/opportunity.service';
import { ApplicationService } from '@domain/community/application/application.service';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { CommunityService } from '@domain/community/community/community.service';
import { testData } from '@test/utils';

describe('RolesService', () => {
  let rolesService: RolesService;
  let userService: UserService;
  let hubService: HubService;
  let challengeSerivce: ChallengeService;
  let opportunityService: OpportunityService;
  let applicationService: ApplicationService;
  let organizationService: OrganizationService;
  let communityService: CommunityService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        MockUserService,
        MockUserGroupService,
        MockHubService,
        MockChallengeService,
        MockApplicationService,
        MockCommunityService,
        MockOpportunityService,
        MockOrganizationService,
        MockWinstonProvider,
        RolesService,
      ],
    }).compile();

    rolesService = moduleRef.get<RolesService>(RolesService);
    userService = moduleRef.get<UserService>(UserService);
    opportunityService = moduleRef.get<OpportunityService>(OpportunityService);
    challengeSerivce = moduleRef.get<ChallengeService>(ChallengeService);
    hubService = moduleRef.get<HubService>(HubService);
    applicationService = moduleRef.get<ApplicationService>(ApplicationService);
    organizationService =
      moduleRef.get<OrganizationService>(OrganizationService);
    communityService = moduleRef.get<CommunityService>(CommunityService);
  });

  it('should be defined', () => {
    expect(rolesService).toBeDefined();
  });

  describe('User Roles', () => {
    it('Should get user roles', async () => {
      jest
        .spyOn(userService, 'getUserWithAgent')
        .mockResolvedValue(testData.user);

      jest
        .spyOn(hubService, 'getHubOrFail')
        .mockResolvedValue(testData.hub as any);

      jest
        .spyOn(challengeSerivce, 'getChallengeOrFail')
        .mockResolvedValue(testData.challenge as any);

      jest
        .spyOn(organizationService, 'getOrganizationOrFail')
        .mockResolvedValue(testData.organization as any);

      jest
        .spyOn(opportunityService, 'getOpportunityOrFail')
        .mockResolvedValue(testData.opportunity as any);

      jest
        .spyOn(applicationService, 'findApplicationsForUser')
        .mockResolvedValue(testData.applications as any);

      jest
        .spyOn(applicationService, 'isFinalizedApplication')
        .mockResolvedValue(false);

      jest
        .spyOn(applicationService, 'getApplicationState')
        .mockResolvedValue('new');

      jest.spyOn(communityService, 'isHubCommunity').mockResolvedValue(true);

      const res = await rolesService.getUserRoles({
        userID: testData.user.id,
      });

      expect(res.applications).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            communityID: testData.rolesUser.applications[0].communityID,
            hubID: testData.rolesUser.applications[0].hubID,
          }),
        ])
      );

      expect(res.organizations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            organizationID: testData.organization.id,
          }),
        ])
      );

      expect(res.hubs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            hubID: testData.hub.id,
          }),
        ])
      );
    });
  });

  describe('Organization Roles', () => {
    it('Should get organization roles', async () => {
      jest
        .spyOn(organizationService, 'getOrganizationAndAgent')
        .mockResolvedValue({
          organization: testData.organization as any,
          agent: testData.agent,
        });

      jest
        .spyOn(hubService, 'getHubOrFail')
        .mockResolvedValue(testData.hub as any);

      jest
        .spyOn(challengeSerivce, 'getChallengeOrFail')
        .mockResolvedValue(testData.challenge as any);

      jest
        .spyOn(organizationService, 'getOrganizationOrFail')
        .mockResolvedValue(testData.organization as any);

      jest
        .spyOn(opportunityService, 'getOpportunityOrFail')
        .mockResolvedValue(testData.opportunity as any);

      const res = await rolesService.getOrganizationRoles({
        organizationID: testData.organization.id,
      });

      expect(res.hubs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            hubID: testData.hub.id,
          }),
        ])
      );
    });
  });
});
