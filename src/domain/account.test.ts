import { describe, expect, it } from 'vitest';
import { checkAccountFields } from './account';

describe('checkAccountFields', () => {
  it('passes filled-in fields', () => {
    expect(checkAccountFields({ email: 'user@example.com', password: 'password1', code: '123456' })).toEqual({});
  });

  it('names what is missing or wrong, field by field', () => {
    expect(checkAccountFields({ email: '', password: '', code: '' })).toEqual({
      email: 'Enter your email address.',
      password: 'Enter your password.',
      code: 'Enter the 6-digit code from the email.',
    });
    expect(checkAccountFields({ email: 'user@example', password: 'short', code: '12345' })).toEqual({
      email: 'Enter an email address like name@example.com.',
      password: 'Use 8 characters or more.',
      code: 'Enter the 6-digit code from the email.',
    });
  });

  it('checks only the fields on show', () => {
    expect(checkAccountFields({ code: '' })).toEqual({ code: 'Enter the 6-digit code from the email.' });
  });
});
