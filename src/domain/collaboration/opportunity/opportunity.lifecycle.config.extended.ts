import { ILifecycleDefinition } from '@interfaces/lifecycle.definition.interface';

export const opportunityLifecycleConfigExtended: ILifecycleDefinition = {
  id: 'opportunity-lifecycle-extended',
  context: {
    parentID: '',
  },
  initial: 'new',
  states: {
    new: {
      on: {
        REFINE: 'beingRefined',
        ABANDONED: 'abandoned',
      },
    },
    beingRefined: {
      on: {
        REVIEW: 'awaitingApproval',
        ABANDONED: 'abandoned',
      },
    },
    awaitingApproval: {
      on: {
        APPROVED: 'inProgress',
        ABANDONED: 'abandoned',
      },
    },
    inProgress: {
      entry: ['sampleEvent'],
      on: {
        COMPLETED: 'complete',
        ABANDONED: 'abandoned',
      },
    },
    complete: {
      on: {
        ARCHIVE: 'archived',
        ABANDONED: 'archived',
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
