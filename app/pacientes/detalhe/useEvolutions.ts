import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { showError, showSuccess } from '@/components/ui/toast';
import type { PatientEvolution } from '@/types';

export function useEvolutions(
  companyId: string | null | undefined,
  patientId: string | null | undefined,
  addEvolution: (data: { date: Date; notes: string; images: any[]; createdByUid: string | null }) => Promise<string>,
  updateEvolution: (id: string, data: { images: any[] }) => Promise<void>,
  deleteEvolution: (id: string) => Promise<void>,
  evolutions: PatientEvolution[],
  user: any,
  singularLabel: string
) {
  const [newEvolutionNotes, setNewEvolutionNotes] = useState('');
  const [newEvolutionDate, setNewEvolutionDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedEvolutionFiles, setSelectedEvolutionFiles] = useState<Array<{ file: File; preview: string }>>([]);
  const [isSavingEvolution, setIsSavingEvolution] = useState(false);
  const [evolutionUploadProgress, setEvolutionUploadProgress] = useState<number | null>(null);
  const [deletingEvolutionId, setDeletingEvolutionId] = useState<string | null>(null);
  const evolutionFilesRef = useRef<Array<{ file: File; preview: string }>>([]);
  const [imageDimensions, setImageDimensions] = useState<Record<string, { width: number; height: number }>>({});

  // Atualizar ref quando selectedEvolutionFiles mudar
  useEffect(() => {
    evolutionFilesRef.current = selectedEvolutionFiles;
  }, [selectedEvolutionFiles]);

  // Calcular dimensões das imagens para a galeria
  const galleryImages = useMemo(() => {
    const allImages: Array<{ url: string; storagePath: string }> = [];
    evolutions.forEach((evolution) => {
      if (Array.isArray(evolution.images)) {
        evolution.images.forEach((img) => {
          if (img.url && img.storagePath) {
            allImages.push({ url: img.url, storagePath: img.storagePath });
          }
        });
      }
    });
    return allImages;
  }, [evolutions]);

  useEffect(() => {
    galleryImages.forEach((image) => {
      if (imageDimensions[image.storagePath]) return;

      const img = new Image();
      img.src = image.url;
      img.onload = () => {
        setImageDimensions((prev) => {
          if (prev[image.storagePath]) return prev;
          return {
            ...prev,
            [image.storagePath]: { width: img.naturalWidth, height: img.naturalHeight },
          };
        });
      };
      img.onerror = () => {
        setImageDimensions((prev) => {
          if (prev[image.storagePath]) return prev;
          return {
            ...prev,
            [image.storagePath]: { width: 1200, height: 1200 },
          };
        });
      };
    });
  }, [galleryImages, imageDimensions]);

  const handleEvolutionFilesChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const entries = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setSelectedEvolutionFiles((prev) => [...prev, ...entries]);
    event.target.value = '';
  }, []);

  const handleRemoveEvolutionFile = useCallback((index: number) => {
    setSelectedEvolutionFiles((prev) => {
      const copy = [...prev];
      const [removed] = copy.splice(index, 1);
      if (removed) {
        URL.revokeObjectURL(removed.preview);
      }
      return copy;
    });
  }, []);

  const clearSelectedEvolutionFiles = useCallback(() => {
    evolutionFilesRef.current.forEach((item) => URL.revokeObjectURL(item.preview));
    evolutionFilesRef.current = [];
    setSelectedEvolutionFiles([]);
  }, []);

  const handleCreateEvolution = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!companyId || !patientId) {
      showError(`Empresa ou ${singularLabel} não encontrado.`);
      return;
    }

    if (!newEvolutionNotes.trim()) {
      showError('Descreva a evolução antes de salvar.');
      return;
    }

    if (!newEvolutionDate) {
      showError('Selecione a data da evolução.');
      return;
    }

    const date = new Date(`${newEvolutionDate}T12:00:00`);
    if (Number.isNaN(date.getTime())) {
      showError('Data da evolução inválida.');
      return;
    }

    setIsSavingEvolution(true);
    setEvolutionUploadProgress(null);

    try {
      const evolutionId = await addEvolution({
        date,
        notes: newEvolutionNotes.trim(),
        images: [],
        createdByUid: user?.uid ?? null,
      });

      if (selectedEvolutionFiles.length > 0) {
        const uploadedImages: PatientEvolution['images'] = [];

        for (let index = 0; index < selectedEvolutionFiles.length; index += 1) {
          const { file } = selectedEvolutionFiles[index];
          const sanitizedName = file.name.replace(/\s+/g, '_').replace(/[^\w.\-]/g, '');
          const storagePath = `companies/${companyId}/patients/${patientId}/evolutions/${evolutionId}/${Date.now()}-${sanitizedName}`;
          const fileRef = ref(storage, storagePath);

          const metadata = {
            customMetadata: {
              originalName: file.name,
              uploadedAt: new Date().toISOString(),
              uploadedBy: user?.uid || 'usuário',
            },
            contentType: file.type || undefined,
          };

          await new Promise<void>((resolve, reject) => {
            const uploadTask = uploadBytesResumable(fileRef, file, metadata);
            uploadTask.on(
              'state_changed',
              (snapshot) => {
                const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                const totalProgress = Math.round(((index + progress / 100) / selectedEvolutionFiles.length) * 100);
                setEvolutionUploadProgress(totalProgress);
              },
              (error) => reject(error),
              () => resolve()
            );
          });

          const url = await getDownloadURL(fileRef);
          uploadedImages.push({
            url,
            storagePath,
            name: file.name,
            size: file.size,
            contentType: file.type || undefined,
            uploadedAt: new Date(),
          });
        }

        await updateEvolution(evolutionId, { images: uploadedImages });
      }

      showSuccess('Evolução registrada com sucesso.');
      setNewEvolutionNotes('');
      setNewEvolutionDate(new Date().toISOString().split('T')[0]);
      clearSelectedEvolutionFiles();
    } catch (err) {
      console.error('[Paciente][Evoluções] Erro ao salvar evolução:', err);
      showError('Não foi possível salvar a evolução.');
    } finally {
      setIsSavingEvolution(false);
      setEvolutionUploadProgress(null);
    }
  }, [companyId, patientId, newEvolutionNotes, newEvolutionDate, selectedEvolutionFiles, addEvolution, updateEvolution, user, singularLabel, clearSelectedEvolutionFiles]);

  const handleDeleteEvolution = useCallback(async (evolution: PatientEvolution) => {
    if (!companyId || !patientId) {
      showError(`Empresa ou ${singularLabel} não encontrado.`);
      return;
    }

    const confirmed = window.confirm('Deseja remover esta evolução?');
    if (!confirmed) return;

    setDeletingEvolutionId(evolution.id);

    try {
      if (Array.isArray(evolution.images)) {
        for (const image of evolution.images) {
          if (image.storagePath) {
            try {
              await deleteObject(ref(storage, image.storagePath));
            } catch (storageErr) {
              console.warn('[Paciente][Evoluções] Falha ao remover imagem do Storage:', storageErr);
            }
          }
        }
      }

      await deleteEvolution(evolution.id);
      showSuccess('Evolução removida com sucesso.');
    } catch (err) {
      console.error('[Paciente][Evoluções] Erro ao remover evolução:', err);
      showError('Não foi possível remover a evolução.');
    } finally {
      setDeletingEvolutionId(null);
    }
  }, [companyId, patientId, deleteEvolution, singularLabel]);

  return {
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
  };
}

