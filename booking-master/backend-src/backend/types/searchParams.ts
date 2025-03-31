/* eslint-disable @typescript-eslint/no-unused-vars */
interface searchParams {
	pp: number | string; //per page
	p: number | string; //page
	sort: 'asc' | 'desc' | undefined; //asc | desc | undefined, default - asc
	sortKey: string; //sort key
}
interface lotteriesSearchParams extends searchParams {}
interface inquirySearchParams extends searchParams {
	fullName?: string;
	furiganaName?: string;
	companyName?: string;
	telephone?: string;
	customerCode?: string;
	email?: string;
	postalCode?: string;
	address?: string;
	prefecture?: string;
	city?: string;
	areaCode?: string;
	building?: string;
	notes?: string;
	inquiryStatus?: string[];
	via: string[];
	type: inquiryType[];
	createdMax?: Date;
	createdMin?: Date;
}
interface questionSearchParams extends searchParams {
	questionId?: number;
	questionType?: string;
	title: string;
	answer: string;
	updatedMax?: Date;
	updatedMin?: Date;
	createdMax?: Date;
	createdMin?: Date;
}
interface customerSearchParams extends searchParams {
	fullName?: string;
	displayName?: string;
	postalCode?: string;
	address?: string;
	prefecture?: string;
	city?: string;
	areaCode?: string;
	building?: string;
	telephone?: string;
	email?: string;
	updatedMax?: Date;
	updatedMin?: Date;
	createdMax?: Date;
	createdMin?: Date;
	notes?: string;
	hasLine?: number;
	origin?: string[];
}
