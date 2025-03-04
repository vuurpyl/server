import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { Column, Entity } from 'typeorm';
import { IAuthorizationPolicy } from './authorization.policy.interface';

@Entity()
export class AuthorizationPolicy
  extends BaseAlkemioEntity
  implements IAuthorizationPolicy
{
  @Column('text')
  credentialRules: string;

  @Column('text')
  privilegeRules: string;

  @Column('text')
  verifiedCredentialRules: string;

  @Column()
  anonymousReadAccess: boolean;

  constructor() {
    super();
    this.anonymousReadAccess = false;
    this.credentialRules = '';
    this.verifiedCredentialRules = '';
    this.privilegeRules = '';
  }
}
