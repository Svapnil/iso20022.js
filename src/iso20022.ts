import { Party, SWIFTCreditPaymentInstruction, SEPACreditPaymentInstruction, RTPCreditPaymentInstruction, ACHCreditPaymentInstruction } from './lib/types.js';
import { SWIFTCreditPaymentInitiation } from './pain/001/swift-credit-payment-initiation';
import { SEPACreditPaymentInitiation } from './pain/001/sepa-credit-payment-initiation';
import { RTPCreditPaymentInitiation } from './pain/001/rtp-credit-payment-initiation';
import { ACHCreditPaymentInitiation } from './pain/001/ach-credit-payment-initiation';
import { GenericISO20022Message, getISO20022Implementation, ISO20022MessageTypeName } from './lib/interfaces';
export * from './camt';
export * from './lib';

type AtLeastOne<T> = [T, ...T[]];

/**
 * Configuration interface for the ISO20022 class.
 * @interface ISO20022Config
 * @example
 * const config: ISO20022Config = {
 *     initiatingParty: {
 *         name: 'Example Corp',
 *         id: 'EXAMPLECORP',
 *         account: {
 *             accountNumber: '123456789',
 *         },
 *         agent: {
 *             bic: 'CHASUS33',
 *             bankAddress: {
 *                 country: 'US',
 *             },
 *         },
 *     },
 * };
 */
export interface ISO20022Config {
  /**
   * The party initiating the ISO20022 messages.
   * This party is typically the sender of the messages or the entity responsible for the transaction.
   * @type {Party}
   */
  initiatingParty: Party;
}

/**
 * Configuration interface for SWIFT Credit Payment Initiation.
 * @interface SWIFTCreditPaymentInitiationConfig
 * @example
 * const config: SWIFTCreditPaymentInitiationConfig = {
 *     paymentInstructions: [
 *       {
 *         type: 'swift',
 *         direction: 'credit',
 *         amount: 1000,
 *         currency: 'USD',
 *         creditor: {
 *           name: 'Hans Schneider',
 *           account: {
 *             iban: 'DE1234567890123456',
 *           },
 *           agent: {
 *             bic: 'DEUTDEFF',
 *             bankAddress: {
 *               country: 'DE',
 *             },
 *           },
 *           address: {
 *             streetName: 'Hauptstraße',
 *             buildingNumber: '42',
 *             postalCode: '10115',
 *             townName: 'Berlin',
 *             country: 'DE',
 *           },
 *         },
 *         remittanceInformation: 'Invoice payment #123',
 *       },
 *     ],
 *     messageId: 'MSGID123', // Optional
 *     creationDate: new Date(), // Optional
 *     requestedExecutionDate: new Date(), // Optional
 * };
 */
export interface SWIFTCreditPaymentInitiationConfig {
  /**
   * An array of payment instructions.
   * @type {AtLeastOne<SWIFTCreditPaymentInstruction>}
   */
  paymentInstructions: AtLeastOne<SWIFTCreditPaymentInstruction>;

  /**
   * Optional unique identifier for the message. If not provided, a UUID will be generated.
   * @type {string}
   */
  messageId?: string;

  /**
   * Optional creation date for the message. If not provided, current date will be used.
   * @type {Date}
   */
  creationDate?: Date;

  /**
   * Optional requested execution date for the payment. If not provided, the creation date will be used.
   * @type {Date}
   */
  requestedExecutionDate?: Date;
}

/**
 * Configuration interface for SEPA Credit Payment Initiation.
 * @interface SEPACreditPaymentInitiationConfig
 * @example
 * const config: SEPACreditPaymentInitiationConfig = {
 *     paymentInstructions: [
 *       {
 *         type: 'sepa',
 *         direction: 'credit',
 *         amount: 1000, // €10.00 Euros
 *         currency: 'EUR',
 *         creditor: {
 *           name: 'Hans Schneider',
 *           account: {
 *             iban: 'DE1234567890123456',
 *           },
 *         },
 *         remittanceInformation: 'Invoice payment #123',
 *       },
 *     ],
 *     messageId: 'MSGID123', // Optional
 *     creationDate: new Date(), // Optional
 *     requestedExecutionDate: new Date(), // Optional
 * };
 */
export interface SEPACreditPaymentInitiationConfig {
  /**
   * An array of payment instructions.
   * @type {AtLeastOne<SEPACreditPaymentInstruction>}
   */
  paymentInstructions: AtLeastOne<SEPACreditPaymentInstruction>;

  /**
   * Optional unique identifier for the message. If not provided, a UUID will be generated.
   * @type {string}
   */
  messageId?: string;

  /**
   * Optional creation date for the message. If not provided, current date will be used.
   * @type {Date}
   */
  creationDate?: Date;

  /**
   * Optional requested execution date for the payment. If not provided, the creation date will be used.
   * @type {Date}
   */
  requestedExecutionDate?: Date;
}

/**
 * Configuration interface for RTP Credit Payment Initiation.
 * @interface RTPCreditPaymentInitiationConfig
 * @example
 * const config: RTPCreditPaymentInitiationConfig = {
 *     paymentInstructions: [
 *       {
 *         type: 'rtp',
 *         direction: 'credit',
 *         amount: 100000, // $1000.00
 *         currency: 'USD',
 *         creditor: {
 *           name: 'All-American Dogs Co.',
 *           account: {
 *             accountNumber: '123456789012',
 *           },
 *           agent: {
 *             abaRoutingNumber: '37714568112',
 *           },
 *         },
 *         remittanceInformation: '1000 Hot Dogs Feb26',
 *       },
 *     ],
 *     messageId: 'MSGID123', // Optional
 *     creationDate: new Date(), // Optional
 *     requestedExecutionDate: new Date(), // Optional
 * };
 */
export interface RTPCreditPaymentInitiationConfig {
  /**
   * An array of payment instructions.
   * @type {AtLeastOne<RTPCreditPaymentInstruction>}
   */
  paymentInstructions: AtLeastOne<RTPCreditPaymentInstruction>;

  /**
   * Optional unique identifier for the message. If not provided, a UUID will be generated.
   * @type {string}
   */
  messageId?: string;

  /**
   * Optional creation date for the message. If not provided, current date will be used.
   * @type {Date}
   */
  creationDate?: Date;

  /**
   * Optional requested execution date for the payment. If not provided, the creation date will be used.
   * @type {Date}
   */
  requestedExecutionDate?: Date;
}

/**
 * Configuration interface for ACH Credit Payment Initiation.
 * @interface ACHCreditPaymentInitiationConfig
 * @example
 * const config: ACHCreditPaymentInitiationConfig = {
 *     paymentInstructions: [
 *       {
 *         type: 'ach',
 *         direction: 'credit',
 *         amount: 100000, // $1000.00
 *         currency: 'USD',
 *         creditor: {
 *           name: 'John Doe Funding LLC',
 *           account: {
 *             accountNumber: '123456789012',
 *           },
 *           agent: {
 *             abaRoutingNumber: '123456789',
 *           },
 *         },
 *         remittanceInformation: 'Invoice #12345',
 *       },
 *     ],
 *     messageId: 'MSGID123', // Optional
 *     creationDate: new Date(), // Optional
 *     requestedExecutionDate: new Date(), // Optional
 * };
 */
export interface ACHCreditPaymentInitiationConfig {
  /**
   * An array of payment instructions.
   * @type {AtLeastOne<ACHCreditPaymentInstruction>}
   */
  paymentInstructions: AtLeastOne<ACHCreditPaymentInstruction>;

  /**
   * Optional unique identifier for the message. If not provided, a UUID will be generated.
   * @type {string}
   */
  messageId?: string;

  /**
   * Optional creation date for the message. If not provided, current date will be used.
   * @type {Date}
   */
  creationDate?: Date;

  /**
   * Optional requested execution date for the payment. If not provided, the creation date will be used.
   * @type {Date}
   */
  requestedExecutionDate?: Date;
}

/**
 * Represents an ISO20022 core message creator.
 * This class provides methods to create various basic ISO20022 compliant messages.
 *
 * @example
 * const iso20022 = new ISO20022({
 *     initiatingParty: {
 *         name: 'Example Corp',
 *         id: 'EXAMPLECORP',
 *         account: {
 *             accountNumber: '123456789',
 *         },
 *         agent: {
 *             bic: 'CHASUS33',
 *             bankAddress: {
 *                 country: 'US',
 *             },
 *         },
 *     },
 * });
 */
class ISO20022 {
  private initiatingParty: Party;

  /**
   * Creates an instance of ISO20022.
   * @param {ISO20022Config} config - The configuration object for ISO20022.
   */
  constructor(config: ISO20022Config) {
    this.initiatingParty = config.initiatingParty;
  }

  /**
   * Creates a SWIFT Credit Payment Initiation message.
   * @param {SWIFTCreditPaymentInitiationConfig} config - Configuration containing payment instructions and optional parameters.
   * @example
   * const payment = iso20022.createSWIFTCreditPaymentInitiation({
   *   paymentInstructions: [
   *     {
   *       type: 'swift',
   *       direction: 'credit',
   *       amount: 1000,
   *       currency: 'USD',
   *       creditor: {
   *         name: 'Hans Schneider',
   *         account: {
   *           iban: 'DE1234567890123456',
   *         },
   *         agent: {
   *           bic: 'DEUTDEFF',
   *           bankAddress: {
   *             country: 'DE',
   *           },
   *         },
   *         address: {
   *           streetName: 'Hauptstraße',
   *           buildingNumber: '42',
   *           postalCode: '10115',
   *           townName: 'Berlin',
   *           country: 'DE',
   *         },
   *       },
   *       remittanceInformation: 'Invoice payment #123',
   *     },
   *   ],
   *   messageId: 'SWIFT-MSG-001', // Optional
   *   creationDate: new Date('2025-03-01'), // Optional
   *   requestedExecutionDate: new Date('2025-03-03'), // Optional
   * });
   * @returns {SWIFTCreditPaymentInitiation} A new SWIFT Credit Payment Initiation object.
   */
  createSWIFTCreditPaymentInitiation(
    config: SWIFTCreditPaymentInitiationConfig,
  ) {
    return new SWIFTCreditPaymentInitiation({
      initiatingParty: this.initiatingParty,
      paymentInstructions: config.paymentInstructions,
      messageId: config.messageId,
      creationDate: config.creationDate,
      requestedExecutionDate: config.requestedExecutionDate,
    });
  }

  /**
   * Creates a SEPA Credit Payment Initiation message.
   * @param {SEPACreditPaymentInitiationConfig} config - Configuration containing payment instructions and optional parameters.
   * @example
   * const payment = iso20022.createSEPACreditPaymentInitiation({
   *   paymentInstructions: [
   *     {
   *       type: 'sepa',
   *       direction: 'credit',
   *       amount: 1000, // €10.00 Euros
   *       currency: 'EUR',
   *       creditor: {
   *         name: 'Hans Schneider',
   *         account: {
   *           iban: 'DE1234567890123456',
   *         },
   *       },
   *       remittanceInformation: 'Invoice payment #123',
   *     },
   *   ],
   *   messageId: 'SEPA-MSG-001', // Optional
   *   creationDate: new Date('2025-03-01'), // Optional
   *   requestedExecutionDate: new Date('2025-03-03'), // Optional
   * });
   * @returns {SEPACreditPaymentInitiation} A new SEPA Credit Payment Initiation object.
   */
  createSEPACreditPaymentInitiation(
    config: SEPACreditPaymentInitiationConfig,
  ) {
    return new SEPACreditPaymentInitiation({
      initiatingParty: this.initiatingParty,
      paymentInstructions: config.paymentInstructions,
      messageId: config.messageId,
      creationDate: config.creationDate,
      requestedExecutionDate: config.requestedExecutionDate,
    });
  }

  /**
   * Creates a RTP Credit Payment Initiation message.
   * @param {RTPCreditPaymentInitiationConfig} config - Configuration containing payment instructions and optional parameters.
   * @example
   * const payment = iso20022.createRTPCreditPaymentInitiation({
   *   paymentInstructions: [
   *     {
   *       type: 'rtp',
   *       direction: 'credit',
   *       amount: 100000, // $1000.00
   *       currency: 'USD',
   *       creditor: {
   *         name: 'All-American Dogs Co.',
   *         account: {
   *           accountNumber: '123456789012',
   *         },
   *         agent: {
   *           abaRoutingNumber: '37714568112',
   *         },
   *       },
   *       remittanceInformation: '1000 Hot Dogs Feb26',
   *     },
   *   ],
   *   messageId: 'RTP-MSG-001', // Optional
   *   creationDate: new Date('2025-03-01'), // Optional
   *   requestedExecutionDate: new Date('2025-03-03'), // Optional
   * });
   * @returns {RTPCreditPaymentInitiation} A new RTP Credit Payment Initiation object.
   */
  createRTPCreditPaymentInitiation(
    config: RTPCreditPaymentInitiationConfig,
  ) {
    return new RTPCreditPaymentInitiation({
      initiatingParty: this.initiatingParty,
      paymentInstructions: config.paymentInstructions,
      messageId: config.messageId,
      creationDate: config.creationDate,
      requestedExecutionDate: config.requestedExecutionDate,
    });
  }

  /**
   * Creates an ACH Credit Payment Initiation message.
   * @param {ACHCreditPaymentInitiationConfig} config - Configuration containing payment instructions and optional parameters.
   * @example
   * const payment = iso20022.createACHCreditPaymentInitiation({
   *   paymentInstructions: [
   *     {
   *       type: 'ach',
   *       direction: 'credit',
   *       amount: 100000, // $1000.00
   *       currency: 'USD',
   *       creditor: {
   *         name: 'John Doe Funding LLC',
   *         account: {
   *           accountNumber: '123456789012',
   *         },
   *         agent: {
   *           abaRoutingNumber: '123456789',
   *         },
   *       },
   *       remittanceInformation: 'Invoice #12345',
   *     },
   *   ],
   *   messageId: 'ACH-MSG-001', // Optional
   *   creationDate: new Date('2025-03-01'), // Optional
   *   requestedExecutionDate: new Date('2025-03-03'), // Optional
   * });
   * @returns {ACHCreditPaymentInitiation} A new ACH Credit Payment Initiation object.
   */
  createACHCreditPaymentInitiation(
    config: ACHCreditPaymentInitiationConfig,
  ) {
    return new ACHCreditPaymentInitiation({
      initiatingParty: this.initiatingParty,
      paymentInstructions: config.paymentInstructions,
      messageId: config.messageId,
      creationDate: config.creationDate,
      requestedExecutionDate: config.requestedExecutionDate,
    });
  }

  /** Create a message CAMT or other */
  createMessage(type: ISO20022MessageTypeName, config: any): GenericISO20022Message {
    const implementation = getISO20022Implementation(type);
    if (!implementation) {
      throw new Error(`No implementation found for message type ${type}`);
    }
    return new implementation(config);
  }
  
}

export default ISO20022;
