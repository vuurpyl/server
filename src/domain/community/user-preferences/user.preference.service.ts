import { forwardRef, Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import {
  EntityNotFoundException,
  LogContext,
  UserPreferenceType,
  UserPreferenceValueType,
} from '@src/common';
import { IUser } from '../user';
import { UserPreferenceDefinition } from './user.preference.definition.entity';
import { IUserPreferenceDefinition } from './user.preference.definition.interface';
import { UserPreference } from './user.preference.entity';
import { IUserPreference } from './user.preference.interface';
import {
  CreateUserPreferenceDefinitionInput,
  UpdateUserPreferenceInput,
} from './dto';
import { getDefaultPreferenceValue, validateValue } from './utils';
import { UserService } from '../user/user.service';

@Injectable()
export class UserPreferenceService {
  constructor(
    @InjectRepository(UserPreferenceDefinition)
    private definitionRepository: Repository<UserPreferenceDefinition>,
    @InjectRepository(UserPreference)
    private preferenceRepository: Repository<UserPreference>,
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async createDefinition(
    definitionData: CreateUserPreferenceDefinitionInput
  ): Promise<IUserPreferenceDefinition> {
    const definition = UserPreferenceDefinition.create(definitionData);
    definition.authorization = new AuthorizationPolicy();

    return this.definitionRepository.save(definition);
  }

  async definitionExists(
    group: string,
    valueType: UserPreferenceValueType,
    type: UserPreferenceType
  ) {
    const res = await this.definitionRepository.findOne({
      group,
      type,
      valueType,
    });
    return Boolean(res);
  }

  /**
   * Creates user preferences
   */
  // todo get user with user service
  async createInitialUserPreferences(user: IUser) {
    // todo: probably define which definition types/groups to create
    return (
      this.getAllDefinitions()
        .then(defs =>
          defs.map(def => ({
            userPreferenceDefinition: def,
            value: getDefaultPreferenceValue(def.valueType),
            user,
          }))
        )
        .then(prefInputs => this.preferenceRepository.create(prefInputs))
        .then(prefs => {
          prefs.forEach(
            pref => (pref.authorization = new AuthorizationPolicy())
          );
          return prefs;
        })
        // todo apply user credentials
        .then(prefs => this.preferenceRepository.save(prefs))
    );
  }

  async getUserPreferenceOrFail(
    userId: string,
    type: UserPreferenceType
  ): Promise<IUserPreference> {
    const definition = await this.getDefinitionOrFail(type);
    const user = await this.userService.getUserOrFail(userId);

    const preference = await this.preferenceRepository.findOne(
      { user, userPreferenceDefinition: definition },
      { relations: ['user'] }
    );

    if (!preference) {
      throw new EntityNotFoundException(
        `Unable to find preference for user with ID: ${userId}`,
        LogContext.COMMUNITY
      );
    }

    return preference;
  }

  async updateUserPreference(updateInput: UpdateUserPreferenceInput) {
    const preference = await this.getUserPreferenceOrFail(
      updateInput.userId,
      updateInput.userPreferenceType
    );

    const newValue = updateInput.value;

    if (
      !validateValue(newValue, preference.userPreferenceDefinition.valueType)
    ) {
      throw new TypeError(
        `Expected value of type: ${preference.userPreferenceDefinition.valueType}`
      );
    }

    if (newValue !== preference.value) {
      preference.value = newValue;
    }

    return this.preferenceRepository.save(preference);
  }

  private getDefinitionOrFail(type: UserPreferenceType) {
    const definition = this.definitionRepository.findOne({
      type,
    });

    if (!definition) {
      throw new EntityNotFoundException(
        `Unable to fine preference definition of type ${type}`,
        LogContext.COMMUNITY
      );
    }

    return definition;
  }

  private getAllDefinitions() {
    return this.definitionRepository.find();
  }
}
