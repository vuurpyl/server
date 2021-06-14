/* eslint-disable @typescript-eslint/no-inferrable-types */
import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Ecoverse } from '@domain/challenge/ecoverse';
import { IChallenge } from './challenge.interface';
import { Organisation } from '@domain/community';
import { Opportunity } from '@domain/collaboration/opportunity';
import { BaseChallenge } from '../base-challenge/base.challenge.entity';

@Entity()
export class Challenge extends BaseChallenge implements IChallenge {
  @OneToMany(
    () => Opportunity,
    opportunity => opportunity.challenge,
    { eager: false, cascade: true }
  )
  opportunities?: Opportunity[];

  @ManyToMany(
    () => Organisation,
    organisation => organisation.challenges,
    { eager: true, cascade: true }
  )
  @JoinTable({ name: 'challenge_lead' })
  leadOrganisations?: Organisation[];

  @OneToMany(
    () => Challenge,
    challenge => challenge.parentChallenge,
    { eager: false, cascade: true }
  )
  childChallenges?: Challenge[];

  @ManyToOne(
    () => Challenge,
    challenge => challenge.childChallenges,
    { eager: false, cascade: false }
  )
  parentChallenge?: Challenge;

  @ManyToOne(
    () => Ecoverse,
    ecoverse => ecoverse.challenges,
    { eager: false, cascade: false }
  )
  parentEcoverse?: Challenge;

  @Column()
  ecoverseID!: string;

  constructor() {
    super();
  }
}
