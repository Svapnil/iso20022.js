import { dinero, toDecimal } from 'dinero.js';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import { v4 as uuidv4 } from 'uuid';
import { InvalidXmlError, InvalidXmlNamespaceError } from "../../errors";
import { Alpha2Country } from "../../lib/countries";
import { Currency } from '../../lib/currency';
import { formatAmount, currencyObj } from '../../dinero-helpers';
import {
  Account,
  BICAgent,
  IBANAccount,
  Party,
  SWIFTCreditPaymentInstruction
} from '../../lib/types.js';
import { parseAccount, parseAmountToMinorUnits } from "../../parseUtils";
import { sanitize } from '../../utils/format';
import { PaymentInitiation } from './payment-initiation';

type AtLeastOne<T> = [T, ...T[]];

/**
 * Configuration for SWIFT Credit Payment Initiation.
 *
 * @property {Party} initiatingParty - The party initiating the payment.
 * @property {AtLeastOne<SWIFTCreditPaymentInstruction>} paymentInstructions - An array of payment instructions.
 * @property {string} [messageId] - Optional unique identifier for the message. If not provided, a UUID will be generated.
 * @property {Date} [creationDate] - Optional creation date for the message. If not provided, current date will be used.
 * @property {Date} [requestedExecutionDate] - Optional requested execution date for the payment. If not provided, the creation date will be used.
 */
export interface SWIFTCreditPaymentInitiationConfig {
  /** The party initiating the payment. */
  initiatingParty: Party;
  /** An array of payment instructions. */
  paymentInstructions: AtLeastOne<SWIFTCreditPaymentInstruction>;
  /** Optional unique identifier for the message. If not provided, a UUID will be generated. */
  messageId?: string;
  /** Optional creation date for the message. If not provided, current date will be used. */
  creationDate?: Date;
  /** Optional requested execution date for the payment. If not provided, the creation date will be used. */
  requestedExecutionDate?: Date;
}

/**
 * Represents a SWIFT Credit Payment v3 Initiation message (pain.001.001.03).
 * @class
 * @extends PaymentInitiation
 * @param {SWIFTCreditPaymentInitiationConfig} config - The configuration for the SWIFT Credit Payment Initiation message.
 * @example
 * ```typescript
 * // Creating a payment message
 * const payment = new SWIFTCreditPaymentInitiation({
 *   ...
 * });
 * // Uploading to fiatwebservices.com
 * client.paymentTransfers.create(payment);
 * // Parsing from XML
 * const xml = '<xml>...</xml>';
 * const parsedTransfer = SWIFTCreditPaymentInitiation.fromXML(xml);
 * ```
 * @see {@link https://docs.iso20022js.com/pain/sepacredit} for more information.
 */
export class SWIFTCreditPaymentInitiation extends PaymentInitiation {
  public initiatingParty: Party;
  public messageId: string;
  public creationDate: Date;
  public requestedExecutionDate: Date;
  public paymentInstructions: SWIFTCreditPaymentInstruction[];
  public paymentInformationId: string;

  /**
   * Creates an instance of SWIFTCreditPaymentInitiation.
   * @param {SWIFTCreditPaymentInitiationConfig} config - The configuration object.
   */
  constructor(config: SWIFTCreditPaymentInitiationConfig) {
    super({ type: "swift" });
    this.initiatingParty = config.initiatingParty;
    this.paymentInstructions = config.paymentInstructions;
    this.messageId =
      config.messageId || uuidv4().replace(/-/g, '').substring(0, 35);
    this.creationDate = config.creationDate || new Date();
    this.requestedExecutionDate = config.requestedExecutionDate || this.creationDate;
    this.paymentInformationId = sanitize(uuidv4(), 35);
    this.validate();
  }

  /**
   * Validates the payment initiation data has the information required to create a valid XML file.
   * @private
   * @throws {Error} If messageId exceeds 35 characters.
   * @throws {Error} If any creditor has incomplete address information.
   */
  private validate() {
    if (this.messageId.length > 35) {
      throw new Error('messageId must not exceed 35 characters');
    }

    // Validate that all creditors have complete addresses
    // According to spec, the country is required for all addresses
    const creditorWithIncompleteAddress = this.paymentInstructions.find(
      instruction => {
        const address = instruction.creditor.address;
        return !address || !address.country;
      },
    );

    if (creditorWithIncompleteAddress) {
      throw new Error(
        'All creditors must have complete addresses (street name, building number, postal code, town name, and country)',
      );
    }

    // Add more validation as needed
  }


  /**
   * Generates payment information for a single payment instruction.
   * @param {SWIFTCreditPaymentInstruction} paymentInstruction - The payment instruction.
   * @returns {Object} The credit transfer object.
   */
  creditTransfer(paymentInstruction: SWIFTCreditPaymentInstruction): Record<string, any> {
    const paymentInstructionId = sanitize(paymentInstruction.id || uuidv4(), 35);
    const curr = currencyObj(paymentInstruction.currency);
    const d = dinero({ amount: paymentInstruction.amount, currency: curr });
    const amount = toDecimal(d);

    return {
      PmtId: {
        InstrId: paymentInstructionId,
        EndToEndId: paymentInstructionId,
      },
      Amt: {
        InstdAmt: {
          '#': amount,
          '@Ccy': paymentInstruction.currency,
        },
      },
      // TODO: Add support for intermediary bank information
      // This is necessary when the SWIFT Payment needs to be routed through multiple banks in order to reach the recipient
      // intermediaryBanks will probably need to be an array of BICAgents. There needs to be an easy way to get this information for users
      CdtrAgt: this.agent(paymentInstruction.creditor.agent as BICAgent),
      Cdtr: this.party(paymentInstruction.creditor as Party),
      CdtrAcct: this.internationalAccount(
        paymentInstruction.creditor.account as IBANAccount,
      ),
      RmtInf: paymentInstruction.remittanceInformation
        ? {
          Ustrd: paymentInstruction.remittanceInformation,
        }
        : undefined,
    };
  }

  /**
   * Serializes the payment initiation to an XML string.
   * @returns {string} The XML representation of the payment initiation.
   */
  public static fromXML(rawXml: string): SWIFTCreditPaymentInitiation {
    const parser = new XMLParser({ ignoreAttributes: false });
    const xml = parser.parse(rawXml);

    if (!xml.Document) {
      throw new InvalidXmlError("Invalid XML format");
    }

    const namespace = (xml.Document['@_xmlns'] || xml.Document['@_Xmlns']) as string;
    if (!namespace.startsWith('urn:iso:std:iso:20022:tech:xsd:pain.001.001')) {
      throw new InvalidXmlNamespaceError('Invalid PAIN.001 namespace');
    }

    const messageId = xml.Document.CstmrCdtTrfInitn.GrpHdr.MsgId as string;
    const creationDate = new Date(xml.Document.CstmrCdtTrfInitn.GrpHdr.CreDtTm as string);
    // Fall back to the creation date when ReqdExctnDt is missing or not a parseable date
    const rawExecutionDate = new Date(xml.Document.CstmrCdtTrfInitn.PmtInf.ReqdExctnDt as string);
    const requestedExecutionDate = isNaN(rawExecutionDate.getTime()) ? undefined : rawExecutionDate;

    // Parse and validate accounts
    // Create base initiating party
    const baseInitiatingParty: Party = {
      name: xml.Document.CstmrCdtTrfInitn.GrpHdr.InitgPty.Nm,
      id: xml.Document.CstmrCdtTrfInitn.GrpHdr.InitgPty.Id?.OrgId?.Othr?.Id,
      account: parseAccount(xml.Document.CstmrCdtTrfInitn.PmtInf.DbtrAcct),
      agent: {
        bic: xml.Document.CstmrCdtTrfInitn.PmtInf.DbtrAgt?.FinInstnId?.BIC
      }
    };

    const rawInstructions = Array.isArray(xml.Document.CstmrCdtTrfInitn.PmtInf.CdtTrfTxInf)
      ? xml.Document.CstmrCdtTrfInitn.PmtInf.CdtTrfTxInf
      : [xml.Document.CstmrCdtTrfInitn.PmtInf.CdtTrfTxInf];

    const paymentInstructions = rawInstructions.map((inst: any) => {
      const currency = inst.Amt.InstdAmt['@_Ccy'] as Currency;
      const amount = parseAmountToMinorUnits(Number(inst.Amt.InstdAmt['#text']), currency);

      // Create base creditor party
      const creditor: Party = {
        name: inst.Cdtr.Nm as string,
        agent: {
          bic: inst.CdtrAgt?.FinInstnId?.BIC
        },
        account: (inst.CdtrAcct?.Id?.IBAN || inst.CdtrAcct?.Id?.Othr?.Id) ? parseAccount(inst.CdtrAcct) : undefined,
        address: {
          streetName: inst.Cdtr.PstlAdr.StrtNm as string,
          buildingNumber: inst.Cdtr.PstlAdr.BldgNb as string,
          postalCode: inst.Cdtr.PstlAdr.PstCd as string,
          townName: inst.Cdtr.PstlAdr.TwnNm as string,
          countrySubDivision: inst.Cdtr.PstlAdr.CtrySubDvsn as string,
          country: inst.Cdtr.PstlAdr.Ctry as Alpha2Country
        }
      };

      // Return instruction with validated data
      return {
        type: 'swift' as const,
        direction: 'credit' as const,
        ...(inst.PmtId.InstrId && { id: inst.PmtId.InstrId.toString() }),
        ...(inst.PmtId.EndToEndId && { endToEndId: inst.PmtId.EndToEndId.toString() }),
        amount,
        currency,
        creditor
      };
    });

    return new SWIFTCreditPaymentInitiation({
      messageId,
      creationDate,
      requestedExecutionDate,
      initiatingParty: baseInitiatingParty,
      paymentInstructions: paymentInstructions as AtLeastOne<SWIFTCreditPaymentInstruction>
    });
  }

  public serialize(): string {
    const builder = PaymentInitiation.getBuilder();
    const xml = {
      '?xml': {
        '@version': '1.0',
        '@encoding': 'UTF-8'
      },
      Document: {
        '@xmlns': 'urn:iso:std:iso:20022:tech:xsd:pain.001.001.03',
        CstmrCdtTrfInitn: {
          GrpHdr: {
            MsgId: this.messageId,
            CreDtTm: this.creationDate.toISOString(),
            NbOfTxs: this.paymentInstructions.length.toString(),
            InitgPty: {
              Nm: this.initiatingParty.name,
              Id: {
                OrgId: {
                  Othr: {
                    Id: this.initiatingParty.id,
                  },
                },
              },
            },
          },
          PmtInf: {
            PmtInfId: this.paymentInformationId,
            PmtMtd: 'TRF',
            BtchBookg: 'false',
            PmtTpInf: {
              InstrPrty: 'NORM',
              SvcLvl: {
                Cd: 'URGP',
              },
            },
            ReqdExctnDt: this.requestedExecutionDate.toISOString().split('T')[0], // TODO: Check time zone eventually
            Dbtr: this.party(this.initiatingParty),
            DbtrAcct: this.account(this.initiatingParty.account as Account),
            DbtrAgt: this.agent(this.initiatingParty.agent as BICAgent),
            ChrgBr: 'SHAR',
            CdtTrfTxInf: this.paymentInstructions.map(p => this.creditTransfer(p)),
          },
        },
      },
    };

    return builder.build(xml);
  }
}
