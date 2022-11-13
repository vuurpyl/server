import { AuthorizationCredential } from '@common/enums';
import { CommunityPolicyFlag } from '@common/enums/community.policy.flag';
import { CommunityRole } from '@common/enums/community.role';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { CredentialDefinition } from '@domain/agent/credential/credential.definition';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { CommunityPolicy } from './community.policy.entity';
import { ICommunityPolicy } from './community.policy.interface';
import { ICommunityRolePolicy } from './community.policy.role.interface';

@Injectable()
export class CommunityPolicyService {
  constructor(
    @InjectRepository(CommunityPolicy)
    private communityPolicyRepository: Repository<CommunityPolicy>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createCommunityPolicy(
    member: ICommunityRolePolicy,
    lead: ICommunityRolePolicy
  ): Promise<ICommunityPolicy> {
    const policy: ICommunityPolicy = new CommunityPolicy(
      this.serializeRolePolicy(member),
      this.serializeRolePolicy(lead)
    );
    return await this.save(policy);
  }

  async removeCommunityPolicy(
    communityPolicy: ICommunityPolicy
  ): Promise<boolean> {
    await this.communityPolicyRepository.remove(
      communityPolicy as CommunityPolicy
    );
    return true;
  }

  async save(policy: ICommunityPolicy): Promise<ICommunityPolicy> {
    return await this.communityPolicyRepository.save(policy);
  }

  getCommunityRolePolicy(
    policy: ICommunityPolicy,
    role: CommunityRole
  ): ICommunityRolePolicy {
    switch (role) {
      case CommunityRole.MEMBER:
        return this.deserializeRolePolicy(policy.member);
        break;
      case CommunityRole.LEAD:
        return this.deserializeRolePolicy(policy.lead);
        break;

        throw new EntityNotInitializedException(
          `Unable to locate role for community policy: ${policy.id}`,
          LogContext.COMMUNITY
        );
    }
  }

  setFlag(policy: ICommunityPolicy, flag: CommunityPolicyFlag, value: boolean) {
    policy.flags.set(flag, value);
  }

  getFlag(policy: ICommunityPolicy, flag: CommunityPolicyFlag): boolean {
    const result = policy.flags.get(flag);
    if (result === undefined) {
      throw new EntityNotInitializedException(
        `Unable to locate flag for community policy: ${policy.id}, flag: ${flag}`,
        LogContext.COMMUNITY
      );
    }
    return result;
  }

  getParentMembershipCredential(
    policy: ICommunityPolicy
  ): ICredentialDefinition {
    const memberRolePolicy = this.getCommunityRolePolicy(
      policy,
      CommunityRole.MEMBER
    );

    // todo: not entirely safe...
    const parentCommunityCredential = memberRolePolicy.parentCredentials[0];
    return parentCommunityCredential;
  }

  getLeadCredentials(policy: ICommunityPolicy): ICredentialDefinition[] {
    const leadRolePolicy = this.getCommunityRolePolicy(
      policy,
      CommunityRole.LEAD
    );
    return [leadRolePolicy.credential, ...leadRolePolicy.parentCredentials];
  }

  // Todo: this is a bit of a hack...
  getAdminCredentials(policy: ICommunityPolicy): ICredentialDefinition[] {
    const leadCredentials = this.getLeadCredentials(policy);
    const adminCredentials: ICredentialDefinition[] = [];
    for (const leadCredential of leadCredentials) {
      const resourceID = leadCredential.resourceID;
      switch (leadCredential.type) {
        case AuthorizationCredential.HUB_HOST:
          adminCredentials.push({
            type: AuthorizationCredential.HUB_ADMIN,
            resourceID,
          });
          break;
        case AuthorizationCredential.CHALLENGE_LEAD:
          adminCredentials.push({
            type: AuthorizationCredential.CHALLENGE_ADMIN,
            resourceID,
          });
          break;
        case AuthorizationCredential.OPPORTUNITY_LEAD:
          adminCredentials.push({
            type: AuthorizationCredential.OPPORTUNITY_LEAD,
            resourceID,
          });
          break;
      }
    }
    return adminCredentials;
  }

  // Update the Community policy to have the right resource ID
  async updateCommunityPolicyResourceID(
    communityPolicy: ICommunityPolicy,
    resourceID: string
  ): Promise<ICommunityPolicy> {
    const memberPolicy = this.deserializeRolePolicy(communityPolicy.member);
    memberPolicy.credential.resourceID = resourceID;
    communityPolicy.member = this.serializeRolePolicy(memberPolicy);

    const leadPolicy = this.deserializeRolePolicy(communityPolicy.lead);
    leadPolicy.credential.resourceID = resourceID;
    communityPolicy.lead = this.serializeRolePolicy(leadPolicy);

    return this.save(communityPolicy);
  }

  async inheritParentCredentials(
    communityPolicyParent: ICommunityPolicy,
    communityPolicy: ICommunityPolicy
  ): Promise<ICommunityPolicy> {
    const memberPolicy = this.inheritParentRoleCredentials(
      communityPolicyParent.member,
      communityPolicy.member
    );
    const leadPolicy = this.inheritParentRoleCredentials(
      communityPolicyParent.lead,
      communityPolicy.lead
    );

    communityPolicy.member = this.serializeRolePolicy(memberPolicy);
    communityPolicy.lead = this.serializeRolePolicy(leadPolicy);

    return this.save(communityPolicy);
  }

  private inheritParentRoleCredentials(
    rolePolicyParentStr: string,
    rolePolicyStr: string
  ): ICommunityRolePolicy {
    const rolePolicyParent: ICommunityRolePolicy =
      this.deserializeRolePolicy(rolePolicyParentStr);
    const rolePolicy: ICommunityRolePolicy =
      this.deserializeRolePolicy(rolePolicyStr);
    rolePolicy.parentCredentials?.push(rolePolicyParent.credential);
    rolePolicyParent.parentCredentials?.forEach(c =>
      rolePolicy.parentCredentials?.push(c)
    );

    return rolePolicy;
  }

  private deserializeRolePolicy(rolePolicyStr: string): ICommunityRolePolicy {
    return JSON.parse(rolePolicyStr);
  }

  private serializeRolePolicy(rolePolicy: ICommunityRolePolicy): string {
    return JSON.stringify(rolePolicy);
  }

  getMembershipCredential(policy: ICommunityPolicy): CredentialDefinition {
    const rolePolicy = this.getCommunityRolePolicy(
      policy,
      CommunityRole.MEMBER
    );
    return rolePolicy.credential;
  }
}
