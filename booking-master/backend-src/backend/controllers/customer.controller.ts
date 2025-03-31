import { NextFunction, Request, Response } from 'express';
import { UniqueConstraintError } from 'sequelize';
import { CONFLICT_ERROR, RESPONSE_SUCCESS, SYSTEM_ERROR } from '../config/constants';
import { socketIO } from '~loaders/socketioLoader';
import { AppError } from '~utilities/appErrorUtil';
import { getBot } from '~services/linebot.service';
import { CustomerService } from '~services';
import { AppSettingService } from '~services/appSetting.service';
import { RichmenuService } from '~services/richmenu.service';
export class CustomerController {
	static create = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const {
				customerCode,
				fullName,
				furiganaName,
				telephone,
				telephone2,
				telephone3,
				email,
				postalCode,
				prefecture,
				city,
				areaCode,
				building,
				address,
				currentPoints,
				notes,
				agent,
				via,
			} = req.body;
			const customer = await CustomerService.createCustomer({
				memberCode: customerCode || null,
				fullName: fullName,
				furiganaName: furiganaName,
				telephone: telephone,
				telephone2: telephone2,
				telephone3: telephone3,
				email: email,
				postalCode: postalCode,
				address: address,
				prefecture: prefecture,
				city: city,
				areaCode: areaCode,
				building: building,
				isConfirmed: false,
				currentPoints: currentPoints || 0,
				origin: 'system',
				notes: notes,
				agent: agent,
				via: via,
			});
			socketIO.emit('newCustomer', { customer: customer.memberId });
			res.sendStatus(RESPONSE_SUCCESS);
		} catch (e) {
			if (e instanceof UniqueConstraintError) res.sendStatus(CONFLICT_ERROR);
			else next(e);
		}
	};
	static list = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const customers = await CustomerService.listCustomers(
				{},
				{
					attributes: [['memberId', 'customerId'], 'fullName', 'picUrl', ['memberCode', 'customerCode']],
				},
			);
			res.send(customers);
		} catch (e) {
			next(e);
		}
	};
	// Retrieve all Customers from the database.
	static browse = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const queryParams = req.query as Record<string, string | number>;
			const params = {
				fullName: queryParams.fullName ?? undefined,
				furiganaName: queryParams.furiganaName ?? undefined,
				companyName: queryParams.companyName ?? undefined,
				telephone: queryParams.telephone ?? undefined,
				via: queryParams.via ?? undefined,
				email: queryParams.email ?? undefined,
				postalCode: queryParams.postalCode ?? undefined,
				address: queryParams.address ?? undefined,
				origin: queryParams.origin ?? undefined,
				customerCode: queryParams.customerCode ?? undefined,
				hasLine: queryParams.hasLine ? parseInt(queryParams.hasLine as string) : undefined,
				notes: queryParams.notes,
				agent: queryParams.agent,
				inquiryStatus: queryParams.inquiryStatus ?? undefined,
				type: queryParams.type ?? undefined,
				updatedMax: queryParams.updatedMax ?? undefined,
				updatedMin: queryParams.updatedMin ?? undefined,
				createdMax: queryParams.createdMax ?? undefined,
				createdMin: queryParams.createdMin ?? undefined,
				pp: queryParams.pp ?? undefined,
				p: queryParams.p ?? undefined,
				sortKey: queryParams.sortKey ?? undefined,
				sort: queryParams.sort ?? undefined,
			};
			const pointSettings = await AppSettingService.getSetting({
				label: 'points',
				isPublic: true,
			});
			const customers = await CustomerService.browseCustomers(params, pointSettings);
			if (!customers) throw new AppError(SYSTEM_ERROR, 'not found', false);

			res.send(customers);
		} catch (e) {
			next(e);
		}
	};

	static find = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const customerId = parseInt(req.params.customerId);
			if (!customerId) throw new AppError(SYSTEM_ERROR, 'no customer id', false);

			const customer = await CustomerService.getCustomer({
				memberId: customerId,
			});
			if (!customer) {
				throw new AppError(SYSTEM_ERROR, 'customer not found', false);
			}
			res.send(customer);
		} catch (e) {
			next(e);
		}
	};

	// Update a Customer by the id in the request
	static update = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const customerId = parseInt(req.params.customerId);
			if (!customerId) throw new AppError(SYSTEM_ERROR, 'no customer id', false);

			const params: Record<string, string> = {};
			if (req.body.customerCode != null) params.customerCode = req.body.customerCode ? req.body.customerCode : null;
			if (req.body.companyName != null) params.companyName = req.body.companyName;
			if (req.body.fullName != null) params.fullName = req.body.fullName;
			if (req.body.furiganaName != null) params.furiganaName = req.body.furiganaName;
			if (req.body.telephone != null) params.telephone = req.body.telephone;
			if (req.body.telephone2 != null) params.telephone2 = req.body.telephone2;
			if (req.body.telephone3 != null) params.telephone3 = req.body.telephone3;
			if (req.body.email != null) params.email = req.body.email;
			if (req.body.postalCode != null) params.postalCode = req.body.postalCode; //EncryptionUtility.sanitizePostalCode(req.body.postalCode);
			if (req.body.address != null) params.address = req.body.address;
			if (req.body.prefecture != null) params.prefecture = req.body.prefecture;
			if (req.body.city != null) params.city = req.body.city;
			if (req.body.areaCode != null) params.areaCode = req.body.areaCode;
			if (req.body.building != null) params.building = req.body.building;
			if (req.body.isConfirmed != null) params.isConfirmed = req.body.isConfirmed;
			if (req.body.currentPoints != null) params.currentPoints = req.body.currentPoints;
			if (req.body.notes != null) params.notes = req.body.notes;
			if (req.body.agent != null) params.agent = req.body.agent;
			const updatedCustomer = await CustomerService.updateCustomer({ memberId: customerId }, params);
			if (updatedCustomer[0] > 0) socketIO.emit('updateCustomer', { customer: customerId });
			res.sendStatus(RESPONSE_SUCCESS);
		} catch (e) {
			if (e instanceof UniqueConstraintError) res.sendStatus(CONFLICT_ERROR);
			else next(e);
		}
	};
}
