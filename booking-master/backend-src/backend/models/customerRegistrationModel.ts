import {
	Sequelize,
	Model,
	Association,
	DataTypes,
	CreationOptional,
	InferAttributes,
	InferCreationAttributes,
	NonAttribute,
} from 'sequelize';
import { CampaignChoice } from './campaignChoiceModel';
import { DATABASE_TABLE_NAME } from '~config';
export class CustomerRegistration extends Model<
	InferAttributes<CustomerRegistration, { omit: 'campaignChoices' }>,
	InferCreationAttributes<CustomerRegistration, { omit: 'campaignChoices' }>
> {
	//ATTRIBUTES
	declare customerRegistrationId: CreationOptional<number>;
	declare required: boolean;
	declare isDisplayed: boolean;
	declare isAdminDisplayed: boolean;
	declare isDelete?: boolean;
	declare isDefault?: boolean;
	declare label: string;
	declare type: string;
	declare name?: string;
	declare showOrder: CreationOptional<number>;
	//ASSOCIATIONS
	declare campaignChoices?: NonAttribute<CampaignChoice[]>;
	declare static associations: {
		campaignChoices: Association<CampaignChoice, CustomerRegistration>;
	};
	declare isZipCode?: boolean;
	declare isAddress?: boolean;
	static initClass = (sequelize: Sequelize) =>
		CustomerRegistration.init(
			{
				customerRegistrationId: {
					type: DataTypes.INTEGER({ unsigned: true }),
					primaryKey: true,
					autoIncrement: true,
				},
				required: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
				isDisplayed: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
				isDelete: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true },
				label: { type: DataTypes.STRING, allowNull: false },
				type: { type: DataTypes.STRING, allowNull: false },
				showOrder: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
				isZipCode: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
				isAddress: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
				isDefault: {
					type: DataTypes.BOOLEAN,
					defaultValue: false,
					allowNull: false,
				},
				name: {
					type: DataTypes.STRING,
					allowNull: true,
					defaultValue: null,
				},
				isAdminDisplayed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
			},
			{
				sequelize: sequelize,
				timestamps: false,
				tableName: DATABASE_TABLE_NAME.CUSTOMER_REGISTRATIONS,
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				name: {
					singular: 'CustomerRegistration',
					plural: 'customerRegistrations',
				},
			},
		);
}
