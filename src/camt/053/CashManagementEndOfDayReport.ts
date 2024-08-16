import { Entry, Statement, Transaction } from 'camt/types';
import { Party } from '../../lib/types';
import { XMLParser } from 'fast-xml-parser';
import { parseStatement } from './utils';

/**
 * Configuration interface for creating a CashManagementEndOfDayReport instance.
 */
interface CashManagementEndOfDayReportConfig {
  /** Unique identifier for the message */
  messageId: string;
  /** Date and time when the report was created */
  creationDate: Date;
  /** Party receiving the report */
  recipient: Party;
  /** Array of bank statements included in the report */
  statements: Statement[];
}

/**
 * Represents a Cash Management End of Day Report (CAMT.053.x).
 * This class encapsulates the data and functionality related to processing
 * and accessing information from a CAMT.053 XML file.
 */
export class CashManagementEndOfDayReport {
  private _messageId: string;
  private _creationDate: Date;
  private _recipient: Party;
  private _statements: Statement[];

  constructor(config: CashManagementEndOfDayReportConfig) {
    this._messageId = config.messageId;
    this._creationDate = config.creationDate;
    this._recipient = config.recipient;
    this._statements = config.statements;
  }

  /**
   * Creates a CashManagementEndOfDayReport instance from a raw XML string.
   *
   * @param {string} rawXml - The raw XML string containing the CAMT.053 data.
   * @returns {CashManagementEndOfDayReport} A new instance of CashManagementEndOfDayReport.
   * @throws {Error} If the XML parsing fails or required data is missing.
   */
  static fromXML(rawXml: string): CashManagementEndOfDayReport {
    const parser = new XMLParser({ ignoreAttributes: false });
    const xml = parser.parse(rawXml);
    const bankToCustomerStatement = xml.Document.BkToCstmrStmt;
    const rawCreationDate = bankToCustomerStatement.GrpHdr.CreDtTm;
    const creationDate = new Date(rawCreationDate);

    let statements: Statement[] = [];
    if (Array.isArray(bankToCustomerStatement.Stmt)) {
      statements = bankToCustomerStatement.Stmt.map((stmt: any) =>
        parseStatement(stmt),
      );
    } else {
      statements = [parseStatement(bankToCustomerStatement.Stmt)];
    }

    return new CashManagementEndOfDayReport({
      messageId: bankToCustomerStatement.GrpHdr.MsgId.toString(),
      creationDate,
      recipient: {
        id: bankToCustomerStatement.GrpHdr.MsgRcpt.Id.OrgId.Othr.Id,
        name: bankToCustomerStatement.GrpHdr.MsgRcpt.Nm,
      },
      statements: statements,
    });
  }

  get transactions(): Transaction[] {
    return this._statements
      .flatMap(statement => statement.entries)
      .flatMap(entry => entry.transactions);
  }

  get entries(): Entry[] {
    return this._statements.flatMap(statement => statement.entries);
  }

  get messageId(): string {
    return this._messageId;
  }

  get recipient(): Party {
    return this._recipient;
  }

  get creationDate(): Date {
    return this._creationDate;
  }

  get statements(): Statement[] {
    return this._statements;
  }
}