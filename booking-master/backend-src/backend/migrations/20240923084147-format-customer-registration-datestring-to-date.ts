import _ from 'lodash';
import moment from 'moment';
import { Migration } from 'sequelize-cli';
import { CUSTOMER_REGISTRATION_FIELD_TYPE } from '~config';
import { CustomerRegistration } from '~models/customerRegistrationModel';
import { Member } from '~models/memberModel';
import { writeLog } from '~utilities';

module.exports = {
	async up(queryInterface, Sequelize) {
		const transaction = await queryInterface.sequelize.transaction();

		try {
			const fields = await queryInterface.sequelize.query<Pick<CustomerRegistration, 'customerRegistrationId'>>(
				`
          SELECT \`customerRegistrationId\`
          FROM \`customerRegistrations\`
          WHERE type = :type
        `,
				{
					replacements: {
						type: CUSTOMER_REGISTRATION_FIELD_TYPE.DATE_PICKER,
					},
					type: Sequelize.QueryTypes.SELECT,
				},
			);

			const members = await queryInterface.sequelize.query<Member>(
				`
          SELECT
            \`memberId\`,
            ${fields
							.map(({ customerRegistrationId }) => `\`customerRegistrationId${customerRegistrationId}\``)
							.join(',')}
          FROM members
          WHERE
          ${fields
						.map(({ customerRegistrationId }) => {
							const colName = `\`customerRegistrationId${customerRegistrationId}\``;
							return `${colName} IS NOT NULL AND ${colName} != ''`;
						})
						.join('OR')}
        `,
				{
					type: Sequelize.QueryTypes.SELECT,
				},
			);

			for (const member of members) {
				const memberOmitted = _.omitBy(member, (value) => _.isNil(value) || _.isEmpty(value));

				const keys = Object.keys(memberOmitted);

				if (!keys.length) {
					continue;
				}

				await queryInterface.sequelize.query(
					`
            UPDATE
              members
            SET
              ${keys.map((key) => `\`${key}\` = :${key}`).join(' ,')}
            WHERE
              \`memberId\` = :memberId
          `,
					{
						type: Sequelize.QueryTypes.UPDATE,
						replacements: {
							memberId: member.memberId,
							...keys.reduce((prev, key) => {
								return {
									...prev,
									[key]: moment(_.get(memberOmitted, key)).format('YYYY-MM-DD'),
								};
							}, {}),
						},
						transaction,
					},
				);
			}
			await transaction.commit();
		} catch (error) {
			writeLog('🚀 ~ file: 20240923084147-format-customer-registration-datestring-to-date.ts:77 ~ up ~ error:', 'info');
			await transaction.rollback();
		}
	},

	async down() {
		// backup data before run
	},
} satisfies Migration;
