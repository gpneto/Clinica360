'use client';

import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { TabProps } from './types';
import { usePatientFiles } from './usePatientFiles';
import { formatFileSize } from './utils';

export interface ArquivosTabProps extends TabProps {
  activeTab: string;
}

export function ArquivosTab({
  companyId,
  patientId,
  activeTab,
  singularLabel = 'paciente',
  singularTitle = 'Paciente',
}: ArquivosTabProps) {
  const {
    patientFiles,
    filesLoading,
    uploadingFile,
    uploadProgress,
    loadPatientFiles,
    handleFileUpload,
    handleDeleteFile,
  } = usePatientFiles(companyId, patientId, activeTab, singularLabel);
  return (
    <Card className="bg-white shadow-lg border-0">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <CardTitle className="text-xl font-semibold text-gray-900">Arquivos do {singularTitle}</CardTitle>
          <p className="text-sm text-gray-500">
            Envie exames, relatórios ou documentos importantes deste {singularLabel}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadPatientFiles} disabled={filesLoading}>
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="border border-dashed border-blue-200 rounded-2xl bg-blue-50/40 p-6 sm:p-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Upload className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-700">Selecione arquivos para enviar</p>
              <p className="text-xs text-blue-600/80">
                Suporta até 25 MB por arquivo. Aceita imagens, PDFs e documentos comuns.
              </p>
            </div>
            <label
              htmlFor="patient-file-upload"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white cursor-pointer shadow hover:bg-blue-700 transition-colors"
            >
              Escolher arquivo
              <input
                id="patient-file-upload"
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploadingFile}
              />
            </label>
            {uploadingFile && (
              <div className="w-full max-w-md">
                <div className="flex justify-between text-xs text-blue-700 mb-1">
                  <span>Enviando arquivo...</span>
                  <span>{uploadProgress ?? 0}%</span>
                </div>
                <div className="h-2 w-full bg-blue-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-200"
                    style={{ width: `${uploadProgress ?? 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              {patientFiles.length} arquivo{patientFiles.length === 1 ? '' : 's'} armazenado{patientFiles.length === 1 ? '' : 's'}
            </h3>
          </div>

          {filesLoading ? (
            <div className="py-10 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : patientFiles.length === 0 ? (
            <div className="py-12 text-center text-gray-500 border border-gray-100 rounded-xl">
              Nenhum arquivo enviado para este {singularLabel} ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {patientFiles.map((file) => (
                <div
                  key={file.fullPath}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-gray-100 rounded-xl hover:border-blue-200 transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-800 break-all">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)} ·{' '}
                      {file.timeCreated
                        ? formatDistanceToNow(new Date(file.timeCreated), { addSuffix: true, locale: ptBR })
                        : 'Data não disponível'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      Abrir arquivo
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteFile(file.fullPath)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

