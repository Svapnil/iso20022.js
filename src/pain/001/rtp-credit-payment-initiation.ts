import { ABAAgent, Account, Agent, BaseAccount, Party, RTPCreditPaymentInstruction } from '../../lib/types';
import { v4 as uuidv4 } from 'uuid';
import { Currency } from '../../lib/currency';
import { formatAmount, sumAmounts } from '../../dinero-helpers';
import { sanitize } from '../../utils/format';
import { PaymentInitiation } from './payment-initiation';
import { XMLParser } from 'fast-xml-parser';
import { InvalidXmlError, InvalidXmlNamespaceError } from "../../errors";
import { parseAccount, parseAgent, parseAmountToMinorUnits } from "../../parseUtils";
import { Alpha2Country } from "lib/countries";

type AtLeastOne<T> = [T, ...T[]];

/**
 * Configuration for RTP Credit Payment Initiation.
 *
 * @property {Party} initiatingParty - The party initiating the RTP credit transfer.
 * @property {AtLeastOne<RTPCreditPaymentInstruction>} paymentInstructions - Array containing at least one payment instruction for the RTP credit transfer.
 * @property {string} [messageId] - Optional unique identifier for the message. If not provided, a UUID will be generated.
 * @property {Date} [creationDate] - Optional creation date for the message. If not provided, current date will be used.
 * @property {Date} [requestedExecutionDate] - Optional requested execution date for the payment. If not provided, the creation date will be used.
 */
export interface RTPCreditPaymentInitiationConfig {
    /** The party initiating the RTP credit transfer. */
    initiatingParty: Party
    /** Array containing at least one payment instruction for the RTP credit transfer. */
    paymentInstructions: AtLeastOne<RTPCreditPaymentInstruction>
    /** Optional unique identifier for the message. If not provided, a UUID will be generated. */
    messageId?: string
    /** Optional creation date for the message. If not provided, current date will be used. */
    creationDate?: Date
    /** Optional requested execution date for the payment. If not provided, the creation date will be used. */
    requestedExecutionDate?: Date
}

/**
 * Represents a RTP Credit Payment Initiation.
 * This class handles the creation and serialization of RTP credit transfer messages
 * according to the ISO20022 standard.
 * @class
 * @extends PaymentInitiation
 * @param {RTPCreditPaymentInitiationConfig} config - The configuration for the RTP Credit Payment Initiation message.
 * @example
 * ```typescript
 * // Creating a payment message
 * const payment = new RTPCreditPaymentInitiation({
 *   ...
 * });
 * // Uploading to fiatwebservices.com
 * client.paymentTransfers.create(payment);
 * // Parsing from XML
 * const xml = '<xml>...</xml>';
 * const parsedTransfer = RTPCreditPaymentInitiation.fromXML(xml);
 * ```
 * @see {@link https://docs.iso20022js.com/pain/rtpcredit} for more information.
 */
export class RTPCreditPaymentInitiation extends PaymentInitiation {
    public initiatingParty: Party
    public paymentInstructions: AtLeastOne<RTPCreditPaymentInstruction>
    public messageId: string
    public creationDate: Date
    public requestedExecutionDate: Date
    public paymentInformationId: string;
    private formattedPaymentSum: string;
    constructor(config: RTPCreditPaymentInitiationConfig) {
        super({ type: "rtp" });
        this.initiatingParty = config.initiatingParty;
        this.paymentInstructions = config.paymentInstructions;
        this.messageId = config.messageId || uuidv4().replace(/-/g, '');
        this.creationDate = config.creationDate || new Date();
        this.requestedExecutionDate = config.requestedExecutionDate || this.creationDate;
        this.paymentInformationId = sanitize(uuidv4(), 35);
        this.formattedPaymentSum = this.sumPaymentInstructions(this.paymentInstructions as AtLeastOne<RTPCreditPaymentInstruction>);
        this.validate();
    }
    /**
     * Calculates the sum of all payment instructions.
     * @private
     * @param {AtLeastOne<RTPCreditPaymentInstruction>} instructions - Array of payment instructions.
     * @returns {string} The total sum formatted as a string with 2 decimal places.
     * @throws {Error} If payment instructions have different currencies.
     */
    private sumPaymentInstructions(instructions: AtLeastOne<RTPCreditPaymentInstruction>): string {
        return sumAmounts(
            instructions.map(i => i.amount),
            instructions[0].currency,
        );
    }

    /**
     * Validates the payment initiation data according to SEPA requirements.
     * @private
     * @throws {Error} If messageId exceeds 35 characters.
     * @throws {Error} If payment instructions have different currencies.
     * @throws {Error} If any creditor has incomplete address information.
     */
    private validate() {
        if (this.messageId.length > 35) {
            throw new Error('messageId must not exceed 35 characters');
        }
    }

    /**
     * Generates payment information for a single SEPA credit transfer instruction.
     * @param {RTPCreditPaymentInstruction} instruction - The payment instruction.
     * @returns {Object} The payment information object formatted according to SEPA specifications.
     */
    creditTransfer(instruction: RTPCreditPaymentInstruction) {
        const paymentInstructionId = sanitize(instruction.id || uuidv4(), 35);
        const endToEndId = sanitize(instruction.endToEndId || instruction.id || uuidv4(), 35);

        return {
            PmtId: {
                InstrId: paymentInstructionId,
                EndToEndId: endToEndId,
            },
            Amt: {
                InstdAmt: {
                    '#': formatAmount(instruction.amount, instruction.currency),
                    '@Ccy': instruction.currency,
                },
            },
            CdtrAgt: this.agent(instruction.creditor.agent as ABAAgent),
            Cdtr: this.party(instruction.creditor as Party),
            CdtrAcct: {
                Id: {
                    Othr: {
                        Id: (instruction.creditor.account as BaseAccount).accountNumber,
                    },
                },
            },
            RmtInf: instruction.remittanceInformation ? {
                Ustrd: instruction.remittanceInformation,
            } : undefined,
        };
    }


    /**
     * Serializes the RTP credit transfer initiation to an XML string.
     * @returns {string} The XML representation of the RTP credit transfer initiation.
     */
    public serialize(): string {
        const builder = PaymentInitiation.getBuilder();
        const xml = {
            '?xml': {
                '@version': '1.0',
                '@encoding': 'UTF-8'
            },
            Document: {
                '@xmlns': 'urn:iso:std:iso:20022:tech:xsd:pain.001.001.03',
                '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
                CstmrCdtTrfInitn: {
                    GrpHdr: {
                        MsgId: this.messageId,
                        CreDtTm: this.creationDate.toISOString(),
                        NbOfTxs: this.paymentInstructions.length.toString(),
                        CtrlSum: this.formattedPaymentSum,
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
                        NbOfTxs: this.paymentInstructions.length.toString(),
                        CtrlSum: this.formattedPaymentSum,
                        PmtTpInf: {
                            SvcLvl: { Cd: 'URNS' },
                            LclInstrm: { Prtry: "RTP" },
                        },
                        ReqdExctnDt: this.requestedExecutionDate.toISOString().split('T').at(0),
                        Dbtr: this.party(this.initiatingParty),
                        DbtrAcct: this.account(this.initiatingParty.account as Account),
                        DbtrAgt: this.agent(this.initiatingParty.agent as Agent),
                        ChrgBr: 'SLEV',
                        // payments[]
                        CdtTrfTxInf: this.paymentInstructions.map(p => this.creditTransfer(p)),
                    }
                }
            },
        };

        return builder.build(xml);
    }

    public static fromXML(rawXml: string): RTPCreditPaymentInitiation {
        const parser = new XMLParser({ ignoreAttributes: false });
        const xml = parser.parse(rawXml);

        if (!xml.Document) {
            throw new InvalidXmlError("Invalid XML format");
        }

        const namespace = (xml.Document['@_xmlns'] || xml.Document['@_Xmlns']) as string;
        if (!namespace.startsWith('urn:iso:std:iso:20022:tech:xsd:pain.001.001.03')) {
            throw new InvalidXmlNamespaceError('Invalid PAIN.001 namespace');
        }

        const messageId = (xml.Document.CstmrCdtTrfInitn.GrpHdr.MsgId as string);
        const creationDate = new Date(xml.Document.CstmrCdtTrfInitn.GrpHdr.CreDtTm as string);

        if (Array.isArray(xml.Document.CstmrCdtTrfInitn.PmtInf)) {
            throw new Error('Multiple PmtInf is not supported');
        }

        // Fall back to the creation date when ReqdExctnDt is missing or not a parseable date
        const rawExecutionDate = new Date(xml.Document.CstmrCdtTrfInitn.PmtInf.ReqdExctnDt as string);
        const requestedExecutionDate = isNaN(rawExecutionDate.getTime()) ? undefined : rawExecutionDate;

        // Assuming we have one PmtInf / one Debtor, we can hack together this information from InitgPty / Dbtr
        const initiatingParty = {
            name: (xml.Document.CstmrCdtTrfInitn.GrpHdr.InitgPty.Nm as string) || (xml.Document.CstmrCdtTrfInitn.PmtInf.Dbtr.Nm as string),
            id: (xml.Document.CstmrCdtTrfInitn.GrpHdr.InitgPty.Id.OrgId?.Othr?.Id) || (xml.Document.CstmrCdtTrfInitn.GrpHdr.InitgPty.Id.OrgId?.BICOrBEI),
            agent: parseAgent(xml.Document.CstmrCdtTrfInitn.PmtInf.DbtrAgt),
            account: parseAccount(xml.Document.CstmrCdtTrfInitn.PmtInf.DbtrAcct)
        }

        const rawInstructions = Array.isArray(xml.Document.CstmrCdtTrfInitn.PmtInf.CdtTrfTxInf) ? xml.Document.CstmrCdtTrfInitn.PmtInf.CdtTrfTxInf : [xml.Document.CstmrCdtTrfInitn.PmtInf.CdtTrfTxInf];

        const paymentInstructions = rawInstructions.map((inst: any) => {
            const currency = (inst.Amt.InstdAmt['@_Ccy'] as Currency);
            const amount = parseAmountToMinorUnits(Number(inst.Amt.InstdAmt['#text']), currency);
            const rawPostalAddress = inst.Cdtr.PstlAdr;
            return {
                ...(inst.PmtId.InstrId && { id: (inst.PmtId.InstrId.toString() as string) }),
                ...(inst.PmtId.EndToEndId && { endToEndId: (inst.PmtId.EndToEndId.toString() as string) }),
                type: 'sepa',
                direction: 'credit',
                amount: amount,
                currency: currency,
                creditor: {
                    name: (inst.Cdtr?.Nm as string),
                    agent: parseAgent(inst.CdtrAgt),
                    account: parseAccount(inst.CdtrAcct),
                    ...((rawPostalAddress && (rawPostalAddress.StreetName || rawPostalAddress.BldgNb || rawPostalAddress.PstlCd || rawPostalAddress.TwnNm || rawPostalAddress.Ctry)) ? {
                        address: {
                            ...(rawPostalAddress.StrtNm && { streetName: rawPostalAddress.StrtNm.toString() as string }),
                            ...(rawPostalAddress.BldgNb && { buildingNumber: rawPostalAddress.BldgNb.toString() as string }),
                            ...(rawPostalAddress.TwnNm && { townName: rawPostalAddress.TwnNm.toString() as string }),
                            ...(rawPostalAddress.CtrySubDvsn && { countrySubDivision: rawPostalAddress.CtrySubDvsn.toString() as string }),
                            ...(rawPostalAddress.PstCd && { postalCode: rawPostalAddress.PstCd.toString() as string }),
                            ...(rawPostalAddress.Ctry && { country: rawPostalAddress.Ctry as Alpha2Country }),
                        }
                    } : {}),
                },
                ...(inst.RmtInf?.Ustrd && { remittanceInformation: inst.RmtInf.Ustrd.toString() as string })
            }
        }) as AtLeastOne<RTPCreditPaymentInstruction>;

        return new RTPCreditPaymentInitiation({
            messageId: messageId,
            creationDate: creationDate,
            requestedExecutionDate: requestedExecutionDate,
            initiatingParty: initiatingParty,
            paymentInstructions: paymentInstructions
        });
    }
}
