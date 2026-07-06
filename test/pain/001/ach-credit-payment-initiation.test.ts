import { ACHCreditPaymentInitiation, ACHCreditPaymentInitiationConfig } from "../../../src/pain/001/ach-credit-payment-initiation";
import libxmljs from 'libxmljs';
import * as fs from 'fs';
import { Alpha2Country } from "../../../src/lib/countries";
import ISO20022 from '../../../src/iso20022';
import { v4 as uuidv4 } from 'uuid';
import { ABAAgent, BaseAccount } from "../../../src/lib/types";
import { Currency } from "../../../src/lib/currency";

describe('ACHCreditPaymentInitiation', () => {
    let achPaymentInitiationConfig: ACHCreditPaymentInitiationConfig;
    let achPayment: ACHCreditPaymentInitiation;
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
        type: 'ach' as const,
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
        type: 'ach' as const,
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
            achPaymentInitiationConfig = {
                initiatingParty,
                paymentInstructions: [
                    paymentInstruction1,
                    {
                        type: 'ach',
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

        test('should create a ACHCreditPaymentInitiation instance', () => {
            achPayment = new ACHCreditPaymentInitiation(achPaymentInitiationConfig)
            expect(achPayment).toBeInstanceOf(ACHCreditPaymentInitiation);
        });

        test('should serialize to XML', () => {
            achPayment = new ACHCreditPaymentInitiation(achPaymentInitiationConfig)
            const xml = achPayment.serialize();
            expect(xml).toContain('<Document');
            // Add more specific XML checks
            expect(xml).toContain('xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03"');
            // Use regex to match the XML pattern regardless of newlines
            expect(xml).toMatch(/<LclInstrm>\s*<Prtry>\s*CCD\s*<\/Prtry>\s*<\/LclInstrm>/);
        });

        test('serialized XML should have "USD" as currency', () => {
            achPayment = new ACHCreditPaymentInitiation(achPaymentInitiationConfig)
            const xml = achPayment.serialize();
            expect(xml).toMatch(/<InstdAmt[^>]*Ccy="USD"[^>]*>/);
        })

        test('should validate against XSD', () => {
            achPayment = new ACHCreditPaymentInitiation(achPaymentInitiationConfig)
            const xml = achPayment.serialize();
            const xsdSchema = fs.readFileSync(
                `${process.cwd()}/schemas/pain/pain.001.001.03.xsd`,
                'utf8',
            );
            const xmlDoc = libxmljs.parseXml(xml);
            const xsdDoc = libxmljs.parseXml(xsdSchema);
            const isValid = xmlDoc.validate(xsdDoc);
            expect(isValid).toBeTruthy();
        });

        test('should include default ACH values in XML', () => {
            achPayment = new ACHCreditPaymentInitiation(achPaymentInitiationConfig);
            const xml = achPayment.serialize();
            expect(xml).toMatch(/<LclInstrm>\s*<Prtry>\s*CCD\s*<\/Prtry>\s*<\/LclInstrm>/);
            expect(xml).toMatch(/<SvcLvl>\s*<Cd>\s*NURG\s*<\/Cd>\s*<\/SvcLvl>/);
            expect(xml).toMatch(/<InstrPrty>\s*NORM\s*<\/InstrPrty>/);
        });

        test('should default the requested execution date to the creation date when requestedExecutionDate is not provided', () => {
            achPayment = new ACHCreditPaymentInitiation({
                ...achPaymentInitiationConfig,
                creationDate: new Date('2025-03-01T12:00:00.000Z')
            });
            const xml = achPayment.serialize();
            expect(xml).toMatch(/<ReqdExctnDt>2025-03-01<\/ReqdExctnDt>/);
        });

        test('should use the execution date when provided', () => {
            achPayment = new ACHCreditPaymentInitiation({
                ...achPaymentInitiationConfig,
                creationDate: new Date('2025-03-01T12:00:00.000Z'),
                requestedExecutionDate: new Date('2025-03-15T00:00:00.000Z')
            });
            const xml = achPayment.serialize();
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

            test('should create a ACHCreditPaymentInitiation instance', () => {
                // Now that we've updated the ISO20022 class, this should work
                const achPayment = iso20022.createACHCreditPaymentInitiation({
                    paymentInstructions: [paymentInstruction1, paymentInstruction2]
                });
                expect(achPayment).toBeInstanceOf(ACHCreditPaymentInitiation);
            })
        })
    })

    describe('fromXML', () => {
        describe('with a goldman sachs ACH 001 XML file', () => {
            const xmlContent = fs.readFileSync(
                `${process.cwd()}/test/assets/goldman_sachs/pain_001_ach_credit.xml`,
                'utf8',
            );
            const achPayment = ACHCreditPaymentInitiation.fromXML(xmlContent);
            test('should create a ACHCreditPaymentInitiation instance', () => {
                expect(achPayment).toBeInstanceOf(ACHCreditPaymentInitiation);
            })
            test('should fall back to the creation date when ReqdExctnDt is not a parseable date', () => {
                // The Goldman Sachs example uses a YYYY-MM-DD placeholder for ReqdExctnDt
                expect(achPayment.requestedExecutionDate).toStrictEqual(achPayment.creationDate);
            })
            expect(achPayment.messageId).toBe("Message-Id");
            expect(achPayment.creationDate).toStrictEqual(new Date(
                "2024-05-10T16:10:02.017+00:00"
            ));
        })
        describe('with a cross river ACH 001 XML file', () => {
            const xmlContent = fs.readFileSync(
                `${process.cwd()}/test/assets/cross_river/pain_001_ach_credit.xml`,
                'utf8',
            );
            const achPayment = ACHCreditPaymentInitiation.fromXML(xmlContent);
            test('should create a ACHCreditPaymentInitiation instance', () => {
                expect(achPayment).toBeInstanceOf(ACHCreditPaymentInitiation);
            })
            test('should correctly parse the requested execution date', () => {
                expect(achPayment.requestedExecutionDate).toStrictEqual(new Date("2020-06-29"));
            })

            expect(achPayment.messageId).toBe("DOMT11234562");
            expect(achPayment.creationDate).toStrictEqual(new Date('2020-06-29T10:24:09'));
            expect(achPayment.initiatingParty.name).toBe("John Doe Corporation");
            expect(achPayment.initiatingParty.id).toBe("JOHNDOE99");
            expect(achPayment.paymentInstructions.length).toBe(1);
            expect(achPayment.paymentInstructions[0].id).toBe("234ACHC123455");
            expect(achPayment.paymentInstructions[0].amount).toBe(1);
            expect(achPayment.paymentInstructions[0].currency).toBe("USD");
            expect(achPayment.paymentInstructions[0].creditor.name).toBe("John Doe Funding LLC");
            expect((achPayment.paymentInstructions[0]?.creditor?.account as BaseAccount)?.accountNumber).toBe("123456789");
            expect((achPayment.paymentInstructions[0]?.creditor.agent as ABAAgent)?.abaRoutingNumber ).toBe("123456789");
            expect(achPayment.paymentInstructions[0]?.creditor.address?.streetName).toBe("999 Any Avenue");
            expect(achPayment.paymentInstructions[0]?.creditor.address?.postalCode).toBe("10000");
            expect(achPayment.paymentInstructions[0]?.creditor.address?.townName).toBe("New York");
            expect(achPayment.paymentInstructions[0]?.creditor.address?.countrySubDivision).toBe("NY");
            expect(achPayment.paymentInstructions[0]?.creditor.address?.country).toBe("US");
        })
        describe('with generated ACH 001 XML file', () => {
            // Create a test instance and serialize to XML
            const messageId = uuidv4().slice(0, 35);
            const creationDate = new Date();
            const achPayment = new ACHCreditPaymentInitiation({
                messageId: messageId,
                creationDate: creationDate,
                initiatingParty: initiatingParty,
                paymentInstructions: [paymentInstruction1, paymentInstruction2]
            });
            const serializedXml = achPayment.serialize();

            // Now parse it back using fromXML
            const recreatedAchPayment = ACHCreditPaymentInitiation.fromXML(serializedXml);

            test('should create a ACHCreditPaymentInitiation instance', () => {
                expect(recreatedAchPayment).toBeInstanceOf(ACHCreditPaymentInitiation);
            });

            test('information should be correctly parsed', () => {
                expect(recreatedAchPayment.messageId).toBe(messageId);
                expect(recreatedAchPayment.creationDate).toStrictEqual(creationDate);
                expect(recreatedAchPayment.initiatingParty.name).toBe(initiatingParty.name);
                expect(recreatedAchPayment.initiatingParty.id).toBe(initiatingParty.id);

                // Test payment instructions are correctly parsed
                expect(recreatedAchPayment.paymentInstructions).toHaveLength(2);

                // Verify the first payment instruction
                const parsedInstruction1 = recreatedAchPayment.paymentInstructions[0];
                expect(parsedInstruction1.id).toBe(paymentInstruction1.id);
                expect(parsedInstruction1.endToEndId).toBe(paymentInstruction1.endToEndId);
                expect(parsedInstruction1.amount).toBe(paymentInstruction1.amount);
                expect(parsedInstruction1.currency).toBe(paymentInstruction1.currency);
                expect(parsedInstruction1.creditor.name).toBe(paymentInstruction1.creditor.name);
                expect(parsedInstruction1.remittanceInformation).toBe(paymentInstruction1.remittanceInformation);

                // Verify the second payment instruction
                const parsedInstruction2 = recreatedAchPayment.paymentInstructions[1];
                expect(parsedInstruction2.id).toBe(paymentInstruction2.id);
                expect(parsedInstruction2.endToEndId).toBe(paymentInstruction2.endToEndId);
                expect(parsedInstruction2.amount).toBe(paymentInstruction2.amount);
            });
        });

        describe('with a multiple pmtinf ACH 001 XML file', () => {
            // Create a sample with multiple payment info blocks to test error handling
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
                    ACHCreditPaymentInitiation.fromXML(xmlWithMultiplePmtInf);
                }).toThrow('Multiple PmtInf is not supported');
            });
        });

        describe('validation', () => {
            test('should throw error for non-USD currency', () => {
                expect(() => {
                    new ACHCreditPaymentInitiation({
                        initiatingParty,
                        paymentInstructions: [{
                            ...paymentInstruction1,
                            // @ts-ignore - Intentionally using wrong currency to test validation
                            currency: 'EUR'
                        }]
                    });
                }).toThrow('ACH payments must use USD as currency');
            });

            test('should throw error for messageId exceeding 35 characters', () => {
                expect(() => {
                    new ACHCreditPaymentInitiation({
                        initiatingParty,
                        paymentInstructions: [paymentInstruction1],
                        messageId: 'a'.repeat(36)
                    });
                }).toThrow('messageId must not exceed 35 characters');
            });
        });
    });
});
