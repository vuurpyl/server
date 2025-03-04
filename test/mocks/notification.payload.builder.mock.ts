import { ValueProvider } from '@nestjs/common';
import { NotificationPayloadBuilder } from '@services/adapters/notification-adapter/notification.payload.builder';
import { PublicPart } from '../utils/public-part';

export const MockNotificationsPayloadBuilder: ValueProvider<
  PublicPart<NotificationPayloadBuilder>
> = {
  provide: NotificationPayloadBuilder,
  useValue: {
    buildApplicationCreatedNotificationPayload: jest.fn(),
    buildAspectCreatedPayload: jest.fn(),
    buildCommentCreatedOnAspectPayload: jest.fn(),
    buildCommunicationDiscussionCreatedNotificationPayload: jest.fn(),
    buildCommunicationUpdateSentNotificationPayload: jest.fn(),
    buildCommunityContextReviewSubmittedNotificationPayload: jest.fn(),
    buildCommunityNewMemberPayload: jest.fn(),
    buildUserRegisteredNotificationPayload: jest.fn(),
  },
};
