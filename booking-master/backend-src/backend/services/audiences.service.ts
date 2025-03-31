import { get as _get } from 'lodash';
import { Op, QueryTypes, Sequelize } from 'sequelize';
import { db } from '~models';
import { isEmpty } from 'lodash';
import { LineService, MemberService } from '~services';
import { CONTENT_TYPE_SURVEY_OTHER, CUSTOMER_REGISTRATION_FIELD_TYPE } from '~config';

const getValueRadioAndCheckBox = (val: string, key: string, type: string) => {
	if (val === CONTENT_TYPE_SURVEY_OTHER) {
		return type === CUSTOMER_REGISTRATION_FIELD_TYPE.RADIO ? `\`${key}\` LIKE '%{%'` : `\`${key}\` LIKE '%"{%'`;
	}
	return type === CUSTOMER_REGISTRATION_FIELD_TYPE.RADIO ? `\`${key}\` = '${val}'` : `\`${key}\` LIKE '%"${val}"%'`;
};

type TSearchAudienceSurvey = {
	surveyId: number;
	questions: Record<string, any>;
	condition: 'or' | 'and';
	completed?: 'true' | 'false';
};
export const searchAudienceSurvey = async ({
	surveyId,
	// completed,
	questions = {},
	condition = 'or',
}: TSearchAudienceSurvey) => {
	const questionsReplaced = Object.keys(questions).reduce((prev, curr) => {
		const key = curr.replace('questionId', '');
		return {
			...prev,
			[key]: _get(questions, curr),
		};
	}, {});

	// const usersNotAnsweredSurvey =
	// 	completed === 'false'
	// 		? await db.sequelize.query(
	// 				`
	// 					SELECT
	// 						\`lineId\` as \`lineUserId\`
	// 					FROM members
	// 					WHERE \`lineId\` NOT IN (
	// 						SELECT lineUserId FROM (
	// 							SELECT
	// 								\`lineUserId\`
	// 							FROM \`SurveyRecords\`
	// 							WHERE \`surveyId\` = ${surveyId}
	// 							GROUP BY \`lineUserId\`
	// 						) AS grouped_data
	// 					)
	// 					AND \`memberCode\` IS NOT NULL
	// 				`,
	// 				{
	// 					type: QueryTypes.SELECT
	// 				}
	// 		  )
	// 		: []
	// if (
	// 	completed === 'false' /* &&
	// 	(condition === 'and' || !_compact(_map(questionsReplaced, ({ value = [] }) => value).flat()).length) */
	// ) {
	// 	return usersNotAnsweredSurvey
	// }

	const keys = Object.keys(questionsReplaced as Record<string, string>).filter((key) => {
		const value = _get(questionsReplaced, key);
		const childValue = _get(value, 'value');
		const type = _get<'text' | 'datepicker' | 'radio' | 'checkbox' | 'image'>(value, 'type', 'text');
		if (type !== 'datepicker' && Array.isArray(childValue)) {
			return childValue.length > 0;
		}
		if (type === 'datepicker') {
			const [from, to] = childValue || [];
			return from || to;
		}
		if (type === 'image') {
			return childValue && childValue.length;
		}
		return childValue && childValue !== '';
	});

	const where: string[] = keys
		.map((key) => {
			const value = _get(questionsReplaced, key);
			const type = _get<'text' | 'datepicker' | 'radio' | 'checkbox' | 'image'>(value, 'type', 'text');
			const childCondition = _get<'or' | 'and'>(value, 'condition', 'or');
			const childValue: string | Array<any> = _get(value, 'value');

			switch (type) {
				case CUSTOMER_REGISTRATION_FIELD_TYPE.TEXT: {
					return (childValue as string)
						.split(',')
						.filter(Boolean)
						.map((val) => `\`${key}\` LIKE '%${val}%'`)
						.join(` ${childCondition.toUpperCase()} `);
				}

				case CUSTOMER_REGISTRATION_FIELD_TYPE.CHECKBOX:
				case CUSTOMER_REGISTRATION_FIELD_TYPE.RADIO: {
					return (childValue as Array<string>)
						.filter(Boolean)
						.map((val) => {
							return getValueRadioAndCheckBox(val, key, type);
						})
						.join(` ${childCondition.toUpperCase()} `);
				}

				case CUSTOMER_REGISTRATION_FIELD_TYPE.DATE_PICKER: {
					return (childValue as [string, string])
						.map((val, index) => {
							if (val) {
								const operator = !index ? '>=' : '<=';
								return `\`${key}\` ${operator} '${val}'`;
							}
						})
						.filter(Boolean)
						.join(' AND ');
				}

				case CUSTOMER_REGISTRATION_FIELD_TYPE.IMAGE: {
					return (childValue as ['true' | 'false', 'true' | 'false'])
						.filter(Boolean)
						.map((val) => JSON.parse(val))
						.map((val: boolean) => `\`${key}\` ${val ? 'IS NOT NULL' : 'IS NULL'} `)
						.join(` ${childCondition.toUpperCase()} `);
				}

				default:
					return '';
			}
		})
		.filter(Boolean)
		.map((val) => `(${val})`);

	const columns = keys.map((key) => `MAX(CASE WHEN \`tpId\` = ${key} THEN content END) AS \`${key}\``).join(',');

	const searchResult = await db.sequelize.query(
		`
			SELECT *
			FROM (
				SELECT \`lineUserId\` ${columns.length ? `,${columns}` : ''} 
				FROM \`SurveyRecords\`
				WHERE \`surveyId\` = ${surveyId}
				GROUP BY \`lineUserId\`
			) AS grouped_data ${where.length ? `WHERE ${where.join(` ${condition.toString().toUpperCase()} `)}` : ''};
		`,
		{
			type: QueryTypes.SELECT,
		},
	);

	// if (completed === 'false' && condition === 'or') {
	// 	return [...searchResult, ...usersNotAnsweredSurvey]
	// }

	return searchResult;
};

export const browseAudienceSurveyOptions = () => {
	return db.surveys.findAll({
		attributes: [
			//
			['surveyId', 'id'],
			['svname', 'name'],
		],
	});
};

type TBrowseAudienceSurveyQuestions = {
	surveyId: number;
};
export const browseAudienceSurveyQuestions = ({ surveyId }: TBrowseAudienceSurveyQuestions) => {
	return db.surveyTemplate.findAll({
		where: {
			surveyId,
			isDelete: false,
		},
		attributes: [
			//
			['tpId', 'id'],
			'label',
			'type',
			'options',
		],
	});
};

export const browseAudienceLotteries = () => {
	return db.lotteries.findAll({
		attributes: [
			['title', 'label'],
			['lotteryId', 'value'],
		],
	});
};

type TBrowseAudienceLotteryPrizes = {
	lotteryId: number;
};
export const browseAudienceLotteryPrizes = ({ lotteryId }: TBrowseAudienceLotteryPrizes) => {
	return db.lotteryPrizes.findAll({
		where: {
			lotteryId,
		},
		attributes: [['name', 'label'], ['prizeId', 'value'], 'isMiss'],
	});
};

type TBrowseAudienceLotteryDraws = {
	lotteryId: number;
	prizeIds?: number[];
	isMiss?: string;
};
export const browseAudienceLotteryDraws = ({ lotteryId, prizeIds = [], isMiss }: TBrowseAudienceLotteryDraws) => {
	return db.draws.findAll({
		paranoid: true,
		where: {
			lotteryId,
			...(isEmpty(prizeIds)
				? {}
				: {
						'$`LotteryPrize`.`prizeId`$': {
							[Op.in]: prizeIds,
						},
				  }),
			...(isMiss && ['true', 'false'].includes(isMiss)
				? {
						'$`LotteryPrize`.`isMiss`$': JSON.parse(isMiss),
				  }
				: {}),
		},
		include: [
			{
				model: db.members,
				attributes: [],
			},
			{
				model: db.lotteryPrizes,
				attributes: [],
			},
		],
		attributes: [[Sequelize.literal('`Member`.`lineId`'), 'id']],
	});
};

type TCreateAudienceLottery = {
	name: string;
	searchCondition: Record<string, any>;
	members: { id: string }[];
};
export const createAudienceLottery = async ({ name, searchCondition, members }: TCreateAudienceLottery) => {
	return LineService.createLotteryAudience({ name, searchCondition, members });
};

export const browseAudienceMembersHandler = async (
	filters: Parameters<typeof MemberService.browseMembersHandler>[0],
): Promise<{ id: string }[]> => {
	const { members } = await MemberService.browseMembersHandler(filters, undefined, true);
	return members.map((member) => ({ id: member.lineId as string }));
};
