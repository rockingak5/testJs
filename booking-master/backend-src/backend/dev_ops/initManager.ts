import 'dotenv/config';
import { log } from 'console';
import { db } from '../models';
import { createHash } from '../utilities';
import { DataTypes, Transaction } from 'sequelize';
async function syncDB() {
	return db.sequelize.authenticate();
}
syncDB()
	.then(async () => {
		if (process.env.MANAGER_ID && process.env.MANAGER_PW && process.env.MANAGER_MAIL) {
			const master = await db.managers.findOne({ where: { username: process.env.MANAGER_ID } });
			if (master == null) {
				await db.managers.create({
					username: process.env.MANAGER_ID as string,
					pwhash: await createHash(process.env.MANAGER_PW),
					recoveryMail: process.env.MANAGER_MAIL as string,
					authLevel: 10,
					isActivated: true,
				});
			}
		} else {
			throw new Error('manager id | pw | email not set');
		}
		const customerRegistration = await db.customerRegistrations.findOne();
		if (customerRegistration == null) {
			let transaction: Transaction | null = null;
			const queryInterface = db.sequelize.getQueryInterface();
			transaction = await db.sequelize.transaction();
			const dataCustomerRegistrationCreate = [
				{
					customerRegistrationId: 1,
					isDelete: false,
					required: true,
					isDisplayed: true,
					label: '氏名（フリガナ）',
					type: 'text',
					showOrder: 1,
					isAdminDisplayed: true,
				},
				{
					customerRegistrationId: 2,
					isDelete: false,
					required: true,
					isDisplayed: true,
					label: '電話番号',
					type: 'number',
					showOrder: 2,
					isAdminDisplayed: true,
				},
				{
					customerRegistrationId: 3,
					isDelete: false,
					required: true,
					isDisplayed: true,
					label: '郵便番号',
					type: 'text',
					showOrder: 3,
					isZipCode: true,
					isAdminDisplayed: true,
				},
				{
					customerRegistrationId: 4,
					isDelete: false,
					required: true,
					isDisplayed: true,
					label: '住所',
					type: 'text',
					showOrder: 4,
					isAddress: true,
					isAdminDisplayed: true,
				},
			];
			await db.customerRegistrations.bulkCreate(dataCustomerRegistrationCreate, { transaction });
			await Promise.all(
				dataCustomerRegistrationCreate.map((item) =>
					queryInterface.addColumn(
						'members',
						`customerRegistrationId${item.customerRegistrationId}`,
						{
							type: DataTypes.STRING,
							defaultValue: null,
							allowNull: true,
						},
						{ transaction },
					),
				),
			);
		}
	})
	.then(() => {
		log('init manager finished', 'info');
		process.exit(0);
	})
	.catch((e) => {
		throw e;
	});
