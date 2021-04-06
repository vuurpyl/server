import { CreateApplicationInput } from '@domain/community/application';
import { Application } from '@domain/community/application/application.entity';
import { ApplicationFactoryService } from '@domain/community/application/application.factory.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { NVPService } from '@domain/common/nvp/nvp.service';

@Injectable()
export class ApplicationService {
  constructor(
    @InjectRepository(Application)
    private applicationReposity: Repository<Application>,
    private applicationFactoryService: ApplicationFactoryService,
    private nvpService: NVPService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createApplication(
    applicationData: CreateApplicationInput
  ): Promise<Application> {
    const application = await this.applicationFactoryService.createApplication(
      applicationData
    );
    return await this.applicationReposity.save(application);
  }

  async removeApplication(applicationID: number): Promise<Application> {
    const application = await this.getApplicationOrFail(applicationID);

    if (application.questions) {
      for (const question of application.questions) {
        await this.nvpService.removeNVP(question.id);
      }
    }
    const result = await this.applicationReposity.remove(
      application as Application
    );
    return result;
  }

  async getApplications() {
    return (await this.applicationReposity.find()) || [];
  }

  async getApplicationOrFail(
    applicationId: number,
    options?: FindOneOptions<Application>
  ): Promise<Application> {
    const application = await this.applicationReposity.findOne(
      { id: applicationId },
      options
    );
    if (!application)
      throw new EntityNotFoundException(
        `Application with ID ${applicationId} can not be found!`,
        LogContext.COMMUNITY
      );
    return application;
  }

  async save(application: Application) {
    await this.applicationReposity.save(application);
  }
}
