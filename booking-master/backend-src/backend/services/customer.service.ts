import { Attributes, CreationAttributes, Op, Transaction, WhereAttributeHash, FindOptions } from 'sequelize';
import { SYSTEM_ERROR } from '../config/constants';
import { db } from '../models';
import type { SystemSetting } from '~models/systemSettingModel';
import type { Member } from '~models/memberModel';
import { AppError } from '~utilities/appErrorUtil';

export class CustomerService {
	static async createCustomer(params: CreationAttributes<Member>, transaction?: Transaction) {
		return db.members.create(params, { transaction });
	}
	static async importCustomerData(params: CreationAttributes<Member>[], transaction?: Transaction) {
		return db.members.bulkCreate(params, {
			fields: [
				'memberCode',
				'telephone',
				'fullName',
				'furiganaName',
				'telephone2',
				'telephone3',
				'postalCode',
				'address',
				'agent',
				'origin',
				'prefecture',
				'city',
				'areaCode',
				'building',
			],
			updateOnDuplicate: [
				'telephone',
				'fullName',
				'furiganaName',
				'telephone2',
				'telephone3',
				'postalCode',
				'address',
				'agent',
				'origin',
				'prefecture',
				'city',
				'areaCode',
				'building',
			],
			transaction,
		});
	}
	static async newRegistration(
		customerLine: lineProfile,
		params: {
			body?: string;
			fullName?: string;
			furiganaName?: string;
			companyName?: string;
			telephone?: string;
			email?: string;
			via?: memberViaType;
			postalCode?: string;
			prefecture?: string;
			city?: string;
			areaCode?: string;
			building?: string;
			address?: string;
		},
	) {
		if (params.body) throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);

		if (
			!(params.fullName && params.furiganaName && params.companyName && params.telephone && params.email && params.via)
		) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}
		let customer = await CustomerService.getCustomer({
			lineId: customerLine.userId,
		});
		if (customer == null) {
			customer = await CustomerService.createCustomer({
				lineId: customerLine.userId,
				displayName: customerLine.displayName,
				picUrl: customerLine.pictureUrl,
				companyName: params.companyName,
				fullName: params.fullName,
				furiganaName: params.furiganaName,
				email: params.email,
				telephone: params.telephone,
				postalCode: params.postalCode, //EncryptionUtility.sanitizePostalCode(params.postalCode),
				prefecture: params.prefecture,
				city: params.city,
				areaCode: params.areaCode,
				building: params.building,
				address: params.address,
				origin: 'new',
				via: params.via,
			});
		} else {
			customer.set({
				displayName: customerLine.displayName,
				picUrl: customerLine.pictureUrl,
				companyName: params.companyName,
				fullName: params.fullName,
				furiganaName: params.furiganaName,
				email: params.email,
				telephone: params.telephone,
				postalCode: params.postalCode, //EncryptionUtility.sanitizePostalCode(params.postalCode),
				prefecture: params.prefecture,
				city: params.city,
				areaCode: params.areaCode,
				building: params.building,
				address: params.address,
				origin: customer.origin ?? 'new',
			});
			if (customer.changed()) customer = await customer.save();
		}
		return customer;
	}
	static async confirmCustomer(customerLine: lineProfile, params: { customerId: number }) {
		if (!params.customerId) throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);

		const customer = await CustomerService.getCustomer(
			{ memberId: params.customerId, lineId: null },
			{
				attributes: ['customerId', 'displayName', 'fullName', 'isConfirmed'],
			},
		);
		if (customer == null) throw new AppError(SYSTEM_ERROR, `confirmCustomer not found ${params.customerId}`, false);

		customer
			.set('lineId', customerLine.userId)
			.set('displayName', customerLine.displayName)
			.set('picUrl', customerLine.pictureUrl);
		await customer.save();
		return customer;
	}
	static async getCustomerAPI(customerLine: lineProfile, transaction?: Transaction) {
		const customer = await CustomerService.getCustomerByLineId(customerLine.userId, undefined, transaction);
		if (customer) {
			customer.set('displayName', customerLine.displayName);
			customer.set('picUrl', customerLine.pictureUrl);
			if (customer.changed()) await customer.save({ transaction });
		}
		return customer;
	}
	static async findByTel(customerLine: lineProfile, params: { name: string; tel: string }) {
		if (!params.tel) throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		if (params.tel.length < 10) throw new AppError(SYSTEM_ERROR, 'invalid telephone length', false);

		const customer = await CustomerService.getCustomer(
			{ telephone: params.tel, lineId: null },
			{
				attributes: ['customerId', 'fullName', 'telephone', 'isConfirmed'],
			},
		);
		return customer;
	}
	static async getCustomerByLineId(
		lineId: string,
		pointSettings?: SystemSetting | null,
		transaction?: Transaction,
	): Promise<Member | null> {
		const exclude = ['notes', 'customerCode', 'agent'];
		if (pointSettings == null) exclude.push('currentPoints');
		return db.members.findOne({
			where: { lineId: lineId },
			attributes: { exclude: exclude },
			transaction,
		});
	}
	static async getCustomer(customerWhere: WhereAttributeHash<Attributes<Member>>, options: FindOptions = {}) {
		return db.members.findOne({
			where: customerWhere,
			...options,
		});
	}
	//, pointSettings?: SystemSetting | null
	//attributes: { exclude: pointSettings == null ? ['currentPoints'] : [] },
	static async getCustomerWithDetails(customerId: number, details: string[]) {
		const include = [];
		if (details.includes('chats')) include.push({ association: db.members.associations.chats });
		return db.members.findOne({ where: { memberId: customerId }, include });
	}
	static async listCustomers(customerWhere: WhereAttributeHash<Attributes<Member>>, options: FindOptions = {}) {
		return db.members.findAll({ where: customerWhere, ...options });
	}
	static async browseCustomers(
		params: Record<string, string | number | undefined>,
		pointSettings: SystemSetting | null,
	) {
		const exclude = [];
		if (pointSettings == null) exclude.push('currentPoints');
		const condition = {
			limit: parseInt(params.pp as string) || 20,
			offset: parseInt(params.p as string) || 1,
			sort: params.sort == 'asc' ? 'asc' : 'desc',
			sortKey: params.sortKey ? (params.sortKey as string) : 'customerId',
		};
		const where: any = {};
		if (params.fullName) where.fullName = { [Op.substring]: params.fullName };
		if (params.furiganaName) where.furiganaName = { [Op.substring]: params.furiganaName };
		if (params.companyName) where.companyName = { [Op.substring]: params.companyName };
		if (params.email) where.email = { [Op.substring]: params.email };
		if (params.postalCode) where.postalCode = { [Op.substring]: params.postalCode };
		// if (params.postalCode) where.postalCode = { [Op.substring]: params.postalCode.length > 2 ? EncryptionUtility.sanitizePostalCode(params.postalCode) : params.postalCode }
		if (params.telephone && params.address) {
			where[Op.and] = [
				{
					[Op.or]: [
						{ telephone: { [Op.substring]: params.telephone } },
						{ telephone2: { [Op.substring]: params.telephone } },
						{ telephone3: { [Op.substring]: params.telephone } },
					],
				},
				{
					[Op.or]: [
						{ address: { [Op.substring]: params.address } },
						{ prefecture: { [Op.substring]: params.address } },
						{ city: { [Op.substring]: params.address } },
						{ areaCode: { [Op.substring]: params.address } },
						{ building: { [Op.substring]: params.address } },
					],
				},
			];
		} else if (params.telephone) {
			where[Op.or] = [
				{ telephone: { [Op.substring]: params.telephone } },
				{ telephone2: { [Op.substring]: params.telephone } },
				{ telephone3: { [Op.substring]: params.telephone } },
			];
		} else if (params.address) {
			where[Op.or] = [
				{ address: { [Op.substring]: params.address } },
				{ prefecture: { [Op.substring]: params.address } },
				{ city: { [Op.substring]: params.address } },
				{ areaCode: { [Op.substring]: params.address } },
				{ building: { [Op.substring]: params.address } },
			];
		}
		if (params.notes) where.notes = { [Op.substring]: params.notes };
		if (params.agent) where.agent = { [Op.substring]: params.agent };
		if (params.customerCode) where.customerCode = { [Op.substring]: params.customerCode };
		if (Array.isArray(params.origin) && params.origin.length > 0) where.origin = { [Op.in]: params.origin };
		if (params.via) where.via = { [Op.in]: params.via };
		if (params.type) where.type = { [Op.in]: params.type };

		if (params.hasLine === 1) where.lineId = { [Op.not]: null };
		else if (params.hasLine === 0) where.lineId = { [Op.is]: null };

		// if (params.updatedMax && params.updatedMin) where.updatedAt = { [Op.between]: [params.updatedMin, params.updatedMax] }
		// else if (params.updatedMax) { where.updatedAt = { [Op.lte]: params.updatedMax } }
		// else if (params.updatedMin) { where.updatedAt = { [Op.gte]: params.updatedMin } }
		// if (params.createdMax && params.createdMin) where.createdAt = { [Op.between]: [params.createdMin, params.createdMax] }
		// else if (params.createdMax) { where.createdAt = { [Op.lte]: params.createdMax } }
		// else if (params.createdMin) { where.createdAt = { [Op.gte]: params.createdMin } }
		const customers = await db.members.findAndCountAll({
			where: where,
			// include: { where: customerWhere, association: db.members.associations.inquiries, attributes: ['inquiryId', 'description', 'status', 'createdAt'] },
			// distinct: true,
			attributes: { exclude: exclude },
			limit: condition.limit,
			offset: (condition.offset - 1) * condition.limit,
			order: [[condition.sortKey, condition.sort]],
		});
		return {
			pp: condition.limit,
			p: condition.offset,
			sort: condition.sort,
			sortKey: condition.sortKey,
			...customers,
		};
	}
	static async updateCustomer(customerWhere: WhereAttributeHash<Attributes<Member>>, params: object) {
		return db.members.update(params, {
			where: customerWhere,
		});
	}
	static async deleteCustomer(id: number) {
		return (await db.members.destroy({ where: { memberId: id } })) > 0;
	}
}
