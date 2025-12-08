'use client';

import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Gallery, Item } from 'react-photoswipe-gallery';
import 'photoswipe/style.css';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { TabProps } from './types';
import type { PatientEvolution } from '@/types';
import { formatEvolutionDate, formatFileSize } from './utils';
import { useEvolutions } from './useEvolutions';
import { usePatientEvolutions } from '@/hooks/useFirestore';
import { useAuth } from '@/lib/auth-context';

export interface EvolucoesTabProps extends TabProps {
  evolutions: PatientEvolution[];
  evolutionsLoading: boolean;
}

export function EvolucoesTab({
  companyId,
  patientId,
  evolutions = [],
  evolutionsLoading,
  singularLabel = 'paciente',
  singularTitle = 'Paciente',
}: EvolucoesTabProps) {
  const { user } = useAuth();
  const { addEvolution, updateEvolution, deleteEvolution } = usePatientEvolutions(companyId, patientId || null);
  
  const {
    newEvolutionNotes,
    setNewEvolutionNotes,
    newEvolutionDate,
    setNewEvolutionDate,
    selectedEvolutionFiles,
    isSavingEvolution,
    evolutionUploadProgress,
    deletingEvolutionId,
    imageDimensions,
    handleEvolutionFilesChange,
    handleRemoveEvolutionFile,
    handleCreateEvolution,
    handleDeleteEvolution,
  } = useEvolutions(companyId, patientId, addEvolution, updateEvolution, deleteEvolution, evolutions, user, singularLabel);
  const sortedEvolutions = [...evolutions].sort((a, b) => {
    const dateA = a.date instanceof Date ? a.date : new Date(a.date);
    const dateB = b.date instanceof Date ? b.date : new Date(b.date);
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <Card className="bg-white shadow-lg border-0">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-900">Evoluções do {singularTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleCreateEvolution} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data da evolução</label>
              <Input
                type="date"
                value={newEvolutionDate}
                onChange={(event) => setNewEvolutionDate(event.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Descreva a evolução</label>
            <textarea
              value={newEvolutionNotes}
              onChange={(event) => setNewEvolutionNotes(event.target.value)}
              placeholder="Registre detalhes clínicos, procedimentos realizados, recomendações, observações importantes..."
              className="w-full min-h-[160px] border border-gray-300 rounded-lg p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">Anexos (opcional)</p>
                <p className="text-xs text-gray-500">
                  Você pode anexar imagens para ilustrar a evolução clínica do {singularLabel}.
                </p>
              </div>
              <label
                htmlFor="evolution-images"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white cursor-pointer shadow hover:bg-blue-700 transition-colors"
              >
                Selecionar imagens
                <input
                  id="evolution-images"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleEvolutionFilesChange}
                  disabled={isSavingEvolution}
                />
              </label>
            </div>

            {selectedEvolutionFiles.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {selectedEvolutionFiles.map((item, index) => (
                  <div
                    key={`${item.preview}-${index}`}
                    className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-3">
                      {item.file.type.startsWith('image/') ? (
                        <img
                          src={item.preview}
                          alt={item.file.name}
                          className="h-16 w-16 rounded-lg object-cover border border-gray-100"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-semibold">
                          FILE
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-gray-800 truncate max-w-[180px]">
                          {item.file.name}
                        </p>
                        <p className="text-xs text-gray-500">{formatFileSize(item.file.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveEvolutionFile(index)}
                      className="text-red-500 hover:text-red-600"
                      aria-label="Remover imagem"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {evolutionUploadProgress !== null && (
              <div className="w-full">
                <div className="flex justify-between text-xs text-blue-600 mb-1">
                  <span>Enviando imagens...</span>
                  <span>{evolutionUploadProgress}%</span>
                </div>
                <div className="h-2 w-full bg-blue-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-200"
                    style={{ width: `${evolutionUploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSavingEvolution}>
              {isSavingEvolution ? 'Salvando evolução...' : 'Adicionar evolução'}
            </Button>
          </div>
        </form>

        <div className="border-t border-gray-100 pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Histórico de evoluções</h3>
            <span className="text-sm text-gray-500">
              {sortedEvolutions.length} registro{sortedEvolutions.length === 1 ? '' : 's'}
            </span>
          </div>

          {evolutionsLoading ? (
            <div className="py-10 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : sortedEvolutions.length === 0 ? (
            <div className="py-12 text-center text-gray-500 border border-gray-100 rounded-xl bg-gray-50/70">
              Nenhuma evolução registrada ainda. Utilize o formulário acima para registrar a primeira.
            </div>
          ) : (
            <Gallery withCaption options={{ loop: true }}>
              <div className="space-y-4">
                {sortedEvolutions.map((evolution) => (
                  <div
                    key={evolution.id}
                    className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4 sm:p-5 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatEvolutionDate(evolution.date)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Registrado{' '}
                          {formatDistanceToNow(evolution.createdAt, {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEvolution(evolution)}
                          disabled={deletingEvolutionId === evolution.id}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          {deletingEvolutionId === evolution.id ? 'Removendo...' : 'Excluir'}
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {evolution.notes || 'Sem descrição'}
                    </p>

                    {evolution.images.length > 0 && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {evolution.images.map((image) => {
                          const dimensions = imageDimensions[image.storagePath] ?? {
                            width: 1200,
                            height: 1200,
                          };
                          return (
                            <Item
                              key={image.storagePath}
                              original={image.url}
                              thumbnail={image.url}
                              width={dimensions.width}
                              height={dimensions.height}
                              caption={`${formatEvolutionDate(evolution.date)} — ${image.name}${
                                evolution.notes ? ` • ${evolution.notes}` : ''
                              }`}
                            >
                              {({ ref, open }) => (
                                <div
                                  className="group relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50 cursor-zoom-in"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    open(event);
                                  }}
                                >
                                  <img
                                    ref={(node) => {
                                      if (node) ref(node);
                                    }}
                                    src={image.url}
                                    alt={image.name}
                                    className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  />
                                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur px-3 py-2 flex items-center justify-between text-xs text-white">
                                    <span className="truncate pr-2">{image.name}</span>
                                    <a
                                      href={image.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="underline text-white"
                                      onClick={(event) => event.stopPropagation()}
                                    >
                                      Abrir
                                    </a>
                                  </div>
                                </div>
                              )}
                            </Item>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Gallery>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

