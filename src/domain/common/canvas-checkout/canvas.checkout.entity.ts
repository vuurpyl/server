import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { ICanvasCheckout } from './canvas.checkout.interface';
import { Lifecycle } from '@domain/common/lifecycle/lifecycle.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { CanvasCheckoutStateEnum } from '@common/enums/canvas.checkout.status';

@Entity()
export class CanvasCheckout
  extends AuthorizableEntity
  implements ICanvasCheckout
{
  @Column('varchar', { length: 36, nullable: false })
  canvasID!: string;

  // ID of the user that has the checkout
  @Column('varchar', { length: 36, nullable: false })
  lockedBy!: string;

  @Column({ default: CanvasCheckoutStateEnum.AVAILABLE })
  status!: string;

  @OneToOne(() => Lifecycle, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  lifecycle!: Lifecycle;
}
