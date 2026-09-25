import { z } from 'zod';

export const isEmail = (value: string) => z.email().safeParse(value).success;
