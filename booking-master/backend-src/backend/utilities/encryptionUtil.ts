import bcrypt = require('bcryptjs');
import { generate } from 'generate-password';
import jwt = require('jsonwebtoken');
import { systemConfig } from '../config';
const saltRounds = 10;
const signJWT = (data: string | object | Buffer, key = systemConfig.ENC_SEC as string) => jwt.sign(data, key);

const decodeJWT = (data: string) => jwt.decode(data);

const verifyJWT = (token: string, key: string, options?: jwt.VerifyOptions & { complete: true }) =>
	jwt.verify(token, key, options) as jwt.JwtPayload;

const createHash = async (data: string): Promise<string> => bcrypt.hash(data, saltRounds);

const comparePassword = async (data: string, hash: string): Promise<boolean> => bcrypt.compare(data, hash);

const generateToken = (length = 32) => generate({ length: length, numbers: true });

export { signJWT, decodeJWT, verifyJWT, createHash, comparePassword, generateToken };
