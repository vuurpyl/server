import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Hub } from '@domain/challenge/hub/hub.entity';
import { HubService } from '@domain/challenge/hub/hub.service';
import { UserService } from '@domain/community/user/user.service';
import { Repository } from 'typeorm';
import fs from 'fs';
import * as defaultRoles from '@templates/authorization-bootstrap.json';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Profiling } from '@common/decorators';
import { ConfigurationTypes, LogContext } from '@common/enums';
import { BootstrapException } from '@common/exceptions/bootstrap.exception';
import { UserAuthorizationService } from '@domain/community/user/user.service.authorization';
import { HubAuthorizationService } from '@domain/challenge/hub/hub.service.authorization';
import {
  DEFAULT_HUB_DISPLAYNAME,
  DEFAULT_HUB_NAMEID,
  DEFAULT_HOST_ORG_DISPLAY_NAME,
  DEFAULT_HOST_ORG_NAMEID,
} from '@common/constants';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { OrganizationAuthorizationService } from '@domain/community/organization/organization.service.authorization';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AdminAuthorizationService } from '@platform/admin/authorization/admin.authorization.service';
import { CommunicationService } from '@domain/communication/communication/communication.service';

@Injectable()
export class BootstrapService {
  constructor(
    private agentService: AgentService,
    private hubService: HubService,
    private userService: UserService,
    private userAuthorizationService: UserAuthorizationService,
    private hubAuthorizationService: HubAuthorizationService,
    private adminAuthorizationService: AdminAuthorizationService,
    private configService: ConfigService,
    private organizationService: OrganizationService,
    private communicationService: CommunicationService,
    private organizationAuthorizationService: OrganizationAuthorizationService,
    @InjectRepository(Hub)
    private hubRepository: Repository<Hub>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async bootstrapHub() {
    try {
      this.logger.verbose?.('Bootstrapping Hub...', LogContext.BOOTSTRAP);
      this.logConfiguration();

      Profiling.logger = this.logger;
      const profilingEnabled = this.configService.get(
        ConfigurationTypes.MONITORING
      )?.logging?.profiling_enabled;
      if (profilingEnabled) Profiling.profilingEnabled = profilingEnabled;

      await this.ensureHubSingleton();
      await this.bootstrapProfiles();
      await this.ensureSsiPopulated();
      await this.ensureCommunicationRoomsCreated();
    } catch (error: any) {
      throw new BootstrapException(error.message);
    }
  }

  logConfiguration() {
    this.logger.verbose?.(
      '==== Configuration - Start ===',
      LogContext.BOOTSTRAP
    );

    const values = Object.values(ConfigurationTypes);
    for (const value of values) {
      this.logConfigLevel(value, this.configService.get(value));
    }
    this.logger.verbose?.('==== Configuration - End ===', LogContext.BOOTSTRAP);
  }

  logConfigLevel(key: any, value: any, indent = '', incrementalIndent = '  ') {
    if (typeof value === 'object') {
      const msg = `${indent}${key}:`;
      this.logger.verbose?.(`${msg}`, LogContext.BOOTSTRAP);
      Object.keys(value).forEach(childKey => {
        const childValue = value[childKey];
        const newIndent = `${indent}${incrementalIndent}`;
        this.logConfigLevel(childKey, childValue, newIndent, incrementalIndent);
      });
    } else {
      const msg = `${indent}==> ${key}: ${value}`;
      this.logger.verbose?.(`${msg}`, LogContext.BOOTSTRAP);
    }
  }

  async bootstrapProfiles() {
    const bootstrapAuthorizationEnabled = this.configService.get(
      ConfigurationTypes.BOOTSTRAP
    )?.authorization?.enabled;
    if (!bootstrapAuthorizationEnabled) {
      this.logger.verbose?.(
        `Authorization Profile Loading: ${bootstrapAuthorizationEnabled}`,
        LogContext.BOOTSTRAP
      );
      return;
    }

    const bootstrapFilePath = this.configService.get(
      ConfigurationTypes.BOOTSTRAP
    )?.authorization?.file as string;

    let bootstrapJson = {
      ...defaultRoles,
    };

    if (
      bootstrapFilePath &&
      fs.existsSync(bootstrapFilePath) &&
      fs.statSync(bootstrapFilePath).isFile()
    ) {
      this.logger.verbose?.(
        `Authorization bootstrap: configuration being loaded from '${bootstrapFilePath}'`,
        LogContext.BOOTSTRAP
      );
      const bootstratDataStr = fs.readFileSync(bootstrapFilePath).toString();
      this.logger.verbose?.(bootstratDataStr);
      if (!bootstratDataStr) {
        throw new BootstrapException(
          'Specified authorization bootstrap file not found!'
        );
      }
      bootstrapJson = JSON.parse(bootstratDataStr);
    } else {
      this.logger.verbose?.(
        'Authorization bootstrap: default configuration being loaded',
        LogContext.BOOTSTRAP
      );
    }

    const users = bootstrapJson.users;
    if (!users) {
      this.logger.verbose?.(
        'No users section in the authorization bootstrap file!',
        LogContext.BOOTSTRAP
      );
    } else {
      await this.createUserProfiles(users);
    }
  }

  @Profiling.api
  async createUserProfiles(usersData: any[]) {
    try {
      for (const userData of usersData) {
        const userExists = await this.userService.isRegisteredUser(
          userData.email
        );
        if (!userExists) {
          const nameID = this.userService.createUserNameID(
            userData.firstName,
            userData.lastName,
            false
          );
          let user = await this.userService.createUser({
            nameID: nameID,
            email: userData.email,
            displayName: `${userData.firstName} ${userData.lastName}`,
            accountUpn: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
          });
          const credentialsData = userData.credentials;
          for (const credentialData of credentialsData) {
            await this.adminAuthorizationService.grantCredential({
              userID: user.id,
              type: credentialData.type,
              resourceID: credentialData.resourceID,
            });
          }
          user = await this.userAuthorizationService.grantCredentials(user);
          user = await this.userAuthorizationService.applyAuthorizationPolicy(
            user
          );
        }
      }
    } catch (error: any) {
      throw new BootstrapException(
        `Unable to create profiles ${error.message}`
      );
    }
  }

  async ensureSsiPopulated() {
    const ssiEnabled = this.configService.get(ConfigurationTypes.SSI).enabled;
    if (ssiEnabled) {
      await this.agentService.ensureDidsCreated();
    }
  }

  async ensureCommunicationRoomsCreated() {
    const communicationsEnabled = this.configService.get(
      ConfigurationTypes.COMMUNICATIONS
    ).enabled;
    if (communicationsEnabled) {
      await this.communicationService.ensureCommunicationRoomsCreated();
    }
  }

  async ensureHubSingleton() {
    this.logger.verbose?.(
      '=== Ensuring at least one hub is present ===',
      LogContext.BOOTSTRAP
    );
    const hubCount = await this.hubRepository.count();
    if (hubCount == 0) {
      this.logger.verbose?.('...No hub present...', LogContext.BOOTSTRAP);
      this.logger.verbose?.('........creating...', LogContext.BOOTSTRAP);
      // create a default host org
      const hostOrganization = await this.organizationService.getOrganization(
        DEFAULT_HOST_ORG_NAMEID
      );
      if (!hostOrganization) {
        const hostOrg = await this.organizationService.createOrganization({
          nameID: DEFAULT_HOST_ORG_NAMEID,
          displayName: DEFAULT_HOST_ORG_DISPLAY_NAME,
        });
        await this.organizationAuthorizationService.applyAuthorizationPolicy(
          hostOrg
        );
      }

      const hub = await this.hubService.createHub({
        nameID: DEFAULT_HUB_NAMEID,
        displayName: DEFAULT_HUB_DISPLAYNAME,
        hostID: DEFAULT_HOST_ORG_NAMEID,
        context: {
          tagline: 'An empty hub to be populated',
        },
      });
      return await this.hubAuthorizationService.applyAuthorizationPolicy(hub);
    }
  }
}
