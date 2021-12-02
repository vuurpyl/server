export const CanvasCheckoutLifecycleConfig = {
  id: 'canvas-checkout',
  context: {
    parentID: '',
  },
  initial: 'available',
  states: {
    available: {
      entry: ['checkin'],
      on: {
        CHECKOUT: {
          target: 'checkedOut',
          cond: 'CanvasCheckoutAuthorized',
        },
      },
    },
    checkedOut: {
      entry: ['checkout'],
      on: {
        CHECKIN: {
          target: 'available',
          cond: 'CanvasCheckinAuthorized',
        },
      },
    },
  },
};
