import { Member } from '~models/memberModel';
import { socketIO } from '../loaders/socketioLoader';
import { SOCKET_EVENTS } from '~config';
import { Audience } from '~models/audienceModel';

export const emitAnnouncement = ({ announcementId }: { announcementId: number | string }) =>
	socketIO.emit('announcement', { announcementId: announcementId });

export const emitAttendance = ({ attendanceId }: { attendanceId: number }) =>
	socketIO.emit('attendance', { attendanceId: attendanceId });

export const emitAudience = (audienceGroupId: { audienceGroupId: number | string }) =>
	socketIO.emit('audience', { audienceGroupId: audienceGroupId });

export const emitCategory = ({ categoryId }: { categoryId?: number }) =>
	socketIO.emit('category', { categoryId: categoryId });
export const emitCampaign = ({ campaignId }: { campaignId?: number }) =>
	socketIO.emit('campaign', { campaignId: campaignId });

export const emitChat = ({ memberId }: { memberId: number }) => socketIO.emit('chat', { memberId: memberId });

export const emitAudienceCreated = (audience: Audience) => socketIO.emit(SOCKET_EVENTS.AUDIENCE_CREATED, audience);

export const emitChatSeen = (data: Pick<Member, 'memberId'>) => socketIO.emit(SOCKET_EVENTS.CHAT_SEEN, data);

export const emitFavicon = ({ favicon }: { favicon: string }) => socketIO.emit('favicon', { favicon: favicon });

export const emitLogo = ({ logo }: { logo: string }) => socketIO.emit('logo', { logo: logo });

export const emitStorePic = ({ storePic }: { storePic: string }) => socketIO.emit('storePic', { logo: storePic });

export const emitMember = ({ memberId }: { memberId: number | string | null }) =>
	socketIO.emit('member', { memberId: memberId });

export const emitChatCreated = ({ memberId }: Pick<Member, 'memberId'>) =>
	socketIO.emit(SOCKET_EVENTS.CHAT_CREATED, { memberId });

export const emitMemberCreated = (member: Member) => socketIO.emit(SOCKET_EVENTS.MEMBER_CREATED, member);

export const emitMemberUpdated = (member: Member) => socketIO.emit(SOCKET_EVENTS.MEMBER_UPDATED, member);

export const emitMemberDeleted = ({ memberId }: Pick<Member, 'memberId'>) =>
	socketIO.emit(SOCKET_EVENTS.MEMBER_DELETED, memberId);

export const emitOccasion = ({
	occasionId,
	categoryId,
	campaignId,
}: {
	occasionId?: number;
	categoryId?: number;
	campaignId?: number;
}) => socketIO.emit('occasion', { occasionId, categoryId, campaignId });
export const emitGift = ({ giftId, campaignId }: { giftId?: number; campaignId?: number }) =>
	socketIO.emit('gift', { giftId, campaignId });

export const emitOccurrence = ({
	categoryId,
	occasionId,
	campaignId,
	occurrenceId,
	occurrenceIds,
}: {
	categoryId?: number | null;
	occasionId: number | null;
	campaignId?: number | null;
	occurrenceId?: number;
	occurrenceIds?: number[];
}) => socketIO.emit('occurrence', { categoryId, campaignId, occasionId, occurrenceId, occurrenceIds });

export const emitRegistration = ({
	memberId,
	categoryId,
	campaignId,
	occasionId,
	occurrenceId,
	occurrenceIds,
}: registrationEmitType) =>
	socketIO.emit('registration', { memberId, categoryId, campaignId, occasionId, occurrenceId, occurrenceIds });

export const emitSystemSetting = ({ keys }: { keys: string[] }) => socketIO.emit('systemSetting', { keys: keys });

export const emitTemplate = ({ name }: { name: string }) => socketIO.emit('template', { name: name });

export const emitTimeline = ({ timelineId }: { timelineId: number }) =>
	socketIO.emit('announcement', { announcementId: timelineId });

export const emitCustomerRegistrationsChanged = () => socketIO.emit(SOCKET_EVENTS.CUSTOMER_REGISTRATIONS_CHANGED, {});
