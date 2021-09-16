import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { Repository } from 'typeorm';
import { AuthorizationPrivilege } from '@common/enums';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AuthorizationRuleCredential } from '@domain/common/authorization-policy/authorization.rule.credential';
import { EntityNotInitializedException } from '@common/exceptions';
import { IOrganizationVerification } from './organization.verification.interface';
import { OrganizationVerification } from './organization.verification.entity';

@Injectable()
export class OrganizationVerificationAuthorizationService {
  constructor(
    private authorizationPolicy: AuthorizationPolicyService,
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(OrganizationVerification)
    private organisationVerificationRepository: Repository<OrganizationVerification>
  ) {}

  async applyAuthorizationPolicy(
    organisationVerification: IOrganizationVerification
  ): Promise<IOrganizationVerification> {
    organisationVerification.authorization =
      await this.authorizationPolicyService.reset(
        organisationVerification.authorization
      );
    organisationVerification.authorization = this.appendCredentialRules(
      organisationVerification.authorization,
      organisationVerification.id
    );

    return await this.organisationVerificationRepository.save(
      organisationVerification
    );
  }

  private appendCredentialRules(
    authorization: IAuthorizationPolicy | undefined,
    organisationVerificationID: string
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for organisation verification: ${organisationVerificationID}`,
        LogContext.COMMUNITY
      );

    const newRules: AuthorizationRuleCredential[] = [];

    const globalAdmin = {
      type: AuthorizationCredential.GlobalAdmin,
      resourceID: '',
      grantedPrivileges: [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.GRANT,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
      ],
    };
    newRules.push(globalAdmin);

    const communityAdmin = {
      type: AuthorizationCredential.GlobalAdminCommunity,
      resourceID: '',
      grantedPrivileges: [
        AuthorizationPrivilege.GRANT,
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
      ],
    };
    newRules.push(communityAdmin);

    const updatedAuthorization =
      this.authorizationPolicy.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
