// Error object used in error handling middleware function
export class AppError extends Error {
	statusCode: number;
	isLog: boolean;

	constructor(statusCode: number, message: string, isLog = true) {
		super(message);

		Object.setPrototypeOf(this, new.target.prototype);
		this.name = Error.name;
		this.statusCode = statusCode;
		this.isLog = isLog;
		Error.captureStackTrace(this);
	}
}
