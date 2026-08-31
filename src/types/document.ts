export type DocumentStatus = 
| "received" // chegou o arquivo no sistema, ainda não foi processado
| "processing" //" // arquivo em processo de análise
| "pending_review" // arquivo aguardando revisão
| "processed" // " // arquivo processado com sucesso
| "failed"; // um erro durante o processamento

export interface ExtractedFields {
    [key: string]: string | number | null ; 
}

export interface ClassificationResult {
    docType: string;
    confidence: number; // 0..1
    fields: ExtractedFields;
    suggestedFilename: string;
}

export interface DocumentRecord {
    id: string;
    OriginalFilename: string;
    contentHash: string;
    status: DocumentStatus;
    docType: string | null;
    confidence: number | null;
    fields: string | null;   
    suggestedFilename: string | null;
    duplicateOfId: string | null; // se este arquivo repete um hash já visto
    attempts: number;
    errorMessage: string | null;
    receivedAt: string;
    processedAt: string | null;
    reviewedAt: string | null;
}
