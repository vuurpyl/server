import { ILifecycleDefinition } from '@interfaces/lifecycle.definition.interface';

export const challengeLifecycleConfigDefault: ILifecycleDefinition = {
  id: 'challenge-lifecycle-default-2',
  context: {
    parentID: '',
  },
  initial: 'new',
  states: {
    new: {
      on: {
        REFINE: {
          target: 'beingRefined',
          cond: 'challengeStateUpdateAuthorized',
        },
        ABANDONED: {
          target: 'abandoned',
          cond: 'challengeStateUpdateAuthorized',
        },
      },
    },
    beingRefined: {
      on: {
        ACTIVE: {
          target: 'inProgress',
          cond: 'challengeStateUpdateAuthorized',
        },
        ABANDONED: {
          target: 'abandoned',
          cond: 'challengeStateUpdateAuthorized',
        },
      },
    },
    inProgress: {
      entry: ['sampleEvent'],
      on: {
        COMPLETED: {
          target: 'complete',
          cond: 'challengeStateUpdateAuthorized',
        },
        ABANDONED: {
          target: 'abandoned',
          cond: 'challengeStateUpdateAuthorized',
        },
      },
    },
    complete: {
      on: {
        ARCHIVE: 'archived',
        ABANDONED: 'abandoned',
      },
    },
    abandoned: {
      on: {
        REOPEN: 'inProgress',
        ARCHIVE: 'archived',
      },
    },
    archived: {
      type: 'final',
    },
  },
};
