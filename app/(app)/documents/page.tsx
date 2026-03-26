"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useLanguage } from "../language-context";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Download from "yet-another-react-lightbox/plugins/download";
import "yet-another-react-lightbox/styles.css";

type Role = {
  id: string;
  name: string;
  nameEn: string;
};

type DocumentItem = {
  id: string;
  title: string;
  content?: string;
  creator: Role;
  visibleRoles: Role[];
  attachments: Array<{
    id: string;
    filename: string;
    filepath: string;
    mimetype: string;
    size: number;
    thumbnail?: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

type DocumentsResponse = {
  currentRoleId: string;
  roles: Role[];
  documents: DocumentItem[];
};

type EditDraft = {
  title: string;
  content: string;
  visibleAll: boolean;
  visibleRoleIds: string[];
  attachments: Array<{
    id: string;
    filename: string;
    filepath: string;
    mimetype: string;
    size: number;
    thumbnail?: string;
  }>;
  newAttachments: Array<{
    filename: string;
    filepath: string;
    mimetype: string;
    size: number;
  }>;
};

export default function DocumentsPage() {
  const { language, t } = useLanguage();
  const [data, setData] = useState<DocumentsResponse | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [visibleAll, setVisibleAll] = useState(false);
  const [visibleRoleIds, setVisibleRoleIds] = useState<string[]>([]);
  const [expandedDocIds, setExpandedDocIds] = useState<string[]>([]);
  const [editingDocId, setEditingDocId] = useState("");
  const [editingDraft, setEditingDraft] = useState<EditDraft | null>(null);
  const [deleteDocId, setDeleteDocId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    filename: string;
    filepath: string;
    mimetype: string;
    size: number;
  }>>([]);
  const [uploading, setUploading] = useState(false);
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [loadingDocIds, setLoadingDocIds] = useState<Set<string>>(new Set());
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxImages, setLightboxImages] = useState<Array<{
    src: string;
    thumbnail?: string;
    alt: string;
  }>>([]);

  function clearDocumentsCache() {
    sessionStorage.removeItem('documents-cache');
  }

  function updateDataAndCache(updater: (prev: DocumentsResponse | null) => DocumentsResponse | null) {
    setData(prev => {
      const updated = updater(prev);
      if (updated) {
        sessionStorage.setItem('documents-cache', JSON.stringify(updated));
      }
      return updated;
    });
  }

  async function loadDocs() {
    // Try to show cached data immediately
    const cached = sessionStorage.getItem('documents-cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        console.log('[loadDocs] Loading from cache, docs with content:',
          parsed.documents.filter((d: DocumentItem) => d.content !== undefined).map((d: DocumentItem) => d.id));
        setData(parsed);
      } catch {}
    }

    // Fetch fresh data in background
    const res = await fetch("/api/documents", {
      cache: "no-store",
      headers: {
        "Accept-Language": language === "zh" ? "zh-CN" : "en-US"
      }
    });

    if (!res.ok) {
      const text = await res.text();
      setError(`加载失败 (${res.status}): ${text}`);
      return;
    }

    const json = await res.json();

    // Merge with existing data to preserve loaded content
    setData(prev => {
      if (!prev) return json;

      const merged = {
        ...json,
        documents: json.documents.map((newDoc: DocumentItem) => {
          const oldDoc = prev.documents.find(d => d.id === newDoc.id);
          return {
            ...newDoc,
            content: oldDoc?.content !== undefined ? oldDoc.content : newDoc.content,
            attachments: oldDoc?.attachments.length ? oldDoc.attachments : newDoc.attachments
          };
        })
      };

      // Cache merged data with loaded content
      sessionStorage.setItem('documents-cache', JSON.stringify(merged));
      return merged;
    });
  }

  useEffect(() => {
    loadDocs();
    const saved = localStorage.getItem("expandedDocIds");
    if (saved) {
      try {
        const ids = JSON.parse(saved);
        console.log('[useEffect] Setting expandedDocIds from localStorage:', ids);
        setExpandedDocIds(ids);
      } catch {}
    }
  }, []);

  useEffect(() => {
    loadDocs();
  }, [language]);

  useEffect(() => {
    if (!data || expandedDocIds.length === 0) return;

    async function loadExpandedContents() {
      if (!data) return;

      console.log('[loadExpandedContents] Effect triggered, expandedDocIds:', expandedDocIds);
      console.log('[loadExpandedContents] Current data docs with content:',
        data.documents.filter(d => d.content !== undefined).map(d => d.id));

      // Clear loading state for docs that already have content
      const docsWithContent = expandedDocIds.filter(docId => {
        const doc = data.documents.find(d => d.id === docId);
        return doc && doc.content !== undefined;
      });
      if (docsWithContent.length > 0) {
        console.log('[loadExpandedContents] Clearing loadingDocIds for docs with content:', docsWithContent);
        setLoadingDocIds(prev => {
          const next = new Set(prev);
          docsWithContent.forEach(id => next.delete(id));
          console.log('[loadExpandedContents] loadingDocIds after clearing:', Array.from(next));
          return next;
        });
      }

      const docsNeedingData = expandedDocIds.map(docId => {
        const doc = data.documents.find(d => d.id === docId);
        return doc ? { docId, needsContent: doc.content === undefined, needsAttachments: doc.attachments.length === 0 } : null;
      }).filter(Boolean);

      console.log('[loadExpandedContents] docsNeedingData:', docsNeedingData);

      if (docsNeedingData.length === 0) return;

      const docsNeedingContent = docsNeedingData.filter(d => d?.needsContent).map(d => d!.docId);
      if (docsNeedingContent.length > 0) {
        console.log('[loadExpandedContents] Setting loadingDocIds for docs needing content:', docsNeedingContent);
        setLoadingDocIds(prev => new Set([...prev, ...docsNeedingContent]));
      }

      const promises = docsNeedingData.map(async (item) => {
        if (!item) return null;
        const [contentRes, attachRes] = await Promise.all([
          item.needsContent ? fetch(`/api/documents/${item.docId}/content`, {
            headers: { "Accept-Language": language === "zh" ? "zh-CN" : "en-US" }
          }) : Promise.resolve(null),
          item.needsAttachments ? fetch(`/api/documents/${item.docId}/attachments`) : Promise.resolve(null)
        ]);

        const [content, attachments] = await Promise.all([
          contentRes?.ok ? contentRes.json().then(j => j.content) : null,
          attachRes?.ok ? attachRes.json().then(j => j.attachments) : null
        ]);

        return { docId: item.docId, content, attachments };
      });

      const results = await Promise.all(promises);

      updateDataAndCache(prev => {
        if (!prev) return null;
        let updated = { ...prev, documents: [...prev.documents] };
        results.forEach(result => {
          if (result) {
            updated.documents = updated.documents.map(d =>
              d.id === result.docId ? {
                ...d,
                ...(result.content && { content: result.content }),
                ...(result.attachments && { attachments: result.attachments })
              } : d
            );
          }
        });
        return updated;
      });

      if (docsNeedingContent.length > 0) {
        console.log('[loadExpandedContents] Clearing loadingDocIds after fetch for:', docsNeedingContent);
        setLoadingDocIds(prev => {
          const next = new Set(prev);
          docsNeedingContent.forEach(id => next.delete(id));
          console.log('[loadExpandedContents] loadingDocIds after fetch clearing:', Array.from(next));
          return next;
        });
      }
    }

    loadExpandedContents();
  }, [data?.documents.length, expandedDocIds.length, language]);

  const roles = useMemo(() => data?.roles ?? [], [data]);

  function displayRoleName(role: Role) {
    return language === "en" && role.nameEn ? role.nameEn : role.name;
  }

  function toggleVisible(roleId: string) {
    setVisibleRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  }

  function toggleEditVisible(roleId: string) {
    if (!editingDraft) return;
    setEditingDraft({
      ...editingDraft,
      visibleRoleIds: editingDraft.visibleRoleIds.includes(roleId)
        ? editingDraft.visibleRoleIds.filter((id) => id !== roleId)
        : [...editingDraft.visibleRoleIds, roleId]
    });
  }

  function openLightbox(docId: string, imageIndex: number) {
    const doc = data?.documents.find(d => d.id === docId);
    if (!doc) return;

    const images = doc.attachments
      .filter(f => f.mimetype.startsWith("image/"))
      .map(f => ({
        src: `/api/files/${f.filepath.split('/').pop()}`,
        thumbnail: f.thumbnail,
        alt: f.filename
      }));

    setLightboxImages(images);
    setLightboxIndex(imageIndex);
    setLightboxOpen(true);
  }

  async function toggleDoc(docId: string) {
    const isExpanding = !expandedDocIds.includes(docId);

    setExpandedDocIds((prev) => {
      const next = prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId];
      localStorage.setItem("expandedDocIds", JSON.stringify(next));
      return next;
    });

    if (isExpanding && data) {
      const doc = data.documents.find(d => d.id === docId);
      if (doc) {
        // 1. 优先加载文档内容
        if (doc.content === undefined) {
          const contentRes = await fetch(`/api/documents/${docId}/content`, {
            headers: {
              "Accept-Language": language === "zh" ? "zh-CN" : "en-US"
            }
          });
          if (contentRes.ok) {
            const contentJson = await contentRes.json();
            updateDataAndCache(prev => prev ? {
              ...prev,
              documents: prev.documents.map(d =>
                d.id === docId ? { ...d, content: contentJson.content } : d
              )
            } : null);
          }
        }

        // 2. 后台异步加载图片（不阻塞）
        setTimeout(() => {
          if (doc.attachments.length === 0) {
            fetch(`/api/documents/${docId}/attachments`)
              .then(res => res.json())
              .then(attachJson => {
                updateDataAndCache(prev => prev ? {
                  ...prev,
                  documents: prev.documents.map(d =>
                    d.id === docId ? { ...d, attachments: attachJson.attachments } : d
                  )
                } : null);
              });
          }
        }, 0);
      }
    }
  }

  function formatDocDate(value: string) {
    return new Date(value).toLocaleDateString("zh-CN");
  }

  async function compressImage(file: File): Promise<File> {
    if (!file.type.startsWith('image/')) return file;
    if (file.size <= 1024 * 1024) return file; // Skip if < 1MB

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxSize = 1920;

          if (width > height && width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }));
            } else {
              resolve(file);
            }
          }, 'image/jpeg', 0.85);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError("");

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const compressedFile = await compressImage(file);
        const formData = new FormData();
        formData.append("file", compressedFile);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

        try {
          const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || `上传 ${file.name} 失败 (${res.status})`);
          }

          return res.json();
        } catch (err) {
          clearTimeout(timeoutId);
          if (err instanceof Error && err.name === 'AbortError') {
            throw new Error(`上传 ${file.name} 超时，请检查网络连接`);
          }
          throw err;
        }
      });

      const results = await Promise.all(uploadPromises);
      setUploadedFiles((prev) => [...prev, ...results]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "文件上传失败");
    } finally {
      setUploading(false);
    }
  }

  async function handleEditFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0 || !editingDraft) return;

    setUploading(true);
    setError("");

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData
        });

        if (!res.ok) {
          throw new Error(`上传 ${file.name} 失败`);
        }

        return res.json();
      });

      const results = await Promise.all(uploadPromises);
      setEditingDraft({
        ...editingDraft,
        newAttachments: [...editingDraft.newAttachments, ...results]
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "文件上传失败");
    } finally {
      setUploading(false);
    }
  }

  async function createDoc(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, visibleAll, visibleRoleIds, attachments: uploadedFiles })
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "创建失败");
      return;
    }

    setTitle("");
    setContent("# 新文档\n");
    setUploadedFiles([]);
    setCreateOpen(false);
    clearDocumentsCache();
    await loadDocs();
  }

  async function startEdit(doc: DocumentItem) {
    setEditingDocId(doc.id);
    setDeleteDocId("");
    setExpandedDocIds((prev) => (prev.includes(doc.id) ? prev : [...prev, doc.id]));

    let content = doc.content;
    if (!content) {
      const res = await fetch(`/api/documents/${doc.id}/content`, {
        headers: {
          "Accept-Language": language === "zh" ? "zh-CN" : "en-US"
        }
      });
      if (res.ok) {
        const json = await res.json();
        content = json.content;
        setData(prev => prev ? {
          ...prev,
          documents: prev.documents.map(d =>
            d.id === doc.id ? { ...d, content } : d
          )
        } : null);
      }
    }

    setEditingDraft({
      title: doc.title,
      content: content || "",
      visibleAll: false,
      visibleRoleIds: doc.visibleRoles.map((role) => role.id),
      attachments: doc.attachments,
      newAttachments: []
    });
  }

  async function saveDoc(docId: string) {
    if (!editingDraft) return;

    const res = await fetch(`/api/documents/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editingDraft.title,
        content: editingDraft.content,
        visibleAll: editingDraft.visibleAll,
        visibleRoleIds: editingDraft.visibleAll ? [] : editingDraft.visibleRoleIds,
        keepAttachmentIds: editingDraft.attachments.map((a) => a.id),
        newAttachments: editingDraft.newAttachments
      })
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "更新失败");
      return;
    }

    setEditingDocId("");
    setEditingDraft(null);
    clearDocumentsCache();
    await loadDocs();
  }

  async function deleteDoc(docId: string) {
    const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "删除失败");
      return;
    }

    setDeleteDocId("");
    setExpandedDocIds((prev) => prev.filter((id) => id !== docId));
    if (editingDocId === docId) {
      setEditingDocId("");
      setEditingDraft(null);
    }
    clearDocumentsCache();
    await loadDocs();
  }

  return (
    <main className="section-grid docs-page">
      <section className="panel docs-composer">
        <button
          type="button"
          className="collapsible-toggle docs-composer__toggle"
          onClick={() => setCreateOpen((prev) => !prev)}
        >
          <span className="docs-composer__title-wrap">
            <span className="docs-composer__title">{t("createSharedDoc")}</span>
          </span>
          <span className="docs-composer__toggle-text">{createOpen ? t("collapse") : t("expand")}</span>
        </button>

        {createOpen ? (
          <form onSubmit={createDoc} className="section-grid docs-composer__form" style={{ marginTop: "1rem" }}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("docTitlePlaceholder")} required />
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8} placeholder="支持 Markdown 格式..." />

            <label className={`pill docs-visibility-toggle${visibleAll ? " pill--active" : ""}`} style={{ width: "fit-content" }}>
              <input
                type="checkbox"
                checked={visibleAll}
                onChange={(e) => setVisibleAll(e.target.checked)}
                style={{ width: 16, height: 16, padding: 0, margin: 0 }}
              />
              {t("visibleToAll")}
            </label>

            {!visibleAll ? (
              <div className="pill-row">
                {roles.map((role) => (
                  <label key={role.id} className={`role-chip${visibleRoleIds.includes(role.id) ? " role-chip--selected" : ""}`}>
                    <input
                      type="checkbox"
                      checked={visibleRoleIds.includes(role.id)}
                      onChange={() => toggleVisible(role.id)}
                      style={{ width: 16, height: 16, padding: 0, margin: 0 }}
                    />
                    <span>
                      {displayRoleName(role)}
                    </span>
                  </label>
                ))}
              </div>
            ) : null}

            <div>
              <label className="eyebrow" style={{ marginBottom: 8 }}>
                {t("attachments")}
              </label>
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                disabled={uploading}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              />
              {uploading ? <p className="inline-note">上传中...</p> : null}
              {uploadedFiles.length > 0 ? (
                <div style={{ marginTop: "0.5rem" }}>
                  {uploadedFiles.map((file, index) => (
                    <div key={index} style={{ fontSize: "0.9rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                      <span>📎 {file.filename} ({(file.size / 1024).toFixed(1)} KB)</span>
                      <button
                        type="button"
                        onClick={() => setUploadedFiles((prev) => prev.filter((_, i) => i !== index))}
                        style={{ color: "var(--danger)", cursor: "pointer", background: "none", border: "none", padding: 0 }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="btn-row">
              <button type="submit" className="btn btn-primary">
                {t("createDocument")}
              </button>
            </div>
          </form>
        ) : null}
      </section>

      {error ? <div className="error-note">{error}</div> : null}

      <section className="section-grid docs-list">
        {data?.documents.map((doc) => {
          const expanded = expandedDocIds.includes(doc.id);
          const editable = doc.creator.id === data.currentRoleId;
          const editing = editingDocId === doc.id && editingDraft;
          const deleting = deleteDocId === doc.id;

          return (
            <article key={doc.id} className={`panel docs-entry${expanded ? " docs-entry--expanded" : ""}`}>
              <button type="button" className="collapsible-toggle docs-entry__toggle" onClick={() => toggleDoc(doc.id)}>
                <span className="doc-title-block">
                  <span className="doc-title-line">
                    <span className="doc-title-text">{doc.title}</span>
                    <span className="doc-title-meta">
                      {formatDocDate(doc.createdAt)} · {displayRoleName(doc.creator)}
                    </span>
                  </span>
                </span>
                <span className="docs-entry__toggle-text">{expanded ? t("collapse") : t("expand")}</span>
              </button>

              {expanded ? (
                <div className="stack-card docs-entry__body">
                  <div className="task-card__meta docs-entry__meta">
                    {t("visibleRange")}：{doc.visibleRoles.map((r) => displayRoleName(r)).join("、")}
                  </div>

                  {editing ? (
                    <div className="inline-form docs-entry__editor">
                      <input
                        value={editingDraft.title}
                        onChange={(e) => setEditingDraft({ ...editingDraft, title: e.target.value })}
                        placeholder={t("docTitlePlaceholder")}
                      />
                      <textarea
                        rows={10}
                        value={editingDraft.content}
                        onChange={(e) => setEditingDraft({ ...editingDraft, content: e.target.value })}
                      />
                      <label className={`pill${editingDraft.visibleAll ? " pill--active" : ""}`} style={{ width: "fit-content" }}>
                        <input
                          type="checkbox"
                          checked={editingDraft.visibleAll}
                          onChange={(e) => setEditingDraft({ ...editingDraft, visibleAll: e.target.checked })}
                          style={{ width: 16, height: 16, padding: 0, margin: 0 }}
                        />
                        {t("visibleToAll")}
                      </label>

                      {!editingDraft.visibleAll ? (
                        <div className="pill-row">
                          {roles.map((role) => (
                            <label
                              key={role.id}
                              className={`role-chip${editingDraft.visibleRoleIds.includes(role.id) ? " role-chip--selected" : ""}`}
                            >
                              <input
                                type="checkbox"
                                checked={editingDraft.visibleRoleIds.includes(role.id)}
                                onChange={() => toggleEditVisible(role.id)}
                                style={{ width: 16, height: 16, padding: 0, margin: 0 }}
                              />
                              <span>
                                {role.name}
                              </span>
                            </label>
                          ))}
                        </div>
                      ) : null}

                      <div>
                        <label className="eyebrow" style={{ marginBottom: 8 }}>
                          {t("attachments")}
                        </label>
                        <input
                          type="file"
                          multiple
                          onChange={handleEditFileUpload}
                          disabled={uploading}
                          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                        />
                        {uploading ? <p className="inline-note">上传中...</p> : null}
                        {editingDraft.attachments.length > 0 || editingDraft.newAttachments.length > 0 ? (
                          <div style={{ marginTop: "0.5rem" }}>
                            {editingDraft.attachments.map((file) => (
                              <div key={file.id} style={{ fontSize: "0.9rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                                <span>📎 {file.filename} ({(file.size / 1024).toFixed(1)} KB)</span>
                                <button
                                  type="button"
                                  onClick={() => setEditingDraft({ ...editingDraft, attachments: editingDraft.attachments.filter((a) => a.id !== file.id) })}
                                  style={{ color: "var(--danger)", cursor: "pointer", background: "none", border: "none", padding: 0 }}
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                            {editingDraft.newAttachments.map((file, index) => (
                              <div key={index} style={{ fontSize: "0.9rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                                <span>📎 {file.filename} ({(file.size / 1024).toFixed(1)} KB) <em>(新)</em></span>
                                <button
                                  type="button"
                                  onClick={() => setEditingDraft({ ...editingDraft, newAttachments: editingDraft.newAttachments.filter((_, i) => i !== index) })}
                                  style={{ color: "var(--danger)", cursor: "pointer", background: "none", border: "none", padding: 0 }}
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="btn-row">
                        <button type="button" className="btn btn-primary" onClick={() => saveDoc(doc.id)}>
                          {t("save")}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => {
                            setEditingDocId("");
                            setEditingDraft(null);
                          }}
                        >
                          {t("cancel")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {loadingDocIds.has(doc.id) ? (
                        <div style={{
                          padding: "2rem",
                          textAlign: "center",
                          borderTop: "1px solid var(--line)",
                          color: "var(--muted)"
                        }}>
                          正在加载数据...
                        </div>
                      ) : (
                        <article className="markdown docs-entry__markdown" style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}>
                          <ReactMarkdown>{doc.content}</ReactMarkdown>
                        </article>
                      )}

                      {doc.attachments.length > 0 ? (
                        <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--line)" }}>
                          <div className="eyebrow" style={{ marginBottom: "0.5rem" }}>
                            附件
                            {Array.from(loadingImages).some(id => doc.attachments.some(a => a.id === id)) && (
                              <span style={{ marginLeft: "0.5rem", fontSize: "0.85rem", color: "var(--muted)" }}>
                                图片加载中...
                              </span>
                            )}
                          </div>
                          {doc.attachments.map((file) => {
                            const isImage = file.mimetype.startsWith("image/");
                            const protectedUrl = `/api/files/${file.filepath.split('/').pop()}`;
                            const isLoading = loadingImages.has(file.id);
                            return (
                              <div key={file.id} style={{ marginBottom: "1rem" }}>
                                {isImage ? (
                                  <div>
                                    {isLoading && (
                                      <div style={{
                                        padding: "2rem",
                                        textAlign: "center",
                                        background: "var(--surface)",
                                        borderRadius: "8px",
                                        color: "var(--muted)"
                                      }}>
                                        加载中...
                                      </div>
                                    )}
                                    <img
                                      src={file.thumbnail || protectedUrl}
                                      alt={file.filename}
                                      onClick={() => {
                                        const imageIndex = doc.attachments
                                          .filter(f => f.mimetype.startsWith("image/"))
                                          .findIndex(f => f.id === file.id);
                                        openLightbox(doc.id, imageIndex);
                                      }}
                                      onLoadStart={() => {
                                        setLoadingImages(prev => new Set(prev).add(file.id));
                                      }}
                                      onLoad={() => {
                                        setLoadingImages(prev => {
                                          const next = new Set(prev);
                                          next.delete(file.id);
                                          return next;
                                        });
                                        setLoadedImages(prev => new Set(prev).add(file.id));
                                      }}
                                      onError={() => {
                                        setLoadingImages(prev => {
                                          const next = new Set(prev);
                                          next.delete(file.id);
                                          return next;
                                        });
                                      }}
                                      style={{
                                        width: "100%",
                                        height: "auto",
                                        borderRadius: "8px",
                                        marginBottom: "0.5rem",
                                        cursor: "pointer",
                                        display: isLoading ? "none" : "block"
                                      }}
                                    />
                                    <div style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
                                      📎 {file.filename} ({(file.size / 1024).toFixed(1)} KB)
                                    </div>
                                  </div>
                                ) : (
                                  <a
                                    href={protectedUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: "var(--theme-brand)", textDecoration: "none" }}
                                  >
                                    📎 {file.filename} ({(file.size / 1024).toFixed(1)} KB)
                                  </a>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : null}

                      {editable ? (
                        <div className="doc-actions">
                          <button type="button" className="btn btn-ghost" onClick={() => startEdit(doc)}>
                            {t("edit")}
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => setDeleteDocId(deleting ? "" : doc.id)}
                          >
                            {t("delete")}
                          </button>
                        </div>
                      ) : null}
                    </>
                  )}

                  {deleting ? (
                    <div className="inline-form inline-form--danger">
                      <div className="task-card__meta">{t("deleteDocConfirm", { title: doc.title })}</div>
                      <div className="btn-row">
                        <button type="button" className="btn btn-danger" onClick={() => deleteDoc(doc.id)}>
                          {t("confirmDelete")}
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={() => setDeleteDocId("")}>
                          {t("cancel")}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </section>

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={lightboxImages}
        plugins={[Zoom, Download]}
        zoom={{
          maxZoomPixelRatio: 3,
          scrollToZoom: true
        }}
      />
    </main>
  );
}
