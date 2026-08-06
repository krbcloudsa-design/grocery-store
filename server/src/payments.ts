import type {
  CardDetails,
  CartLine,
  PaymentError,
  PaymentIntent,
  PaymentMethodType,
} from '../../shared/types.js';
import { inventory } from './inventory.js';
import { priceOrder, toOrderLines } from './pricing.js';
import { productById } from './data/catalog.js';

/**
 * Simulated payment service provider.
 *
 * It reproduces the parts of a real gateway that the storefront has to handle:
 * an intent whose status advances server-side, card validation, step-up
 * authentication for 3-D Secure cards, typed decline codes, and an inventory
 * hold that is committed only when the charge succeeds. Swapping this module
 * for a live PSP means replacing the three `*Intent` functions below; the HTTP
 * surface and the client flow stay the same.
 */

/** Card numbers that force a specific gateway outcome, as PSP sandboxes do. */
const TEST_CARDS: Record<string, { outcome: 'succeed' | 'challenge'; error?: PaymentError }> = {
  '4242424242424242': { outcome: 'succeed' },
  '5555555555554444': { outcome: 'succeed' },
  '378282246310005': { outcome: 'succeed' },
  '4000000000003220': { outcome: 'challenge' },
  '4000000000000002': {
    outcome: 'succeed',
    error: { code: 'card_declined', message: 'Your bank declined this card.', field: 'number' },
  },
  '4000000000009995': {
    outcome: 'succeed',
    error: {
      code: 'insufficient_funds',
      message: 'There are not enough funds on this card.',
      field: 'number',
    },
  },
  '4000000000000069': {
    outcome: 'succeed',
    error: { code: 'expired_card', message: 'This card has expired.', field: 'expiry' },
  },
};

export const testCardGuide = [
  { number: '4242 4242 4242 4242', behaviour: 'Payment succeeds' },
  { number: '4000 0000 0000 3220', behaviour: 'Requires 3-D Secure step-up (OTP 123456)' },
  { number: '4000 0000 0000 0002', behaviour: 'Declined by issuer' },
  { number: '4000 0000 0000 9995', behaviour: 'Insufficient funds' },
];

const OTP_CODE = '123456';
const MAX_OTP_ATTEMPTS = 3;

interface IntentRecord {
  intent: PaymentIntent;
  userId: string;
  cart: CartLine[];
  reservationId: string | null;
  method: PaymentMethodType | null;
  card: { brand: string; last4: string } | null;
  otpAttempts: number;
  deliverySlot: string;
}

const intents = new Map<string, IntentRecord>();
let intentSeq = 0;

export interface CreateIntentInput {
  userId: string;
  cart: CartLine[];
  tip?: number;
  promoCode?: string | null;
  deliverySlot: string;
}

export type CreateIntentResult =
  | { ok: true; intent: PaymentIntent }
  | { ok: false; status: number; error: PaymentError; unavailable?: { productId: string; name: string; available: number }[] };

export function createIntent(input: CreateIntentInput): CreateIntentResult {
  const lines = toOrderLines(input.cart);
  if (lines.length === 0) {
    return {
      ok: false,
      status: 400,
      error: { code: 'out_of_stock', message: 'Your basket is empty.' },
    };
  }

  const held = inventory.reserve(lines.map(({ productId, quantity }) => ({ productId, quantity })));
  if (!held.ok) {
    return {
      ok: false,
      status: 409,
      error: {
        code: 'out_of_stock',
        message: 'Some items sold out while you were shopping.',
      },
      unavailable: held.failures.map((failure) => ({
        productId: failure.productId,
        name: productById.get(failure.productId)?.name ?? failure.productId,
        available: failure.available,
      })),
    };
  }

  const id = `pi_${(++intentSeq).toString().padStart(4, '0')}${Date.now().toString(36)}`;
  const breakdown = priceOrder(lines, { tip: input.tip, promoCode: input.promoCode });
  const intent: PaymentIntent = {
    id,
    clientSecret: `${id}_secret_${Math.random().toString(36).slice(2, 12)}`,
    status: 'requires_payment_method',
    amount: breakdown.total,
    currency: 'usd',
    breakdown,
    lines,
    nextAction: null,
    lastError: null,
    reservationExpiresAt: held.expiresAt,
    createdAt: Date.now(),
  };

  intents.set(id, {
    intent,
    userId: input.userId,
    cart: input.cart.map((line) => ({ ...line })),
    reservationId: held.id,
    method: null,
    card: null,
    otpAttempts: 0,
    deliverySlot: input.deliverySlot,
  });
  return { ok: true, intent };
}

export function getIntent(id: string): IntentRecord | undefined {
  return intents.get(id);
}

export type ConfirmResult =
  | { ok: true; intent: PaymentIntent; record: IntentRecord }
  | { ok: false; status: number; error: PaymentError; intent?: PaymentIntent };

export interface ConfirmInput {
  method: PaymentMethodType;
  card?: CardDetails;
  vpa?: string;
}

export async function confirmIntent(id: string, input: ConfirmInput): Promise<ConfirmResult> {
  const record = intents.get(id);
  if (!record) {
    return {
      ok: false,
      status: 404,
      error: { code: 'card_declined', message: 'This payment session no longer exists.' },
    };
  }
  if (record.intent.status === 'succeeded') {
    return { ok: true, intent: record.intent, record };
  }
  if (!record.reservationId || !inventory.isReservationActive(record.reservationId)) {
    return fail(record, {
      code: 'reservation_expired',
      message: 'Your items were released because checkout took too long. Please try again.',
    });
  }

  if (input.method === 'card') {
    const card = input.card;
    const validation = validateCard(card);
    if (validation) return fail(record, validation);

    const digits = normaliseNumber(card!.number);
    record.method = 'card';
    record.card = { brand: cardBrand(digits), last4: digits.slice(-4) };

    record.intent.status = 'processing';
    await delay(900);

    const scripted = TEST_CARDS[digits];
    if (scripted?.error) return fail(record, scripted.error);
    if (scripted?.outcome === 'challenge') {
      record.intent.status = 'requires_action';
      record.intent.nextAction = {
        type: 'otp_challenge',
        deliveryTarget: `SMS to •••• ${digits.slice(-4)}`,
      };
      record.intent.lastError = null;
      return { ok: true, intent: record.intent, record };
    }
    return succeed(record);
  }

  if (input.method === 'upi') {
    const vpa = input.vpa?.trim() ?? '';
    if (!/^[a-z0-9._-]{3,}@[a-z]{3,}$/i.test(vpa)) {
      return fail(record, {
        code: 'invalid_vpa',
        message: 'Enter a UPI ID in the form name@bank.',
        field: 'vpa',
      });
    }
    record.method = 'upi';
    record.card = null;
    record.intent.status = 'processing';
    await delay(900);
    if (vpa.toLowerCase().startsWith('fail@')) {
      return fail(record, { code: 'card_declined', message: 'The UPI app rejected this request.', field: 'vpa' });
    }
    return succeed(record);
  }

  record.method = input.method;
  record.card = null;
  record.intent.status = 'processing';
  await delay(input.method === 'cash' ? 300 : 700);
  return succeed(record);
}

export async function authenticateIntent(id: string, otp: string): Promise<ConfirmResult> {
  const record = intents.get(id);
  if (!record) {
    return {
      ok: false,
      status: 404,
      error: { code: 'card_declined', message: 'This payment session no longer exists.' },
    };
  }
  if (record.intent.status !== 'requires_action') {
    return fail(record, {
      code: 'authentication_failed',
      message: 'This payment is not waiting for authentication.',
    });
  }
  await delay(700);
  if (otp.trim() !== OTP_CODE) {
    record.otpAttempts += 1;
    const attemptsLeft = MAX_OTP_ATTEMPTS - record.otpAttempts;
    if (attemptsLeft <= 0) {
      return fail(record, {
        code: 'authentication_failed',
        message: 'Too many incorrect codes. Start the payment again.',
        field: 'otp',
      });
    }
    record.intent.status = 'requires_action';
    record.intent.lastError = {
      code: 'authentication_failed',
      message: `That code is not right. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left.`,
      field: 'otp',
    };
    return { ok: false, status: 402, error: record.intent.lastError, intent: record.intent };
  }
  return succeed(record);
}

export function cancelIntent(id: string): boolean {
  const record = intents.get(id);
  if (!record || record.intent.status === 'succeeded') return false;
  if (record.reservationId) inventory.release(record.reservationId);
  record.reservationId = null;
  record.intent.status = 'canceled';
  record.intent.nextAction = null;
  return true;
}

function succeed(record: IntentRecord): ConfirmResult {
  record.intent.status = 'succeeded';
  record.intent.nextAction = null;
  record.intent.lastError = null;
  return { ok: true, intent: record.intent, record };
}

function fail(record: IntentRecord, error: PaymentError): ConfirmResult {
  record.intent.status = error.code === 'reservation_expired' ? 'canceled' : 'requires_payment_method';
  record.intent.nextAction = null;
  record.intent.lastError = error;
  return { ok: false, status: 402, error, intent: record.intent };
}

function validateCard(card: CardDetails | undefined): PaymentError | null {
  if (!card) {
    return { code: 'incomplete_card', message: 'Enter your card details.', field: 'number' };
  }
  if (!card.name?.trim()) {
    return { code: 'incomplete_card', message: 'Enter the name printed on the card.', field: 'name' };
  }
  const digits = normaliseNumber(card.number);
  if (digits.length < 13 || digits.length > 19 || !luhn(digits)) {
    return { code: 'invalid_number', message: 'That card number is not valid.', field: 'number' };
  }
  const expiry = parseExpiry(card.expiry);
  if (!expiry) {
    return { code: 'invalid_expiry', message: 'Use the MM/YY format.', field: 'expiry' };
  }
  if (expiry.getTime() < Date.now()) {
    return { code: 'invalid_expiry', message: 'This card has expired.', field: 'expiry' };
  }
  const cvcLength = cardBrand(digits) === 'American Express' ? 4 : 3;
  if (!new RegExp(`^\\d{${cvcLength}}$`).test(card.cvc.trim())) {
    return {
      code: 'invalid_cvc',
      message: `The security code must be ${cvcLength} digits.`,
      field: 'cvc',
    };
  }
  return null;
}

function normaliseNumber(value: string): string {
  return value.replace(/\D/g, '');
}

export function cardBrand(digits: string): string {
  if (/^4/.test(digits)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'American Express';
  if (/^6(011|5)/.test(digits)) return 'Discover';
  if (/^35/.test(digits)) return 'JCB';
  return 'Card';
}

function parseExpiry(value: string): Date | null {
  const match = /^(\d{2})\s*\/?\s*(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return null;
  // Cards stay valid through the last day of the printed month.
  return new Date(year, month, 0, 23, 59, 59);
}

function luhn(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let value = digits.charCodeAt(index) - 48;
    if (double) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
    double = !double;
  }
  return sum % 10 === 0;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
