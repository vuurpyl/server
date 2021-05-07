import { Reference } from '@domain/common/reference/reference.entity';
import { IReference } from '@domain/common/reference/reference.interface';
import { Tagset } from '@domain/common/tagset/tagset.entity';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { CreateReferenceInput } from '@domain/common/reference';
import {
  IProfile,
  Profile,
  UpdateProfileInput,
  UploadProfileAvatarInput,
} from '@domain/community/profile';
import { CreateTagsetInput } from '@domain/common/tagset';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { ProfileService } from './profile.service';
import {
  AuthorizationRulesGuard,
  AuthorizationRolesGlobal,
  AuthorizationGlobalRoles,
  AuthorizationSelfManagement,
} from '@core/authorization';

@Resolver()
export class ProfileResolverMutations {
  constructor(private profileService: ProfileService) {}

  @AuthorizationGlobalRoles(
    AuthorizationRolesGlobal.CommunityAdmin,
    AuthorizationRolesGlobal.Admin
  )
  @AuthorizationSelfManagement()
  @UseGuards(AuthorizationRulesGuard)
  @Mutation(() => Tagset, {
    description: 'Creates a new Tagset on the specified Profile',
  })
  @Profiling.api
  async createTagsetOnProfile(
    @Args('tagsetData') tagsetData: CreateTagsetInput
  ): Promise<ITagset> {
    return await this.profileService.createTagset(tagsetData);
  }

  @AuthorizationGlobalRoles(
    AuthorizationRolesGlobal.CommunityAdmin,
    AuthorizationRolesGlobal.Admin
  )
  @AuthorizationSelfManagement()
  @UseGuards(AuthorizationRulesGuard)
  @Mutation(() => Reference, {
    description: 'Creates a new Reference on the specified Profile.',
  })
  @Profiling.api
  async createReferenceOnProfile(
    @Args('referenceInput') referenceInput: CreateReferenceInput
  ): Promise<IReference> {
    return await this.profileService.createReference(referenceInput);
  }

  @AuthorizationGlobalRoles(
    AuthorizationRolesGlobal.Admin,
    AuthorizationRolesGlobal.CommunityAdmin
  )
  @AuthorizationSelfManagement()
  @UseGuards(AuthorizationRulesGuard)
  @Mutation(() => Profile, {
    description: 'Updates the specified Profile.',
  })
  @Profiling.api
  async updateProfile(
    @Args('profileData') profileData: UpdateProfileInput
  ): Promise<IProfile> {
    return await this.profileService.updateProfile(profileData);
  }

  @AuthorizationGlobalRoles(
    AuthorizationRolesGlobal.Admin,
    AuthorizationRolesGlobal.CommunityAdmin
  )
  @AuthorizationSelfManagement()
  @Mutation(() => Profile, {
    description: 'Uploads and sets an avatar image for the specified Profile.',
  })
  async uploadAvatar(
    @Args('uploadData') uploadData: UploadProfileAvatarInput,
    @Args({ name: 'file', type: () => GraphQLUpload })
    { createReadStream, filename, mimetype }: FileUpload
  ): Promise<IProfile> {
    const readStream = createReadStream();
    return await this.profileService.uploadAvatar(
      readStream,
      filename,
      mimetype,
      uploadData
    );
  }
}
