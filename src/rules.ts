export type IRuleSet = {[key: string]: (value: any, valueB?: any, valueC?: any) => boolean | string}

export default class Rules {
  static required (value: Array<any> | string = ''): boolean {
    return (Array.isArray(value) && value.length > 0) || (typeof value === 'string' && !!value) || (typeof value === 'boolean' && value) || (typeof value === 'object' && !Array.isArray(value) && value !== null) || (typeof value === 'number' && !isNaN(value));
  }

  static email (value = ''): boolean {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(value).toLowerCase());
  }

  static minLength (value = '', min = 8, allowEmpty = false): boolean {
    return (!value && allowEmpty) || (value || '').length >= min;
  }

  static maxLength (value = '', max = 16): boolean {
    return (value || '').length <= max;
  }

  static betweenLength(value = '', min: number | null = null, max: number | null = null, allowEmpty = false) {
    return (!min || this.minLength(value, min, allowEmpty)) && (!max || this.maxLength(value, max));
  }

  static isBetween(value = 0, min: number | null = null, max: number | null = null) {
    return !(
      (min !== null && max !== null && (value < min || value > max)) ||
      (min !== null && value < min) ||
      (max !== null && value > max)
    );
  }

  static isBetweenDates(value = new Date(), min: Date | null = null, max: Date | null = null) {
    return !(
      (min !== null && max !== null && (value < min || value > max)) ||
      (min !== null && value < min) ||
      (max !== null && value > max)
    );
  }

  static identical (compare = '', value = ''): boolean {
    return value === compare;
  }

  static digit(value:string|number = ''): boolean {
    return Number.isInteger(Number(value)) && value !== null;
  }

  static boolean(value:boolean|string|number = '') : boolean {
    return typeof value === 'boolean' || value === '1' || value === '0' || value === 1 || value === 0;
  }

  // The password is at least 8 characters long (?=.{8,}).
  // The password has at least one uppercase letter (?=.*[A-Z]).
  // The password has at least one lowercase letter (?=.*[a-z]).
  // The password has at least one digit (?=.*[0-9]).
  // The password has at least one special character ([^A-Za-z0-9]).
  // Strong: The password has to meet all the requirements.
  static strongPassword(value:string) {
    return (/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])(?=.{8,})/.test(value));
  }

  // If the password is at least six characters long and meets all the other requirements, or has no digit but meets the rest of the requirements.
  static mediumPassword(value:string) {
    return (/((?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])(?=.{6,}))|((?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9])(?=.{8,}))/.test(value));
  }

  static password(value:string) {
    return this.betweenLength(value, 8, 36) && this.hasLowerCase(value) && this.hasUpperCase(value) && this.hasDigit(value);
  }

  static hasLowerCase(value:string) {
    return (/[a-z]/.test(value));
  }

  static hasUpperCase(value:string) {
    return (/[A-Z]/.test(value));
  }

  static hasDigit(value:string) {
    return (/[0-9]/.test(value));
  }

  static isPositive(value: number): boolean {
    return value > 0;
  }

  static isNegative(value: number): boolean {
    return value < 0;
  }

  static isFuture(value: Date): boolean {
    const today = new Date();
    return value > today;
  }

  static hasSpecialChar(value:string) {
    return (/[^A-Za-z0-9]/.test(value));
  }

  // ^[a-zA-Z0-9]+$
  static alphanumeric(value:string) {
    return (/[^\w]|_/g.test(value));
  }

  static isUrl(value:string) {
    try {
      const url = new URL(value);
      return true;
    } catch (err) {
      return false;
    }
  }

  static isValidHttpUrl(value:string) {
    try {
      const newUrl = new URL(value);
      return newUrl.protocol === 'http:' || newUrl.protocol === 'https:';
    } catch (err) {
      return false;
    }
  }
}
