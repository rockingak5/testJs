import { CronExpression } from '../enums';

export const AUTH_LEVELS: authTypes = {
	master: 10,
	manager: 5,
};

export const RICHMENU_HEIGHT = 810;
export const RICHMENU_WIDTH = 1200;
export const RICHMENU_AREA_BIG_HEIGHT = 810;
export const RICHMENU_AREA_BIG_WIDTH = 800;
export const RICHMENU_AREA_SMALL_HEIGHT = 405;
export const RICHMENU_AREA_SMALL_WIDTH = 400;

export enum RICH_MENU_TYPE {
	DEFAULT = 'defaultRM',
	MEMBER = 'memberRM',
}

export const RICH_MENU_TYPES = ['defaultRM', 'memberRM'];

export enum RICH_MENU_ACTION_TYPE {
	TEL = 'tel',
	URI = 'uri',
	MESSAGE = 'message',
	MEMBERSHIP = 'membership',
}
export const RICH_MENU_ACTION_TYPES = Object.values(RICH_MENU_ACTION_TYPE);

export const VALUE_KEY_MAP_BY_ACTION_TYPE = {
	[RICH_MENU_ACTION_TYPE.MESSAGE]: 'text',
	[RICH_MENU_ACTION_TYPE.URI]: 'uri',
	[RICH_MENU_ACTION_TYPE.MEMBERSHIP]: 'uri',
	[RICH_MENU_ACTION_TYPE.TEL]: 'uri',
};

export const RESPONSE_SUCCESS = 200;
export const CREATED = 201;
export const NO_CONTENT = 204;
export const BAD_REQUEST = 400;
export const PERMISSION_ERROR = 401; //not enough authorization
export const SESSION_ERROR = 403; //no-session
export const NOT_ACCEPTABLE = 406; //not acceptable
export const CONFLICT_ERROR = 409;
export const SYSTEM_ERROR = 500;

export const MEMBER_WATCH_MESSAGE = '新規登録の通知です！\n会員：[NAME]';
export const REGISTRATION_WATCH_MESSAGE = '新規予約の通知です！\n会員：[NAME]\n予約日付：[DATE]';
export const CAMPAIGN_WATCH_MESSAGE = '新規キャンペーン応募の通知です！\n会員：[NAME]';

export const WATCH_MESSAGE_KEY_MEMBER = 'watchMemberTemplate';
export const WATCH_MESSAGE_KEY_REGISTRATION = 'watchRegistrationTemplate';
export const WATCH_MESSAGE_KEY_REGISTRATION_CANCEL = 'watchRegistrationCancelTemplate';
export const WATCH_MESSAGE_KEY_CAMPAIGN_APPLY = 'watchCampaignApplyTemplate';

export const TZ_DATABASE = '+09:00';
export const DATE_FORMAT = 'YYYY-MM-DD';
export const TIME_FORMAT = 'HH:mm:ss';
export const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
export const DATE_TIME_FORMAT_NO_SEC = 'YYYY-MM-DD HH:mm';

export const DATE_FORMAT_JP = 'YYYY年MM月DD日';
export const TIME_FORMAT_JP = 'HH時mm分ss秒';
export const DATE_TIME_FORMAT_JP_NO_SEC = 'YYYY年MM月DD日HH時mm分';

export const INQUIRY_TYPES: inquiryType[] = ['service', 'achievement', 'company', 'recruit', 'others'];

export enum CUSTOMER_REGISTRATION_FIELD_TYPE {
	TEXT = 'text',
	NUMBER = 'number',
	CHECKBOX = 'checkbox',
	RADIO = 'radio',
	DATE_PICKER = 'datepicker',
	IMAGE = 'image',
	ADDRESS = 'address',
	NOTE = 'note',
}

export enum PAYMENT_TYPE {
	REFUND = 'refund',
	PURCHASE = 'purchase',
}

export enum PAYMENT_STATUS {
	PENDING = 'PENDING',
	REJECTED = 'REJECTED',
	FULFILLED = 'FULFILLED',
}

export const ERROR_MESSAGES = {
	LINE_NOT_VERIFIED: 'LINE_NOT_VERIFIED',
};

export enum DATABASE_TABLE_NAME {
	RICH_MENU = 'RichMenus',
	RICH_MENU_AREA_ACTIONS = 'RichMenuAreaActions',
	RICH_MENU_AREA_BOUNDS = 'RichMenuAreaBounds',
	SYSTEM_SETTINGS = 'systemSettings',
	SURVEYS = 'Surveys',
	CUSTOMER_REGISTRATIONS = 'customerRegistrations',
	MEMBERS = 'members',
	MEMBER_SURVEY_REWARD = 'memberSurveyRewards',
	AUDIENCES = 'audiences',
	SURVEY_TEMPLATE = 'SurveyTemplates',
	MEMBER_FRIEND_ADDED = 'MemberFriendAdded',
	CHAT = 'chats',
}

export enum SYSTEM_SETTING_KEYS {
	IS_EVENT_BOOKING_TAB_VISIBLE = 'isEventBookingTabVisible',
	STORE_PIC = 'storePic',
}

export const TIME_ZONE_DEFAULT = 'Asia/Tokyo';
export const CRON_JOB_SEND_REMINDER = process.env.CRON_JOB_SEND_REMINDER || CronExpression.EVERY_DAY_AT_NOON;

export enum MEMBER_ORIGIN {
	NEW = 'new',
	CSV = 'csv',
	SYSTEM = 'system',
}

export enum MEMBER_VIA_TYPE {
	WEBSITE = 'website',
	EXHIBITION = 'exhibition',
	INTRODUCTION = 'introduction',
	OTHERS = 'others',
}

export enum MEMBER_IS_FRIEND_LABEL {
	IS_FRIEND = 'はい',
	NOT_FRIEND = 'いいえ',
}

export enum CUSTOMER_REGISTRATION_FIELD_IMAGE_LABEL {
	EXIST = 'あり',
	NOT_EXIST = 'なし',
}

export const SURVEY_IMAGE_FILE_NAME = 'surveyImage';

export const DAYS_REMINDER = {
	one_day: process.env.ONE_DAY_TEST ? parseInt(process.env.ONE_DAY_TEST) + 1 : 1,
	seven_day: process.env.SEVEN_DAY_TEST ? parseInt(process.env.SEVEN_DAY_TEST) + 7 : 7,
};

export const MYSQL_DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss';

export enum REMINDER_NOTIFY_TYPES {
	one_day = 'isNotified2',
	another_day = 'isNotified1',
}

export enum SORT {
	ASCENDING = 'asc',
	DESCENDING = 'desc',
}

export enum SOCKET_EVENTS {
	AUDIENCE_CREATED = 'audience:created',

	MEMBER_CREATED = 'member:created',
	MEMBER_UPDATED = 'member:updated',
	MEMBER_DELETED = 'member:deleted',

	CHAT_SEEN = 'chat:seen',
	CHAT_CREATED = 'chat:created',

	CUSTOMER_REGISTRATIONS_CHANGED = 'customer_registrations:changed',
}

export enum CUSTOMER_REGISTRATIONS_DEFAULT_FIELD {
	LAST_NAME = 'lastName',
	FIRST_NAME = 'firstName',
	POSTAL_CODE = 'postalCode',
	ADDRESS = 'address',
	SUB_ADDRESS = 'subAddress',
	BUILDING = 'building',
	TELEPHONE = 'telephone',
}

export enum SURVEY_PAGE_TYPE {
	SINGLE_PAGE = 'single',
	MULTIPLE_PAGE = 'multiple',
}

export enum AUDIENCE_TYPE {
	DEFAULT = 'default',
	CAMPAIGN = 'campaign',
	SURVEY = 'survey',
	LOTTERY = 'lottery',
	MEMBER = 'member',
}

export enum AUDIENCE_STATUS {
	IN_PROGRESS = 'IN_PROGRESS',
	READY = 'READY',
	FAILED = 'FAILED',
	EXPIRED = 'EXPIRED',
	INACTIVE = 'INACTIVE',
	ACTIVATING = 'ACTIVATING',
}

export enum SURVEY_NAVIGATION_TYPE {
	NEXT_QUESTION = 'next_question',
	CONDITIONAL_BRANCHING = 'conditional_branching',
	NEXT_SPECIFIED_QUESTION = 'next_specified_question',
}

export const CAMPAIGN_CHOICES_TYPE_OTHER = 'other';

export const CUSTOMER_REGISTRATION_TYPES = {
	TEXT: 'text',
	DATE_PICKER: 'datepicker',
	RADIO: 'radio',
	CHECKBOX: 'checkbox',
	IMAGE: 'image',
};

export const CONTENT_TYPE_SURVEY_OTHER = 'その他（テキスト入力）';

export const LABEL_LAST_NAME_FOR_MEMBER = '名前（苗字）';
export const LABEL_FIRST_NAME_FOR_MEMBER = '名前（名前）';

export const SURVEY_IMAGE_QUESTION_FILE_NAME = 'questionImage';

export const SURVEY_TEMPLATE_TYPE = {
	TEXT: 'text',
	DATEPICKER: 'datepicker',
	RADIO: 'radio',
	CHECKBOX: 'checkbox',
	IMAGE: 'image',
};

export const OPTION_SUBMIT_SURVEY_VALUE = -1;

export enum AUDIENCE_PARTICIPATION_STATUS {
	PARTICIPATE = 'participate',
	RESERVE = 'reserve',
	CANCEL = 'cancel',
}

const replacerName = new RegExp(/\[NAME\]/, 'gm');
const replacerDateTime = new RegExp(/\[DATE\]/, 'gm');
const replacerTelephone = new RegExp(/\[TEL\]/, 'gm');
const replacerTelephoneCompany = new RegExp(/\[COMPANY-TEL\]/, 'gm');
const replacerConfirmationUrl = new RegExp(/\[CONFIRM-URL\]/, 'gm');
const replacerBuilding = new RegExp(/\[BUILDING\]/, 'gm');

export const EVENT_REGISTRATIONS_REPLACER_MESSAGE = {
	replacerName,
	replacerDateTime,
	replacerTelephone,
	replacerTelephoneCompany,
	replacerConfirmationUrl,
	replacerBuilding,
};
