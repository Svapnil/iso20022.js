import { RTPCreditPaymentInitiation, RTPCreditPaymentInitiationConfig } from "../../../src/pain/001/rtp-credit-payment-initiation";
import libxmljs from 'libxmljs';
import fs from 'fs';
import { Alpha2Country } from "lib/countries";
import ISO20022 from '../../../src/iso20022';
import { v4 as uuidv4 } from 'uuid';
import { ABAAgent, BaseAccount } from "index";

describe('RTPCreditPaymentInitiation', () => {
    let rtpPaymentInitiationConfig: RTPCreditPaymentInitiationConfig;
    let rtpPayment: RTPCreditPaymentInitiation;
    const initiatingParty = {
        name: "Acme Corp",
        id: "ACMECORP",
        account: {
            accountNumber: "123456789012",
        },
        agent: {
            abaRoutingNumber: "111000025",
        }
    }

    const paymentInstruction1 = {
        id: "abcdefg",
        endToEndId: "123456789",
        type: 'rtp' as const,
        currency: "USD" as const,
        direction: "credit" as const,
        creditor: {
            name: "John Doe",
            account: {
                accountNumber: "987654321",
            },
            agent: {
                abaRoutingNumber: "121000248"
            },
            address: {
                streetName: "Main Street",
                buildingNumber: "123",
                townName: "San Francisco",
                countrySubDivision: "CA",
                postalCode: "94105",
                country: "US" as Alpha2Country
            }
        },
        amount: 1500,
        remittanceInformation: "Invoice #12345"
    }

    const paymentInstruction2 = {
        id: "hijklmn",
        endToEndId: "987654321",
        type: 'rtp' as const,
        direction: "credit" as const,
        creditor: {
            name: "Jane Smith",
            account: {
                accountNumber: "456789123",
            },
            agent: {
                abaRoutingNumber: "026009593"
            },
            address: {
                streetName: "Broadway",
                buildingNumber: "456",
                townName: "New York",
                countrySubDivision: "NY",
                postalCode: "10018",
                country: "US" as Alpha2Country
            }
        },
        amount: 2500,
        currency: "USD" as const,
        remittanceInformation: "Invoice #67890"
    }

    describe('serialize', () => {
        beforeEach(() => {
            rtpPaymentInitiationConfig = {
                initiatingParty,
                paymentInstructions: [
                    paymentInstruction1,
                    {
                        type: 'rtp',
                        direction: "credit",
                        creditor: {
                            name: "Sarah Johnson",
                            account: {
                                accountNumber: "123456789012",
                            },
                            agent: {
                                abaRoutingNumber: "072000326"
                            },
                            address: {
                                streetName: "Park Avenue",
                                buildingNumber: "789",
                                townName: "New York",
                                countrySubDivision: "NY",
                                postalCode: "10022",
                                country: "US"
                            }
                        },
                        amount: 3500,
                        currency: "USD"
                    }
                ]
            }
        })

        test('should create a RTPCreditPaymentInitiation instance', () => {
            rtpPayment = new RTPCreditPaymentInitiation(rtpPaymentInitiationConfig)
            expect(rtpPayment).toBeInstanceOf(RTPCreditPaymentInitiation);
        });

        test('should serialize to XML', () => {
            rtpPayment = new RTPCreditPaymentInitiation(rtpPaymentInitiationConfig)
            const xml = rtpPayment.serialize();
            expect(xml).toContain('<Document');
            // Add more specific XML checks
            expect(xml).toContain('xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03"');
            // Use regex to match the XML pattern regardless of newlines
            expect(xml).toMatch(/<LclInstrm>\s*<Prtry>\s*RTP\s*<\/Prtry>\s*<\/LclInstrm>/);
        });

        test('serialized XML should have "USD" as currency', () => {
            rtpPayment = new RTPCreditPaymentInitiation(rtpPaymentInitiationConfig)
            const xml = rtpPayment.serialize();
            expect(xml).toMatch(/<InstdAmt[^>]*Ccy="USD"[^>]*>/);
        })

        test('should validate against XSD', () => {
            rtpPayment = new RTPCreditPaymentInitiation(rtpPaymentInitiationConfig)
            const xml = rtpPayment.serialize();
            const xsdSchema = fs.readFileSync(
                `${process.cwd()}/schemas/pain/pain.001.001.03.xsd`,
                'utf8',
            );
            const xmlDoc = libxmljs.parseXml(xml);
            const xsdDoc = libxmljs.parseXml(xsdSchema);
            const isValid = xmlDoc.validate(xsdDoc);
            expect(isValid).toBeTruthy();
        });

        test('should default the requested execution date to the creation date when requestedExecutionDate is not provided', () => {
            rtpPayment = new RTPCreditPaymentInitiation({
                ...rtpPaymentInitiationConfig,
                creationDate: new Date('2025-03-01T12:00:00.000Z')
            });
            const xml = rtpPayment.serialize();
            expect(xml).toMatch(/<ReqdExctnDt>2025-03-01<\/ReqdExctnDt>/);
        });

        test('should use the execution date when provided', () => {
            rtpPayment = new RTPCreditPaymentInitiation({
                ...rtpPaymentInitiationConfig,
                creationDate: new Date('2025-03-01T12:00:00.000Z'),
                requestedExecutionDate: new Date('2025-03-15T00:00:00.000Z')
            });
            const xml = rtpPayment.serialize();
            expect(xml).toMatch(/<ReqdExctnDt>2025-03-15<\/ReqdExctnDt>/);

            // Validate against XSD
            const xsdSchema = fs.readFileSync(
                `${process.cwd()}/schemas/pain/pain.001.001.03.xsd`,
                'utf8',
            );
            const xmlDoc = libxmljs.parseXml(xml);
            const xsdDoc = libxmljs.parseXml(xsdSchema);
            const isValid = xmlDoc.validate(xsdDoc);
            expect(isValid).toBeTruthy();
        });

        describe('created with iso20022', () => {
            let iso20022 = new ISO20022({
                initiatingParty: initiatingParty
            })

            test('should create a RTPCreditPaymentInitiation instance', () => {
                let rtpPayment = iso20022.createRTPCreditPaymentInitiation({
                    paymentInstructions: [paymentInstruction1, paymentInstruction2]
                });
                const xml = rtpPayment.serialize();
                const xsdSchema = fs.readFileSync(
                    `${process.cwd()}/schemas/pain/pain.001.001.03.xsd`,
                    'utf8',
                );
                const xmlDoc = libxmljs.parseXml(xml);
                const xsdDoc = libxmljs.parseXml(xsdSchema);
                const isValid = xmlDoc.validate(xsdDoc);
                expect(isValid).toBeTruthy();
            })
        })
    })

    describe('fromXML', () => {
        describe('with Cross River 001 XML file', () => {
            let xmlContent: string;
            let rtpPayment: RTPCreditPaymentInitiation;

            beforeEach(() => {
                // Read the Cross River XML file
                xmlContent = fs.readFileSync(
                    `${process.cwd()}/test/assets/cross_river/pain_001_rtp_credit.xml`,
                    'utf8',
                );
                rtpPayment = RTPCreditPaymentInitiation.fromXML(xmlContent);
            });

            test('should create a RTPCreditPaymentInitiation instance', () => {
                expect(rtpPayment).toBeInstanceOf(RTPCreditPaymentInitiation);
            });

            test('should correctly parse message metadata', () => {
                expect(rtpPayment.messageId).toBe('DOMT11234562');
                expect(rtpPayment.creationDate).toStrictEqual(new Date('2020-06-29T10:24:09'));
                expect(rtpPayment.requestedExecutionDate).toStrictEqual(new Date('2020-06-29'));
            });

            test('should correctly parse initiating party information', () => {
                expect(rtpPayment.initiatingParty.name).toBe('John Doe Corporation');
                expect(rtpPayment.initiatingParty.id).toBe('JOHNDOE99');

                // Check account information
                expect(rtpPayment.initiatingParty.account).toBeDefined();
                expect((rtpPayment.initiatingParty.account as BaseAccount).accountNumber).toBe('1123456789');

                // Check agent (bank) information
                expect(rtpPayment.initiatingParty.agent).toBeDefined();
                expect((rtpPayment.initiatingParty.agent as ABAAgent).abaRoutingNumber).toBe('123456789');
            });

            test('should correctly parse payment instruction', () => {
                expect(rtpPayment.paymentInstructions).toHaveLength(1);

                const instruction = rtpPayment.paymentInstructions[0];
                expect(instruction.id).toBe('234ACHC123455');
                expect(instruction.endToEndId).toBe('1000000000000011');
                expect(instruction.amount).toBe(1); // 0.01 USD in minor units
                expect(instruction.currency).toBe('USD');
                expect(instruction.remittanceInformation).toBe('Testing');

                // Check creditor information
                expect(instruction.creditor.name).toBe('John Doe Funding LLC');
                expect((instruction.creditor.account as BaseAccount).accountNumber).toBe('1123456789');
                expect((instruction.creditor.agent as ABAAgent).abaRoutingNumber).toBe('123456789');

                // Check address information
                expect(instruction.creditor.address).toBeDefined();
                expect(instruction.creditor.address?.streetName).toBe('999 Any Avenue');
                expect(instruction.creditor.address?.postalCode).toBe('10000');
                expect(instruction.creditor.address?.townName).toBe('New York');
                expect(instruction.creditor.address?.countrySubDivision).toBe('NY');
                expect(instruction.creditor.address?.country).toBe('US');
            });
        })
        describe('with generated RTP 001 XML file', () => {
            // Create a test instance and serialize to XML
            const messageId = uuidv4().slice(0, 35);
            const creationDate = new Date();
            const rtpPayment = new RTPCreditPaymentInitiation({
                messageId: messageId,
                creationDate: creationDate,
                initiatingParty: initiatingParty,
                paymentInstructions: [paymentInstruction1, paymentInstruction2]
            });
            const serializedXml = rtpPayment.serialize();

            // Now parse it back using fromXML
            const recreatedRtpPayment = RTPCreditPaymentInitiation.fromXML(serializedXml);

            test('should create a RTPCreditPaymentInitiation instance', () => {
                expect(recreatedRtpPayment).toBeInstanceOf(RTPCreditPaymentInitiation);
            });

            test('information should be correctly parsed', () => {
                expect(recreatedRtpPayment.messageId).toBe(messageId);
                expect(recreatedRtpPayment.creationDate).toStrictEqual(creationDate);
                expect(recreatedRtpPayment.initiatingParty.name).toBe(initiatingParty.name);
                expect(recreatedRtpPayment.initiatingParty.id).toBe(initiatingParty.id);

                // Test payment instructions are correctly parsed
                expect(recreatedRtpPayment.paymentInstructions).toHaveLength(2);

                // Verify the first payment instruction
                const parsedInstruction1 = recreatedRtpPayment.paymentInstructions[0];
                expect(parsedInstruction1.id).toBe(paymentInstruction1.id);
                expect(parsedInstruction1.endToEndId).toBe(paymentInstruction1.endToEndId);
                expect(parsedInstruction1.amount).toBe(paymentInstruction1.amount);
                expect(parsedInstruction1.currency).toBe(paymentInstruction1.currency);
                expect(parsedInstruction1.creditor.name).toBe(paymentInstruction1.creditor.name);
                expect(parsedInstruction1.remittanceInformation).toBe(paymentInstruction1.remittanceInformation);

                // Verify the second payment instruction
                const parsedInstruction2 = recreatedRtpPayment.paymentInstructions[1];
                expect(parsedInstruction2.id).toBe(paymentInstruction2.id);
                expect(parsedInstruction2.endToEndId).toBe(paymentInstruction2.endToEndId);
                expect(parsedInstruction2.amount).toBe(paymentInstruction2.amount);
            });
        });

        describe('with a multiple pmtinf RTP 001 XML file', () => {
            // Create a sample with multiple payment info blocks to test error handling
            // This would need a sample XML file with multiple PmtInf blocks
            test('should throw an error for multiple payment information blocks', () => {
                const xmlWithMultiplePmtInf = `<?xml version="1.0" encoding="UTF-8"?>
                <Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
                    <CstmrCdtTrfInitn>
                        <GrpHdr>
                            <MsgId>test-message-id</MsgId>
                            <CreDtTm>2025-02-26T11:00:00</CreDtTm>
                            <NbOfTxs>2</NbOfTxs>
                            <CtrlSum>50.00</CtrlSum>
                            <InitgPty>
                                <Nm>Acme Corp</Nm>
                                <Id><OrgId><Othr><Id>ACMECORP</Id></Othr></OrgId></Id>
                            </InitgPty>
                        </GrpHdr>
                        <PmtInf>
                            <!-- First payment info block -->
                        </PmtInf>
                        <PmtInf>
                            <!-- Second payment info block -->
                        </PmtInf>
                    </CstmrCdtTrfInitn>
                </Document>`;

                expect(() => {
                    RTPCreditPaymentInitiation.fromXML(xmlWithMultiplePmtInf);
                }).toThrow('Multiple PmtInf is not supported');
            });
        });
    });
});