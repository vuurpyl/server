import { CommunityPolicyRole } from './community.policy.role';

export type CommunityPolicy = {
  member: CommunityPolicyRole;
  leader: CommunityPolicyRole;
};
