export type DocumentStatus = 
| "recebido" // chegou o arquivo no sistema, ainda não foi processado
| "processando" // arquivo em processo de análise
| "aguardando_revisao" // arquivo aguardando revisão
| "processado" // arquivo processado com sucesso
| "erro" // ocorreu um erro durante o processamento

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
