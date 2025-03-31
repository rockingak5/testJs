type paginationParams = {
	pp: number; //per page
	p: number; //page
	sort: 'asc' | 'desc'; //asc | desc | undefined, default - asc
	sortKey: string; //sort key
};

type richmenuType = 'defaultRM' | 'memberRM';

type chatContentType = 'image' | 'text' | 'video' | 'call' | 'slideshow';
type chatSource = 'user' | 'manager' | 'system';

type AudienceParticipationStatus = 'participate' | 'reserve' | 'cancel';

type authTypes = {
	master: 10;
	manager: 5;
};

type managerSessionDataType = {
	id: number;
	role: number;
	expires: number;
};

type registrationMemberInfoType = {
	memberId?: number;
	firstName: string;
	lastName: string;
	firstNameKana: string;
	lastNameKana: string;
	telephone: string;
	postalCode: string;
	building: string;
	address: string;
	customerRegistrationId1?: string;
	customerRegistrationId2?: string;
};
type registrationEmitType = {
	memberId: number | null;
	categoryId?: number | null;
	campaignId?: number | null;
	occasionId: number | null;
	occurrenceId?: number;
	occurrenceIds?: number[];
};

type richmenuPattern = {
	size: Size;
	selected: boolean;
	name: string; //Max: 300
	chatBarText: string;
	areas: Array<{
		bounds: Area;
		action: Action<{
			label?: string;
		}>; //max length 20 areas
	}>;
};
type systemSettingType = {
	label: string;
	valueFlag: boolean | null;
	valueString: string | null;
	valueNumber: number | null;
};

type deadlineType = {
	days: number;
	hours: number;
	minutes: number;
};
type bookingDeadlineType = deadlineType & { isEnabled: boolean };
type cancelBookingDeadlineType = deadlineType & { isAllowed: boolean };

type lineProfile = {
	userId: string;
	displayName: string | null;
	pictureUrl: string | null;
	statusMessage: string | null;
};

type imageUpdateType = { originalName: string; showOrder: number };

type audienceSearchQuestionSubtype = {
	questionId: number;
	value: string | number | Date;
	valueMin: string | number | Date;
	valueMax: string | number | Date;
};

type audienceSearchType = {
	address?: string;
	memberSinceMin?: string;
	memberSinceMax?: string;
	isCampaign?: true;
	hasWon?: boolean;
	candidateAtMin?: string;
	candidateAtMax?: string;
	categoryId?: number;
	occasionId?: number;
	questions?: audienceSearchQuestionSubtype[];
	participationStatus: AudienceParticipationStatus;
	registrationDateMin?: string;
	registrationDateMax?: string;
};
type audienceCampaignSearchType = {
	campaignId?: number;
	giftId?: number[];
	status?: 'all' | 'isWin' | 'notWin';
};
type audienceCampaignCreateType = audienceCampaignSearchType & {
	audienceName: string;
};

type audienceCreateType = audienceSearchType & {
	audienceName: string;
};

type questionArgumentValueType = string[] | string | number | Date;
type questionArgumentType = {
	questionId: number;
	value: questionArgumentValueType;
	valueMin: questionArgumentValueType;
	valueMax: questionArgumentValueType;
};

type CHAT_TYPES = 'text' | 'picture' | 'video' | 'location';
type CHAT_SOURCE = 'user' | 'system';

type audiencePermission = 'PUBLIC' | 'PRIVATE';
type audienceTypes = 'all' | 'present' | 'absent';

type inquiryType = 'service' | 'achievement' | 'company' | 'recruit' | 'others';
type inquiryStatus = 'confirming' | 'handling' | 'completed' | 'cancelled';

type customerOrigin = 'new' | 'csv' | 'system';

type memberViaType = 'website' | 'exhibition' | 'introduction' | 'others';

type notificationType = 'message' | 'inquiry' | 'registration' | 'lineFollow' | 'lineLink';

interface lineProfile {
	userId: string;
	displayName: string;
	pictureUrl: string;
	statusMessage: string;
}

interface ResMemberRegistrationEvent extends registrationEmitType {
	startAt: Date;
	registrationId: number;
	categoryTitle: string;
	isSettingTime?: boolean;
	categoryImages?: string[];
	isSendImage?: boolean;
	isMessage?: boolean;
	afterReservationMessage?: string;
	reminderMessageOneDay?: string;
	reminderMessageThreeDays?: string;
}

interface SendLineAfterRegistrationEvent {
	registrationResult: ResMemberRegistrationEvent;
	messagesToClient: {
		remind1: DbType.systemSettings | null;
		remind2: DbType.systemSettings | null;
		regiMessage: DbType.systemSettings | null;
		bookConfirmationUrl: DbType.systemSettings | null;
		companyTelephoneForTemplate: DbType.systemSettings | null;
		campaignregiMessage: DbType.systemSettings | null;
	};
	nameMember: string | null;
	memberLineId: string;
}

interface SendLineToAdminAfterRegistrationEvent
	extends Omit<SendLineAfterRegistrationEvent, 'messagesToClient' | 'memberLineId'> {
	phoneMember: string;
}

interface CreateMessageReminderEvent {
	messagesToClient: {
		remind1: DbType.systemSettings | null;
		remind2: DbType.systemSettings | null;
		regiMessage: DbType.systemSettings | null;
		bookConfirmationUrl: DbType.systemSettings | null;
		companyTelephoneForTemplate: DbType.systemSettings | null;
		campaignregiMessage: DbType.systemSettings | null;
	};
	registrationResult: ResMemberRegistrationEvent;
	memberId: number;
	nameMember: string;
	timeZone: string;
	replacerName: RegExp;
	replacerBuilding: RegExp;
	replacerConfirmationUrl: RegExp;
	replacerDateTime: RegExp;
	replacerTelephoneCompany: RegExp;
}
