import { useState, useCallback, useEffect } from 'react';
import { ref, listAll, getDownloadURL, uploadBytesResumable, getMetadata, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { showError, showSuccess } from '@/components/ui/toast';

export interface PatientFile {
  name: string;
  url: string;
  fullPath: string;
  size: number;
  contentType?: string | null;
  timeCreated?: string;
}

export function usePatientFiles(
  companyId: string | null | undefined,
  patientId: string | null | undefined,
  activeTab: string,
  singularLabel: string
) {
  const [filesLoading, setFilesLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [patientFiles, setPatientFiles] = useState<PatientFile[]>([]);

  const loadPatientFiles = useCallback(async () => {
    if (!companyId || !patientId) return;
    setFilesLoading(true);
    try {
      const baseRef = ref(storage, `companies/${companyId}/patients/${patientId}`);
      const result = await listAll(baseRef);
      const fileEntries = await Promise.all(
        result.items.map(async (itemRef) => {
          const [metadata, url] = await Promise.all([getMetadata(itemRef), getDownloadURL(itemRef)]);
          return {
            name: metadata.name || itemRef.name,
            fullPath: itemRef.fullPath,
            url,
            size: metadata.size ? Number(metadata.size) : 0,
            contentType: metadata.contentType,
            timeCreated: metadata.timeCreated,
          };
        })
      );
      fileEntries.sort((a, b) => {
        const aTime = a.timeCreated ? new Date(a.timeCreated).getTime() : 0;
        const bTime = b.timeCreated ? new Date(b.timeCreated).getTime() : 0;
        return bTime - aTime;
      });
      setPatientFiles(fileEntries);
    } catch (err: any) {
      console.error('[Paciente][Arquivos] Erro ao buscar arquivos:', err);
      if (err?.code === 'storage/retry-limit-exceeded') {
        showError('Não foi possível acessar o Storage no momento. Verifique sua conexão e tente novamente.');
      } else {
        showError(`Não foi possível carregar os arquivos do ${singularLabel}.`);
      }
    } finally {
      setFilesLoading(false);
    }
  }, [companyId, patientId, singularLabel]);

  useEffect(() => {
    if (activeTab === 'arquivos') {
      loadPatientFiles();
    }
  }, [activeTab, loadPatientFiles]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!companyId || !patientId) return;
    const file = event.target.files?.[0];
    if (!file) return;
    const sanitizedName = file.name.replace(/\s+/g, '_').replace(/[^\w.\-]/g, '');
    const storagePath = `companies/${companyId}/patients/${patientId}/${Date.now()}-${sanitizedName}`;
    const fileRef = ref(storage, storagePath);

    setUploadingFile(true);
    setUploadProgress(0);

    const metadata = {
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'usuário',
      },
    };

    const uploadTask = uploadBytesResumable(fileRef, file, metadata);

    try {
      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setUploadProgress(progress);
          },
          (error) => {
            reject(error);
          },
          () => resolve()
        );
      });
      await loadPatientFiles();
      setUploadProgress(100);
      showSuccess('Arquivo enviado com sucesso!');
    } catch (err) {
      console.error('[Paciente][Arquivos] Falha no upload:', err);
      showError('Erro ao enviar arquivo.');
    } finally {
      setUploadingFile(false);
      setUploadProgress(null);
      if (event.target) {
        event.target.value = '';
      }
    }
  }, [companyId, patientId, loadPatientFiles]);

  const handleDeleteFile = useCallback(async (fullPath: string) => {
    if (!companyId || !patientId) return;
    if (!confirm('Deseja remover este arquivo?')) return;

    try {
      await deleteObject(ref(storage, fullPath));
      showSuccess('Arquivo removido com sucesso.');
      await loadPatientFiles();
    } catch (err) {
      console.error('[Paciente][Arquivos] Erro ao excluir arquivo:', err);
      showError('Não foi possível remover o arquivo.');
    }
  }, [companyId, patientId, loadPatientFiles]);

  return {
    patientFiles,
    filesLoading,
    uploadingFile,
    uploadProgress,
    loadPatientFiles,
    handleFileUpload,
    handleDeleteFile,
  };
}

