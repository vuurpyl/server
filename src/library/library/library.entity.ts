import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { InnovationPack } from '@library/innovation-pack/innovation.pack.entity';
import { Entity, OneToMany } from 'typeorm';
import { ILibrary } from './library.interface';

@Entity()
export class Library extends AuthorizableEntity implements ILibrary {
  @OneToMany(() => InnovationPack, innovationPack => innovationPack.library, {
    eager: true,
    cascade: true,
  })
  innovationPacks?: InnovationPack[];
}
