import { NameID, UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class MembershipResultEntry {
  @Field(() => NameID, {
    description: 'Name Identifier of the entity',
  })
  nameID: string;

  @Field(() => String, {
    description: 'Display name of the entity',
  })
  displayName: string;

  @Field(() => UUID, {
    description: 'The ID of the entry the user is a member of.',
  })
  id: string;

  @Field(() => UUID, {
    description: 'The ID of the parent ecoverse if applicable.',
    nullable: true,
  })
  ecoverseID?: string;

  constructor(
    nameID: string,
    id: string,
    displayName: string,
    parentId?: string
  ) {
    this.displayName = displayName;
    this.nameID = nameID;
    this.id = id;
    this.ecoverseID = parentId;
  }
}
