import fs from 'fs';
import { Alpha2Country } from "lib/countries";
import libxmljs from 'libxmljs';
import { v4 as uuidv4 } from 'uuid';
import ISO20022 from '../../../src/iso20022';
import { ExternalCategoryPurposeCode } from "../../../src/lib/types";
import { SEPACreditPaymentInitiation, SEPACreditPaymentInitiationConfig } from "../../../src/pain/001/sepa-credit-payment-initiation";

type AtLeastOne<T> = [T, ...T[]];

describe('SEPACreditPaymentInitiation', () => {
    let sepaPaymentInitiationConfig: SEPACreditPaymentInitiationConfig;
    let sepaPayment: SEPACreditPaymentInitiation;
    const initiatingParty = {
        name: "Electrical",
        id: "ELECTRIC",
        account: {
            iban: "ES9121000418450200051332"
        },
        agent: {
            bic: "BSCHESMMXXX",
            bankAddress: {
                country: "US" as Alpha2Country
            }
        }
    }

    const paymentInstruction1 = {
        id: "abcdefg",
        endToEndId: "123456789",
        creditor: {
            name: "Dáel Muñiz",
            account: {
                iban: "ES8201822200150201504058"
            },
            agent: {
                bic: "BBVAESMMXXX"
            },
            address: {
                streetName: "Calle de Serrano",
                buildingNumber: "41",
                townName: "Madrid",
                countrySubDivision: "Madrid",
                postalCode: "28001",
                country: "ES" as Alpha2Country
            }
        },
        amount: 3395,
        currency: "EUR" as const
    }

    const paymentInstruction2 = {
        id: "abcdefg",
        endToEndId: "123456789",
        type: 'sepa' as const,
        direction: "credit" as const,
        creditor: {
            name: "Guli Mancini",
            account: {
                iban: "ES9121000418450200051332"
            },
            agent: {
                bic: "BBVAESMMXXX"
            },
            address: {
                streetName: "Avenida de la Hispanidad",
                buildingNumber: "41",
                townName: "Madrid",
                countrySubDivision: "Madrid",
                postalCode: "28001",
                country: "ES" as Alpha2Country
            }
        },
        amount: 1000,
        currency: "EUR" as const
    }

    describe('serialize', () => {
        beforeEach(() => {
            sepaPaymentInitiationConfig = {
                initiatingParty,
                paymentInstructions: [
                    paymentInstruction1,
                    {
                        type: 'sepa',
                        direction: "credit",
                        creditor: {
                            name: "Carmen García",
                            account: {
                                iban: "ES7100302053091234567895"
                            },
                            agent: {
                                bic: "ESPBESMMXXX"
                            },
                            address: {
                                streetName: "Paseo de la Castellana",
                                buildingNumber: "125",
                                townName: "Madrid",
                                countrySubDivision: "Madrid",
                                postalCode: "28046",
                                country: "ES"
                            }
                        },
                        amount: 2500,
                        currency: "EUR"
                    }
                ]
            }
        })

        test('should create a SEPACreditPaymentInitiation instance', () => {
            sepaPayment = new SEPACreditPaymentInitiation(sepaPaymentInitiationConfig)
            expect(sepaPayment).toBeInstanceOf(SEPACreditPaymentInitiation);
        });

        test('should serialize to XML', () => {
            sepaPayment = new SEPACreditPaymentInitiation(sepaPaymentInitiationConfig)
            const xml = sepaPayment.serialize();
            expect(xml).toContain('<Document');
            // Add more specific XML checks here
        });

        test('should validate against XSD', () => {
            sepaPayment = new SEPACreditPaymentInitiation(sepaPaymentInitiationConfig)
            const xml = sepaPayment.serialize();
            const xsdSchema = fs.readFileSync(
                `${process.cwd()}/schemas/pain/pain.001.001.03.xsd`,
                'utf8',
            );
            const xmlDoc = libxmljs.parseXml(xml);
            const xsdDoc = libxmljs.parseXml(xsdSchema);
            const isValid = xmlDoc.validate(xsdDoc);
            expect(isValid).toBeTruthy();
        });

        test('should omit category purpose when not provided', () => {
            sepaPayment = new SEPACreditPaymentInitiation(sepaPaymentInitiationConfig);
            const xml = sepaPayment.serialize();
            expect(xml).not.toMatch(/<CtgyPurp>/);
        });

        test('should include custom category purpose code when provided', () => {
            const customConfig = {
                ...sepaPaymentInitiationConfig,
                categoryPurpose: ExternalCategoryPurposeCode.Supplier
            };
            sepaPayment = new SEPACreditPaymentInitiation(customConfig);
            const xml = sepaPayment.serialize();
            expect(xml).toMatch(/<CtgyPurp>[\s\n]*<Cd>SUPP<\/Cd>[\s\n]*<\/CtgyPurp>/);

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

        test('should default the requested execution date to the creation date when requestedExecutionDate is not provided', () => {
            sepaPayment = new SEPACreditPaymentInitiation({
                ...sepaPaymentInitiationConfig,
                creationDate: new Date('2025-03-01T12:00:00.000Z')
            });
            const xml = sepaPayment.serialize();
            expect(xml).toMatch(/<ReqdExctnDt>2025-03-01<\/ReqdExctnDt>/);
        });

        test('should use the execution date when provided', () => {
            sepaPayment = new SEPACreditPaymentInitiation({
                ...sepaPaymentInitiationConfig,
                creationDate: new Date('2025-03-01T12:00:00.000Z'),
                requestedExecutionDate: new Date('2025-03-15T00:00:00.000Z')
            });
            const xml = sepaPayment.serialize();
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

        test('serialized XML should have "EUR" as currency', () => {
            sepaPayment = new SEPACreditPaymentInitiation(sepaPaymentInitiationConfig);
            const xml = sepaPayment.serialize();
            expect(xml).toMatch(/<InstdAmt[^>]*Ccy="EUR"[^>]*>/);
        });

        describe('created with iso20022', () => {
            let iso20022 = new ISO20022({
                initiatingParty: initiatingParty
            })

            test('should create a SEPACreditPaymentInitiation instance', () => {
                let sepaPayment = iso20022.createSEPACreditPaymentInitiation({
                    paymentInstructions: [paymentInstruction1]
                });
                const xml = sepaPayment.serialize();
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
        describe('with an example SEPA 001 XML file', () => {
            const exampleSepa = fs.readFileSync(`${process.cwd()}/test/assets/example/sepa_pain_001_v3.xml`, 'utf8');
            let sepaPayment = SEPACreditPaymentInitiation.fromXML(exampleSepa);

            test('should create a SEPACreditPaymentInitiation instance', () => {
                expect(sepaPayment).toBeInstanceOf(SEPACreditPaymentInitiation);
            })

            test('information should be correctly parsed', () => {
                expect(sepaPayment.messageId).toBe("38b0440b12d741d690e5721ab6f90e33");
                expect(sepaPayment.creationDate).toBeInstanceOf(Date);
                expect(sepaPayment.creationDate.toISOString()).toBe("2025-02-10T01:22:07.958Z");
                expect(sepaPayment.requestedExecutionDate).toStrictEqual(new Date("2025-02-10"));
                expect(sepaPayment.initiatingParty).toEqual({
                    name: "Electrical",
                    id: "ELECTRIC",
                    account: {
                        iban: "ES9121000418450200051332"
                    },
                    agent: {
                        bic: "BSCHESMMXXX"
                    }
                })
                expect(sepaPayment.paymentInstructions).toHaveLength(1);
                expect(sepaPayment.paymentInstructions[0]).toEqual({
                    id: "d6ecf0cb-e0c3-4fe9-8f21-45464fde659",
                    endToEndId: "d6ecf0cb-e0c3-4fe9-8f21-45464fde659",
                    direction: 'credit',
                    type: 'sepa',
                    creditor: {
                        name: "Dáel Muñiz",
                        account: {
                            iban: "ES8201822200150201504058"
                        },
                        agent: {
                            bic: "BBVAESMMXXX"
                        },
                        address: {
                            streetName: "Calle de Serrano",
                            buildingNumber: "41",
                            townName: "Madrid",
                            postalCode: "28001",
                            countrySubDivision: "Madrid",
                            country: "ES"
                        }
                    },
                    amount: 1000,
                    currency: "EUR"
                })
            })
        })

        describe('with a multiple pmtinf SEPA 001 XML file', () => {
            const multiplePmtinfSepa = fs.readFileSync(`${process.cwd()}/test/assets/example/sepa_pain_001_v3_multiple_pmtinf.xml`, 'utf8'); 
            
            test('should throw an error for multiple payment information blocks', () => {
                expect(() => {
                    SEPACreditPaymentInitiation.fromXML(multiplePmtinfSepa);
                }).toThrow('Multiple PmtInf is not supported');
            });
        })

        describe('with BIC-less creditor', () => {
            beforeEach(() => {
                const bicLessInstruction = {
                    ...paymentInstruction1,
                    creditor: {
                        name: "BIC-less Creditor",
                        account: {
                            iban: "ES8201822200150201504058"
                        },
                        address: paymentInstruction1.creditor.address
                    }
                };
                sepaPaymentInitiationConfig = {
                    initiatingParty,
                    paymentInstructions: [bicLessInstruction]
                };
            });

            test('should create valid XML without BIC', () => {
                sepaPayment = new SEPACreditPaymentInitiation(sepaPaymentInitiationConfig);
                const xml = sepaPayment.serialize();
                expect(xml).not.toContain('CdtrAgt');
                
                const xsdSchema = fs.readFileSync(
                    `${process.cwd()}/schemas/pain/pain.001.001.03.xsd`,
                    'utf8',
                );
                const xmlDoc = libxmljs.parseXml(xml);
                const xsdDoc = libxmljs.parseXml(xsdSchema);
                const isValid = xmlDoc.validate(xsdDoc);
                expect(isValid).toBeTruthy();
            });
        })

        describe('with a GS SEPA 001 XML file', () => {
            const gsSepa = fs.readFileSync(`${process.cwd()}/test/assets/goldman_sachs/pain_001_v3_sepa.xml`, 'utf8'); 
            let sepaPayment = SEPACreditPaymentInitiation.fromXML(gsSepa);
            test('information should be correctly parsed', () => {
                expect(sepaPayment.messageId).toBe("Message-Id");
                expect(sepaPayment.initiatingParty).toEqual({
                    name: "Debtor Account Holder Name",
                    id: "Client-Id",
                    account: {
                        iban: "IBAN"
                    },
                    agent: {
                        bic: "Bank BIC"
                    }
                })
                expect(sepaPayment.paymentInstructions).toHaveLength(1);

                expect(sepaPayment.paymentInstructions[0]).toEqual({
                    endToEndId: "End-to-End-Id",
                    type: "sepa",
                    direction: "credit",
                    currency: "EUR",
                    amount: 51024,
                    creditor: {
                        name: "Creditor Account Holder Name",
                        account: {
                            iban: "IBAN"
                        },
                        agent: {
                            bic: "Bank BIC"
                        }
                    }
                })
            })
        })

        describe('with a iso20022.js created SEPA 001 XML', () => {
           const messageId = uuidv4().slice(0, 35); 
           const creationDate = new Date();
           const sepaPayment = new SEPACreditPaymentInitiation({
                messageId: messageId,
                creationDate: creationDate,
                initiatingParty: initiatingParty,
                paymentInstructions: [paymentInstruction1, paymentInstruction2]
           }) 

           const recreatedSepaPayment = SEPACreditPaymentInitiation.fromXML(sepaPayment.serialize());
           expect(recreatedSepaPayment.messageId).toBe(messageId);
           expect(recreatedSepaPayment.creationDate).toStrictEqual(creationDate);
           expect(recreatedSepaPayment.paymentInstructions).toHaveLength(2);
        //    expect(recreatedSepaPayment.paymentInstructions[0]).toEqual(paymentInstruction1);
           expect(recreatedSepaPayment.paymentInstructions[0]).toEqual({...paymentInstruction1, direction: 'credit', type: 'sepa'});
           expect(recreatedSepaPayment.paymentInstructions[1]).toEqual(paymentInstruction2);
        })
    })
})
