/**
 * Auth constants shared between server and client code.
 *
 * Kept separate from password.ts because that module imports node:crypto, and
 * the signup form (a client component) needs the length rules for its input
 * attributes. Importing them from here keeps crypto out of the browser bundle.
 */
export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 200;
