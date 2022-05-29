import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AspectTemplate } from './aspect.template.entity';
import { IAspectTemplate } from './aspect.template.interface';
import { TemplateBaseService } from '../template-base/template.base.service';
import { CreateAspectTemplateInput } from './dto/aspect.template.dto.create';

@Injectable()
export class AspectTemplateService {
  constructor(
    @InjectRepository(AspectTemplate)
    private aspectTemplateRepository: Repository<AspectTemplate>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private templateBaseService: TemplateBaseService
  ) {}

  async createAspectTemplate(
    aspectTemplateData: CreateAspectTemplateInput
  ): Promise<IAspectTemplate> {
    const aspectTemplate: IAspectTemplate =
      AspectTemplate.create(aspectTemplateData);
    await this.templateBaseService.initialise(
      aspectTemplate,
      aspectTemplateData
    );

    return await this.aspectTemplateRepository.save(aspectTemplate);
  }

  async getAspectTemplateOrFail(
    aspectTemplateID: string
  ): Promise<IAspectTemplate> {
    const aspectTemplate = await this.aspectTemplateRepository.findOne({
      id: aspectTemplateID,
    });
    if (!aspectTemplate)
      throw new EntityNotFoundException(
        `Not able to locate AspectTemplate with the specified ID: ${aspectTemplateID}`,
        LogContext.COMMUNICATION
      );
    return aspectTemplate;
  }

  async deleteAspectTemplate(
    aspectTemplate: IAspectTemplate
  ): Promise<IAspectTemplate> {
    await this.templateBaseService.deleteEntities(aspectTemplate);
    const result = await this.aspectTemplateRepository.remove(
      aspectTemplate as AspectTemplate
    );
    result.id = aspectTemplate.id;
    return result;
  }

  async save(aspectTemplate: IAspectTemplate): Promise<IAspectTemplate> {
    return await this.aspectTemplateRepository.save(aspectTemplate);
  }
}
