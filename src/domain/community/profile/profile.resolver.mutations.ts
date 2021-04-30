import { Roles } from '@common/decorators/roles.decorator';
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
import { Profiling, SelfManagement } from '@src/common/decorators';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { ProfileService } from './profile.service';

@Resolver()
export class ProfileResolverMutations {
  constructor(private profileService: ProfileService) {}

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @SelfManagement()
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Tagset, {
    description: 'Creates a new Tagset on the specified Profile',
  })
  @Profiling.api
  async createTagsetOnProfile(
    @Args('tagsetData') tagsetData: CreateTagsetInput
  ): Promise<ITagset> {
    return await this.profileService.createTagset(tagsetData);
  }

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @SelfManagement()
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Reference, {
    description: 'Creates a new Reference on the specified Profile.',
  })
  @Profiling.api
  async createReferenceOnProfile(
    @Args('referenceInput') referenceInput: CreateReferenceInput
  ): Promise<IReference> {
    return await this.profileService.createReference(referenceInput);
  }

  @Roles(AuthorizationRoles.EcoverseAdmins, AuthorizationRoles.CommunityAdmins)
  @SelfManagement()
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Profile, {
    description: 'Updates the specified Profile.',
  })
  @Profiling.api
  async updateProfile(
    @Args('profileData') profileData: UpdateProfileInput
  ): Promise<IProfile> {
    return await this.profileService.updateProfile(profileData);
  }

  @Roles(AuthorizationRoles.EcoverseAdmins, AuthorizationRoles.CommunityAdmins)
  @SelfManagement()
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
