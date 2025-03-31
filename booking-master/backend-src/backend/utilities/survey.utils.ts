type MessageReminderSurveyParams = {
	name: string;
	rewardCode: string;
	messageReminder: string;
};

/**
 * Tạo mã code trúng thưởng theo định dạng
 *
 * @param {number} surveyId - Id của survey hiện tại. Ví dụ: 10
 * @param {number} totalRespondents - Số lượng members đã trả lời khảo sát, ví dụ 1 hoặc 12.
 * @returns {string} - Mã code theo đính dạng, ví dụ '10-0001' hoặc '10-0012'.
 */
export const getSurveyRewardCode = (surveyId: number, totalRespondents: number): string => {
	const numberCodeFormat = `${totalRespondents + 1}`.padStart(4, '0');
	return `${surveyId}-${numberCodeFormat}`;
};

const replacerName = new RegExp(/\[NAME\]/, 'gm');
const replacerRewardCode = new RegExp(/\[〇〇\]/, 'gm');

export const genMessageReminderSurvey = ({ name, rewardCode, messageReminder }: MessageReminderSurveyParams) => {
	const replaceName = messageReminder.replace(replacerName, name);
	return replaceName.replace(replacerRewardCode, rewardCode);
};
