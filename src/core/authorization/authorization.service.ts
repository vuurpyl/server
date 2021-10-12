import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ICredential } from '@domain/agent/credential/credential.interface';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@common/exceptions';
import { ConfigurationTypes, LogContext } from '@common/enums';
import { AgentInfo } from '@core/authentication';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyRuleCredential } from './authorization.policy.rule.credential';
import { AuthorizationPolicyRuleVerifiedCredential } from './authorization.policy.rule.verified.credential';

@Injectable()
export class AuthorizationService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private configService: ConfigService
  ) {}

  grantAccessOrFail(
    agentInfo: AgentInfo,
    authorization: IAuthorizationPolicy | undefined,
    privilegeRequired: AuthorizationPrivilege,
    msg: string
  ) {
    if (this.isAuthenticationDisabled()) return true;

    const auth = this.validateAuthorization(authorization);
    if (this.isAccessGranted(agentInfo, auth, privilegeRequired)) return true;

    const errorMsg = `Authorization: unable to grant '${privilegeRequired}' privilege: ${msg}`;
    this.logCredentialCheckFailDetails(errorMsg, agentInfo, auth);

    // If get to here then no match was found
    throw new ForbiddenException(errorMsg, LogContext.AUTH);
  }

  grantReadAccessOrFail(
    agentInfo: AgentInfo,
    authorization: IAuthorizationPolicy | undefined,
    msg: string
  ) {
    this.grantAccessOrFail(
      agentInfo,
      authorization,
      AuthorizationPrivilege.READ,
      msg
    );
  }

  logCredentialCheckFailDetails(
    errorMsg: string,
    agentInfo: AgentInfo,
    authorization: IAuthorizationPolicy
  ) {
    const msg = `${errorMsg}; agentInfo: ${
      agentInfo.email
    } has credentials '${JSON.stringify(
      agentInfo.credentials,
      this.replacer
    )}'; authorization definition: anonymousAccess=${
      authorization?.anonymousReadAccess
    } & rules: ${authorization?.credentialRules}`;
    this.logger.verbose?.(msg, LogContext.AUTH);
  }

  logAgentInfo(agentInfo: AgentInfo) {
    this.logger.verbose?.(
      `AgentInfo: '${agentInfo.email}' has credentials '${JSON.stringify(
        agentInfo.credentials,
        this.replacer
      )}'`,
      LogContext.AUTH
    );
  }

  // Utility function to avoid having a bunch of fields that are not relevant on log output for credentials logging.
  replacer = (key: any, value: any) => {
    if (key == 'createdDate') return undefined;
    else if (key == 'updatedDate') return undefined;
    else if (key == 'version') return undefined;
    else if (key == 'id') return undefined;
    else return value;
  };

  validateAuthorization(
    authorization: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new ForbiddenException(
        'Authorization: no definition provided',
        LogContext.AUTH
      );
    return authorization;
  }

  isAccessGranted(
    agentInfo: AgentInfo,
    authorization: IAuthorizationPolicy | undefined,
    privilegeRequired: AuthorizationPrivilege
  ): boolean {
    if (!authorization) throw new Error();
    if (
      authorization.anonymousReadAccess &&
      privilegeRequired === AuthorizationPrivilege.READ
    )
      return true;

    const credentialRules: AuthorizationPolicyRuleCredential[] =
      this.convertCredentialRulesStr(authorization.credentialRules);
    for (const rule of credentialRules) {
      for (const credential of agentInfo.credentials) {
        if (
          credential.type === rule.type &&
          credential.resourceID === rule.resourceID
        ) {
          for (const privilege of rule.grantedPrivileges) {
            if (privilege === privilegeRequired) return true;
          }
        }
      }
    }
    const verifiedCredentialRules: AuthorizationPolicyRuleVerifiedCredential[] =
      this.convertVerifiedCredentialRulesStr(
        authorization.verifiedCredentialRules
      );
    for (const rule of verifiedCredentialRules) {
      for (const verifiedCredential of agentInfo.verifiedCredentials) {
        if (
          verifiedCredential.type === rule.type &&
          verifiedCredential.issuer === rule.resourceID
        ) {
          for (const privilege of rule.grantedPrivileges) {
            if (privilege === privilegeRequired) {
              this.logger.warn?.(
                `Authorization engine: granting access for '${verifiedCredential.type}'`,
                LogContext.AUTH
              );
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  getGrantedPrivileges(
    credentials: ICredential[],
    authorization: IAuthorizationPolicy
  ) {
    const grantedPrivileges: AuthorizationPrivilege[] = [];

    if (authorization.anonymousReadAccess) {
      grantedPrivileges.push(AuthorizationPrivilege.READ);
    }

    const credentialRules: AuthorizationPolicyRuleCredential[] =
      this.convertCredentialRulesStr(authorization.credentialRules);
    for (const rule of credentialRules) {
      for (const credential of credentials) {
        if (
          credential.type === rule.type &&
          credential.resourceID === rule.resourceID
        ) {
          for (const privilege of rule.grantedPrivileges) {
            grantedPrivileges.push(privilege);
          }
        }
      }
    }

    const uniquePrivileges = grantedPrivileges.filter(
      (item, i, ar) => ar.indexOf(item) === i
    );

    return uniquePrivileges;
  }

  convertCredentialRulesStr(
    rulesStr: string
  ): AuthorizationPolicyRuleCredential[] {
    if (!rulesStr || rulesStr.length == 0) return [];
    try {
      const rules: AuthorizationPolicyRuleCredential[] = JSON.parse(rulesStr);
      return rules;
    } catch (error) {
      const msg = `Unable to convert rules to json: ${error}`;
      this.logger.error(msg);
      throw new ForbiddenException(msg, LogContext.AUTH);
    }
  }

  convertVerifiedCredentialRulesStr(
    rulesStr: string
  ): AuthorizationPolicyRuleVerifiedCredential[] {
    if (!rulesStr || rulesStr.length == 0) return [];
    try {
      const rules: AuthorizationPolicyRuleVerifiedCredential[] =
        JSON.parse(rulesStr);
      return rules;
    } catch (error) {
      const msg = `Unable to convert rules to json: ${error}`;
      this.logger.error(msg);
      throw new ForbiddenException(msg, LogContext.AUTH);
    }
  }
}
