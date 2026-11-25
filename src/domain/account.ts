/** The account form's fields that can be wrong before anything is sent. */
export type AccountFields = { email?: string; password?: string; code?: string };
/** A field an account error can belong to. An error with none (the service, the network) is for the whole form. */
export type Field = keyof AccountFields;
export type AccountErrors = Partial<Record<Field, string>>;

/**
 * What is wrong with the account form, in the words shown under each field. Only the fields passed in (the ones
 * on show) are checked; an empty result means the form can be sent.
 */
export function checkAccountFields({ email, password, code }: AccountFields): AccountErrors {
  const errors: AccountErrors = {};
  if (email !== undefined) {
    if (!email) errors.email = 'Enter your email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter an email address like name@example.com.';
  }
  if (password !== undefined) {
    if (!password) errors.password = 'Enter your password.';
    else if (password.length < 8) errors.password = 'Use 8 characters or more.';
  }
  if (code !== undefined && !/^\d{6}$/.test(code)) errors.code = 'Enter the 6-digit code from the email.';
  return errors;
}
