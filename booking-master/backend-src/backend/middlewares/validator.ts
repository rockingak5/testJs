import addFormats from 'ajv-formats';
import { Validator } from 'express-json-validator-middleware';

const { validate, ajv } = new Validator({});

addFormats(ajv, [
	'date-time',
	'time',
	'date',
	'email',
	'hostname',
	'ipv4',
	'ipv6',
	'uri',
	'uri-reference',
	'uuid',
	'uri-template',
	'json-pointer',
	'relative-json-pointer',
	'regex',
]);

export { ajv, validate };
