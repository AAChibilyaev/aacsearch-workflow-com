import ApiCall from './ApiCall';
import Collections from './Collections';
import Documents from './Documents';
import type { DocumentSchema, DocumentsRetrieveParams, DocumentWriteParams } from './Types';

export default class Document<T extends DocumentSchema = DocumentSchema> {
  constructor(
    private collectionName: string,
    private documentId: string,
    private apiCall: ApiCall,
  ) {}

  async retrieve(options: DocumentsRetrieveParams = {}): Promise<T> {
    return this.apiCall.get<T>(this.endpointPath(), options as Record<string,unknown>);
  }

  async delete(options: { batch_size?: number } = {}): Promise<T> {
    return this.apiCall.delete<T>(this.endpointPath(), options as Record<string,unknown>);
  }

  async update(
    partialDocument: Partial<T>,
    options: DocumentWriteParams = {},
  ): Promise<T> {
    return this.apiCall.patch<T>(this.endpointPath(), partialDocument, options as Record<string,unknown>);
  }

  private endpointPath(): string {
    return `${Collections.RESOURCEPATH}/${encodeURIComponent(this.collectionName)}${Documents.RESOURCEPATH}/${encodeURIComponent(this.documentId)}`;
  }
}
