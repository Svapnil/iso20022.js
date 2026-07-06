import { SWIFTCreditPaymentInitiation } from '../../../src/pain/001/swift-credit-payment-initiation';
import ISO20022 from '../../../src/iso20022';
import fs from 'fs';
import libxmljs from 'libxmljs';
import { SWIFTCreditPaymentInstruction } from 'index';

describe('SWIFTCreditPaymentInitiation', () => {
  let iso20022: ISO20022;
  let swiftPayment: SWIFTCreditPaymentInitiation;
  let instruction1 = {
    type: 'swift',
    direction: 'credit',
    amount: 1000,
    currency: 'USD',
    creditor: {
      name: 'John Doe',
      account: {
        iban: 'DE1234567890123456',
      },
      agent: {
        bic: 'DEUTDEFF',
      },
      address: {
        streetName: 'Main St',
        buildingNumber: '123',
        postalCode: '12345',
        townName: 'Funkytown',
        country: 'DE',
      },
    },
  } as SWIFTCreditPaymentInstruction;

  let instruction2 = {
    type: 'swift',
    direction: 'credit',
    amount: 500,
    currency: 'EUR',
    creditor: {
      name: 'Jane Doe',
      account: {
        iban: 'DE1234567890123456',
      },
      agent: {
        bic: 'DEUTDEFF',
      },
      address: {
        streetName: 'Main St',
        buildingNumber: '123',
        postalCode: '12345',
        townName: 'Funkytown',
        country: 'DE',
      },
    },
  } as SWIFTCreditPaymentInstruction;

  beforeEach(() => {
      iso20022 = new ISO20022({
        initiatingParty: {
          name: 'Acme Corporation',
          id: 'ACMEID',
          account: {
            accountNumber: '123456789012',
          },
          agent: {
            bic: 'CHASUS33',
          },
        },
      });

      swiftPayment = iso20022.createSWIFTCreditPaymentInitiation({
        paymentInstructions: [
          instruction1
        ],
      });
    });

  test('should create a SWIFTCreditPaymentInitiation instance', () => {
    expect(swiftPayment).toBeInstanceOf(SWIFTCreditPaymentInitiation);
  });

  test('should serialize to XML', () => {
    const xml = swiftPayment.serialize();
    expect(xml).toContain('<Document');
    // Add more specific XML checks here
  });

  test('serialized XML should validate against XSD', () => {
    const xml = swiftPayment.serialize();
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
    swiftPayment = iso20022.createSWIFTCreditPaymentInitiation({
      paymentInstructions: [instruction1],
      creationDate: new Date('2025-03-01T12:00:00.000Z'),
    });
    const xml = swiftPayment.serialize();
    expect(xml).toMatch(/<ReqdExctnDt>2025-03-01<\/ReqdExctnDt>/);
  });

  test('should use the execution date when provided', () => {
    swiftPayment = iso20022.createSWIFTCreditPaymentInitiation({
      paymentInstructions: [instruction1],
      creationDate: new Date('2025-03-01T12:00:00.000Z'),
      requestedExecutionDate: new Date('2025-03-15T00:00:00.000Z'),
    });
    const xml = swiftPayment.serialize();
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

  describe('when there are multiple payment instructions', () => {
    beforeEach(() => {
      swiftPayment = iso20022.createSWIFTCreditPaymentInitiation({
        paymentInstructions: [
        instruction1,
        instruction2,
      ]});
    });

    test('serialized XML should validate against XSD', () => {
      const xml = swiftPayment.serialize();
      const xsdSchema = fs.readFileSync(
        `${process.cwd()}/schemas/pain/pain.001.001.03.xsd`,
        'utf8',
      );
      const xmlDoc = libxmljs.parseXml(xml);
      const xsdDoc = libxmljs.parseXml(xsdSchema);

      const isValid = xmlDoc.validate(xsdDoc);
      expect(isValid).toBeTruthy();
    });
  });

  describe('fromXML', () => {
    describe('with example SWIFT 001 XML file', () => {
      const exampleSwift = fs.readFileSync(`${process.cwd()}/test/assets/example/swift_pain_001_v3.xml`, 'utf8');
      let swiftPayment: SWIFTCreditPaymentInitiation;

      beforeEach(() => {
        swiftPayment = SWIFTCreditPaymentInitiation.fromXML(exampleSwift);
      });

      test('should create a SWIFTCreditPaymentInitiation instance', () => {
        expect(swiftPayment).toBeInstanceOf(SWIFTCreditPaymentInitiation);
      });

      test('should correctly parse information', () => {
        expect(swiftPayment.messageId).toBe("bbd49338b6a3434aad7537d07b248a99");
        expect(swiftPayment.creationDate.toISOString()).toBe("2025-02-22T04:30:49.327Z");
        expect(swiftPayment.requestedExecutionDate).toStrictEqual(new Date("2025-02-22"));
        expect(swiftPayment.initiatingParty).toEqual({
          name: "Example Corp",
          id: "EXAMPLECORP",
          account: {
            accountNumber: "123456789"
          },
          agent: {
            bic: "CHASUS33"
          }
        });
        
        expect(swiftPayment.paymentInstructions).toHaveLength(1);
        expect(swiftPayment.paymentInstructions[0]).toEqual({
          id: "383e1d18-d7d6-4239-9622-adae81183d3",
          endToEndId: "383e1d18-d7d6-4239-9622-adae81183d3",
          type: "swift",
          direction: "credit",
          amount: 1000, // 10.00 USD in minor units
          currency: "USD",
          creditor: {
            name: "Hans Schneider",
            agent: {
              bic: "DEUTDEFF"
            },
            account: {
              iban: "DE1234567890123456"
            },
            address: {
              streetName: "Hauptstraße",
              buildingNumber: 42,
              postalCode: 10115,
              townName: "Berlin",
              country: "DE"
            }
          }
        });
      });

      test('serialized XML should validate against XSD', () => {
        const xml = swiftPayment.serialize();
        const xsdSchema = fs.readFileSync(
          `${process.cwd()}/schemas/pain/pain.001.001.03.xsd`,
          'utf8'
        );
        const xmlDoc = libxmljs.parseXml(xml);
        const xsdDoc = libxmljs.parseXml(xsdSchema);
        const isValid = xmlDoc.validate(xsdDoc);
        expect(isValid).toBeTruthy();
      });
    });

    test('should throw error for invalid XML', () => {
      expect(() => {
        SWIFTCreditPaymentInitiation.fromXML('<invalid>xml</invalid>');
      }).toThrow('Invalid XML format');
    });

    test('should throw error for invalid namespace', () => {
      expect(() => {
        SWIFTCreditPaymentInitiation.fromXML(
          '<?xml version="1.0"?><Document xmlns="wrong:namespace"></Document>'
        );
      }).toThrow('Invalid PAIN.001 namespace');
    });
  });
});
