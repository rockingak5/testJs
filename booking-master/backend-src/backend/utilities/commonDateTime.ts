import moment from 'moment';
import 'moment-timezone';
import { TIME_ZONE_DEFAULT } from '~config';

export const isDateAfterOrEqualDays = (dateISO = '', days: number, timeZone = TIME_ZONE_DEFAULT): boolean => {
	if (!dateISO) return false;
	const currentDate = moment().tz(timeZone).startOf('day');

	const momentDate = moment.tz(dateISO, timeZone).startOf('day');

	return momentDate.diff(currentDate, 'days') >= days;
};

export const subDaysToDate = (dateISO: string, days: number, timeZone = TIME_ZONE_DEFAULT): Date => {
	const currentDate = moment.tz(dateISO, timeZone);

	currentDate.subtract(days, 'days');

	return currentDate.toDate();
};

export const getStartOfDayBeforeDaysToDate = ({ timeZone = TIME_ZONE_DEFAULT, days = 0 }) => {
	return moment().tz(timeZone).add(days, 'days').startOf('day');
};

export const getEndOfDayBeforeDaysToDate = ({ timeZone = TIME_ZONE_DEFAULT, days = 0 }) => {
	return moment().tz(timeZone).add(days, 'days').endOf('day');
};

export const isDateBeforeOrEqualDays = (dateISO = '', days: number, timeZone = TIME_ZONE_DEFAULT): boolean => {
	if (!dateISO) return false;
	const currentDate = moment().tz(timeZone).startOf('day');

	const momentDate = moment.tz(dateISO, timeZone).startOf('day');

	return momentDate.diff(currentDate, 'days') <= days;
};

export const DATE_FORMAT_TYPE = {
	DATE_JP: 'YYYY年M月D日',
};

export const formatDate = (value: Date | null, formatType = DATE_FORMAT_TYPE.DATE_JP) => {
	if (!value) return 'ー';

	return moment(value).format(formatType);
};

export const isSameDay = (dateISO: Date | null, timeZone = TIME_ZONE_DEFAULT): boolean => {
	if (!dateISO) return false;

	const currentDate = moment.tz(timeZone);

	const momentDate = moment.tz(dateISO, timeZone);

	return momentDate.isSame(currentDate, 'day');
};
