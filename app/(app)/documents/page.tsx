"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useLanguage } from "../language-context";

type Role = {
  id: string;
  name: string;
};

type DocumentItem = {
  id: string;
  title: string;
  content: string;
  creator: Role;
  visibleRoles: Role[];
  attachments: Array<{
    id: string;
    filename: string;
    filepath: string;
    mimetype: string;
    size: number;
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
  }>;
  newAttachments: Array<{
    filename: string;
    filepath: string;
    mimetype: string;
    size: number;
  }>;
};

export default function DocumentsPage() {
  const { t } = useLanguage();
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
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  async function loadDocs() {
    const res = await fetch("/api/documents", { cache: "no-store" });

    if (!res.ok) {
      const text = await res.text();
      setError(`加载失败 (${res.status}): ${text}`);
      return;
    }

    const json = await res.json();
    setData(json);
  }

  useEffect(() => {
    loadDocs();
    const saved = localStorage.getItem("expandedDocIds");
    if (saved) {
      try {
        setExpandedDocIds(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const roles = useMemo(() => data?.roles ?? [], [data]);

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

function toggleDoc(docId: string) {
    setExpandedDocIds((prev) => {
      const next = prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId];
      localStorage.setItem("expandedDocIds", JSON.stringify(next));
      return next;
    });
  }

  function formatDocDate(value: string) {
    return new Date(value).toLocaleDateString("zh-CN");
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

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
    await loadDocs();
  }

  function startEdit(doc: DocumentItem) {
    setEditingDocId(doc.id);
    setDeleteDocId("");
    setExpandedDocIds((prev) => (prev.includes(doc.id) ? prev : [...prev, doc.id]));
    setEditingDraft({
      title: doc.title,
      content: doc.content,
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
                      {formatDocDate(doc.createdAt)} · {doc.creator.name}
                    </span>
                  </span>
                </span>
                <span className="docs-entry__toggle-text">{expanded ? t("collapse") : t("expand")}</span>
              </button>

              {expanded ? (
                <div className="stack-card docs-entry__body">
                  <div className="task-card__meta docs-entry__meta">
                    {t("visibleRange")}：{doc.visibleRoles.map((r) => r.name).join("、")}
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
                      <article className="markdown docs-entry__markdown" style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}>
                        <ReactMarkdown>{doc.content}</ReactMarkdown>
                      </article>

                      {doc.attachments.length > 0 ? (
                        <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--line)" }}>
                          <div className="eyebrow" style={{ marginBottom: "0.5rem" }}>附件</div>
                          {doc.attachments.map((file) => {
                            const isImage = file.mimetype.startsWith("image/");
                            const protectedUrl = `/api/files/${file.filepath.split('/').pop()}`;
                            return (
                              <div key={file.id} style={{ marginBottom: "1rem" }}>
                                {isImage ? (
                                  <div>
                                    <img
                                      src={protectedUrl}
                                      alt={file.filename}
                                      onClick={() => setViewingImage(protectedUrl)}
                                      style={{
                                        width: "100%",
                                        height: "auto",
                                        borderRadius: "8px",
                                        marginBottom: "0.5rem",
                                        cursor: "pointer"
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

      {viewingImage ? (
        <div
          className="modal-backdrop"
          onClick={() => setViewingImage(null)}
          style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <img
            src={viewingImage}
            alt="预览"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "90%", maxHeight: "90%", borderRadius: "8px" }}
          />
        </div>
      ) : null}
    </main>
  );
}
