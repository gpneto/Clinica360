
export interface Service {
  title: string;
}

export interface Staff {
  name: string;
}

export interface Client {
  name: string;
  display_name?: string;
  phone: string;
}

export interface RecordData {
  company_name?: string;
  company_adress?: string;
  company_phone?: string;
  staff?: Staff | string;
  services: Service[];
  datetime: string;
  seance_length?: number;
  client: Client;
}

export interface WebHookAgendamentoRequest {
  resource: string;
  resource_id: number | string;
  status: string;
  data: RecordData;
  enviarNotificacao?: boolean;
  companyId?: string;
}


  